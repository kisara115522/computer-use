import { execFile } from "node:child_process";
import { mkdir, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ScreenshotResult, Size } from "../types.js";
import { getDisplayInfo, readPngSize, withScreenshotSize } from "./display.js";

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
  await unlink(tmpFile).catch(() => {});

  const size = readPngSize(buf);
  const display = withScreenshotSize(await getDisplayInfo(), size);

  return {
    base64: buf.toString("base64"),
    mimeType: "image/png",
    size,
    nativeSize: display.logicalSize,
    scale: display.scale,
    display,
  };
};

const screenshotError = (stderr: string, fallback: string): Error =>
  new Error(
    `Screen capture failed: ${stderr.trim() || fallback}. Grant Screen Recording permission to the app running this MCP server.`,
  );

const captureToFile = async (filePath: string): Promise<Size> => {
  await new Promise<void>((resolve, reject) => {
    execFile("/usr/sbin/screencapture", ["-x", filePath], (err, _stdout, stderr) => {
      if (err) reject(screenshotError(stderr, err.message));
      else resolve();
    });
  });

  const buf = await readFile(filePath);
  return readPngSize(buf);
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
