import { execFile } from "node:child_process";
import { mkdir, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  CoordinateSpace,
  DisplayInfo,
  Rectangle,
  ScreenshotResult,
  Size,
  VisionImage,
} from "../types.js";
import { getDisplayInfo, readPngSize, withScreenshotSize } from "./display.js";

const DEFAULT_PREVIEW_MAX_DIMENSION = 448;
const RAISED_BUDGET_PREVIEW_MAX_DIMENSION = 768;
const DEFAULT_PREVIEW_QUALITY = 45;

const execFileAsync = async (
  file: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    execFile(file, args, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });

const positiveIntFromEnv = (name: string): number | undefined => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : undefined;
};

const previewMaxDimension = (): number => {
  const explicit = positiveIntFromEnv("CU_DESKTOP_VISION_MAX_DIMENSION");
  if (explicit) return explicit;

  const mcpBudget = positiveIntFromEnv("MAX_MCP_OUTPUT_TOKENS");
  return mcpBudget && mcpBudget >= 100_000
    ? RAISED_BUDGET_PREVIEW_MAX_DIMENSION
    : DEFAULT_PREVIEW_MAX_DIMENSION;
};

const previewQuality = (): number =>
  Math.min(
    100,
    Math.max(
      1,
      positiveIntFromEnv("CU_DESKTOP_VISION_JPEG_QUALITY") ?? DEFAULT_PREVIEW_QUALITY,
    ),
  );

export const fitWithin = (size: Size, maxDimension: number): Size => {
  const longest = Math.max(size.width, size.height);
  if (longest <= maxDimension) return size;

  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
};

const createVisionImage = async (
  imagePath: string,
  sourceSize: Size,
): Promise<VisionImage | undefined> => {
  const previewPath = join(tmpdir(), `cu-vision-${randomUUID()}.jpg`);
  const maxDimension = previewMaxDimension();

  try {
    await execFileAsync("/usr/bin/sips", [
      "-Z",
      String(maxDimension),
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      String(previewQuality()),
      imagePath,
      "--out",
      previewPath,
    ]);

    const buf = await readFile(previewPath);
    return {
      base64: buf.toString("base64"),
      mimeType: "image/jpeg",
      size: fitWithin(sourceSize, maxDimension),
    };
  } catch {
    return undefined;
  } finally {
    await unlink(previewPath).catch(() => {});
  }
};

/**
 * macOS screen capture using the native `screencapture` command.
 * Captures the entire main display and returns a base64-encoded PNG.
 */
export const captureScreen = async (): Promise<ScreenshotResult> => {
  const tmpFile = join(tmpdir(), `cu-${randomUUID()}.png`);

  await new Promise<void>((resolve, reject) => {
    execFile("/usr/sbin/screencapture", ["-x", tmpFile], (err, _stdout, stderr) => {
      if (err) {
        reject(
          new Error(
            `Screen capture failed: ${stderr.trim() || err.message}. Grant Screen Recording permission to the app running this MCP server.`,
          ),
        );
      } else {
        resolve();
      }
    });
  });

  const buf = await readFile(tmpFile);
  const size = readPngSize(buf);
  const display = withScreenshotSize(await getDisplayInfo(), size);
  const vision = await createVisionImage(tmpFile, size);
  await unlink(tmpFile).catch(() => {});

  return {
    base64: buf.toString("base64"),
    mimeType: "image/png",
    size,
    nativeSize: display.logicalSize,
    scale: display.scale,
    display,
    vision,
  };
};

const screenshotError = (stderr: string, fallback: string): Error =>
  new Error(
    `Screen capture failed: ${stderr.trim() || fallback}. Grant Screen Recording permission to the app running this MCP server.`,
  );

const captureToFile = async (filePath: string): Promise<Size> => {
  await execFileAsync("/usr/sbin/screencapture", ["-x", filePath]).catch((err) => {
    throw screenshotError("", err instanceof Error ? err.message : String(err));
  });

  const buf = await readFile(filePath);
  return readPngSize(buf);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const rectToScreenshotPixels = (
  rect: Rectangle,
  display: DisplayInfo,
  coordinateSpace: CoordinateSpace = "native",
): Rectangle => {
  const scaleX =
    coordinateSpace === "native"
      ? display.pixelSize.width / display.logicalSize.width
      : 1;
  const scaleY =
    coordinateSpace === "native"
      ? display.pixelSize.height / display.logicalSize.height
      : 1;

  const x = Math.round(rect.x * scaleX);
  const y = Math.round(rect.y * scaleY);
  const width = Math.round(rect.width * scaleX);
  const height = Math.round(rect.height * scaleY);

  const left = clamp(x, 0, display.pixelSize.width - 1);
  const top = clamp(y, 0, display.pixelSize.height - 1);
  const right = clamp(x + Math.max(1, width), left + 1, display.pixelSize.width);
  const bottom = clamp(y + Math.max(1, height), top + 1, display.pixelSize.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

export const captureScreenRegion = async (
  rect: Rectangle,
  coordinateSpace: CoordinateSpace = "native",
): Promise<ScreenshotResult> => {
  const fullPath = join(tmpdir(), `cu-${randomUUID()}.png`);
  const cropPath = join(tmpdir(), `cu-crop-${randomUUID()}.png`);

  try {
    const fullSize = await captureToFile(fullPath);
    const display = withScreenshotSize(await getDisplayInfo(), fullSize);
    const crop = rectToScreenshotPixels(rect, display, coordinateSpace);

    await execFileAsync("/usr/bin/sips", [
      "--cropToHeightWidth",
      String(crop.height),
      String(crop.width),
      "--cropOffset",
      String(crop.y),
      String(crop.x),
      fullPath,
      "--out",
      cropPath,
    ]);

    const buf = await readFile(cropPath);
    const size = readPngSize(buf);
    const vision = await createVisionImage(cropPath, size);

    return {
      base64: buf.toString("base64"),
      mimeType: "image/png",
      size,
      nativeSize: {
        width: Math.round(size.width / display.scale),
        height: Math.round(size.height / display.scale),
      },
      scale: display.scale,
      display,
      vision,
    };
  } finally {
    await unlink(fullPath).catch(() => {});
    await unlink(cropPath).catch(() => {});
  }
};

const safeScreenshotFilename = (filename?: string): string => {
  const fallback = `computer-use-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  const raw = basename(filename?.trim() || fallback);
  const cleaned = raw.replace(/[^A-Za-z0-9._-]/g, "-");
  return cleaned.toLowerCase().endsWith(".png") ? cleaned : `${cleaned}.png`;
};

export const saveScreenToDesktop = async (
  filename?: string,
): Promise<{ path: string; size: Size }> => {
  const desktop = join(process.env.HOME ?? tmpdir(), "Desktop");
  await mkdir(desktop, { recursive: true });
  const path = join(desktop, safeScreenshotFilename(filename));
  const size = await captureToFile(path);
  return { path, size };
};

/** Get main display size in native macOS/nut-js coordinates. */
export const getScreenSize = async (): Promise<Size> => {
  const display = await getDisplayInfo();
  return display.logicalSize;
};
