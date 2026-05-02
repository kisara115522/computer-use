import { execFile } from "node:child_process";
import type { CoordinateSpace, DisplayInfo, Point, Size } from "../types.js";

const FALLBACK_DISPLAY: DisplayInfo = {
  id: "main",
  name: "Main Display",
  logicalSize: { width: 1920, height: 1080 },
  pixelSize: { width: 1920, height: 1080 },
  scale: 1,
};

const DEFAULT_DISPLAY_CACHE_TTL_MS = 10_000;

type DisplayInfoOptions = {
  now?: () => number;
  readProfiler?: () => Promise<string>;
  cacheTtlMs?: number;
};

let cachedDisplay:
  | {
      value: DisplayInfo;
      expiresAt: number;
    }
  | undefined;
let pendingDisplay: Promise<DisplayInfo> | undefined;

export const clearDisplayInfoCache = (): void => {
  cachedDisplay = undefined;
  pendingDisplay = undefined;
};

const readSystemProfilerDisplays = async (): Promise<string> => {
  const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
    execFile(
      "/usr/sbin/system_profiler",
      ["SPDisplaysDataType", "-json"],
      (err, stdout) => {
        if (err) reject(err);
        else resolve({ stdout });
      },
    );
  }).catch(() => ({ stdout: "" }));

  return stdout;
};

const parseSize = (value: unknown): Size | undefined => {
  if (typeof value !== "string") return undefined;
  const match = value.match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return undefined;
  return { width: Number(match[1]), height: Number(match[2]) };
};

const collectDisplays = (data: unknown): Array<Record<string, unknown>> => {
  const root = data as {
    SPDisplaysDataType?: Array<Record<string, unknown>>;
  };

  return (root.SPDisplaysDataType ?? []).flatMap((gpu) => {
    const modern = gpu.spdisplays_ndrvs;
    const legacy = gpu.sppci_displays;
    const displays = Array.isArray(modern) ? modern : legacy;
    return Array.isArray(displays) ? displays : [];
  }) as Array<Record<string, unknown>>;
};

export const parseSystemProfilerDisplays = (data: unknown): DisplayInfo => {
  const displays = collectDisplays(data);
  const display =
    displays.find((candidate) => candidate.spdisplays_main === "spdisplays_yes") ??
    displays[0];

  if (!display) return FALLBACK_DISPLAY;

  const logicalSize =
    parseSize(display._spdisplays_resolution) ??
    parseSize(display._spdisplays_pixels) ??
    FALLBACK_DISPLAY.logicalSize;
  const pixelSize =
    parseSize(display._spdisplays_pixels) ??
    parseSize(display._spdisplays_resolution) ??
    logicalSize;
  const scale =
    logicalSize.width > 0
      ? Number((pixelSize.width / logicalSize.width).toFixed(2))
      : 1;

  return {
    id: String(display._spdisplays_displayID ?? "main"),
    name: String(display._name ?? "Main Display"),
    logicalSize,
    pixelSize,
    scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
  };
};

export const getDisplayInfo = async (
  options: DisplayInfoOptions = {},
): Promise<DisplayInfo> => {
  const now = (options.now ?? Date.now)();
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_DISPLAY_CACHE_TTL_MS;
  if (cachedDisplay && cachedDisplay.expiresAt > now) {
    return cachedDisplay.value;
  }

  if (pendingDisplay) {
    return pendingDisplay;
  }

  pendingDisplay = (async () => {
    try {
      const stdout = await (options.readProfiler ?? readSystemProfilerDisplays)().catch(
        () => "",
      );
      const value = stdout
        ? (() => {
            try {
              return parseSystemProfilerDisplays(JSON.parse(stdout));
            } catch {
              return FALLBACK_DISPLAY;
            }
          })()
        : FALLBACK_DISPLAY;

      cachedDisplay = {
        value,
        expiresAt: now + cacheTtlMs,
      };
      return value;
    } finally {
      pendingDisplay = undefined;
    }
  })();

  return pendingDisplay;
};

export const readPngSize = (buffer: Buffer): Size => {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a" || buffer.length < 24) {
    throw new Error("Invalid PNG data: missing PNG signature or IHDR");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

export const withScreenshotSize = (
  display: DisplayInfo,
  pixelSize: Size,
): DisplayInfo => {
  const scale =
    display.logicalSize.width > 0
      ? Number((pixelSize.width / display.logicalSize.width).toFixed(2))
      : display.scale;

  return {
    ...display,
    pixelSize,
    scale: Number.isFinite(scale) && scale > 0 ? scale : display.scale,
  };
};

export const convertPointToNative = (
  point: Point,
  display: DisplayInfo,
  coordinateSpace: CoordinateSpace = "native",
): Point => {
  if (coordinateSpace === "native") {
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }

  const scaleX = display.logicalSize.width / display.pixelSize.width;
  const scaleY = display.logicalSize.height / display.pixelSize.height;

  return {
    x: Math.round(point.x * scaleX),
    y: Math.round(point.y * scaleY),
  };
};

export const clampToDisplay = (point: Point, display: DisplayInfo): Point => ({
  x: Math.max(0, Math.min(display.logicalSize.width - 1, point.x)),
  y: Math.max(0, Math.min(display.logicalSize.height - 1, point.y)),
});
