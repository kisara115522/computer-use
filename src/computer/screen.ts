import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ScreenshotResult, Size } from "../types.js";

/**
 * macOS screen capture using the native `screencapture` command.
 * Captures the entire main display and returns a base64-encoded PNG.
 */
export const captureScreen = async (): Promise<ScreenshotResult> => {
  const tmpFile = join(tmpdir(), `cu-${randomUUID()}.png`);

  await new Promise<void>((resolve, reject) => {
    execFile("/usr/sbin/screencapture", ["-x", "-C", tmpFile], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const buf = await readFile(tmpFile);
  await unlink(tmpFile).catch(() => {});

  const size = await getScreenSize();

  return {
    base64: buf.toString("base64"),
    mimeType: "image/png",
    size,
  };
};

/** Get main display resolution via system_profiler */
export const getScreenSize = async (): Promise<Size> => {
  const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
    execFile(
      "/usr/sbin/system_profiler",
      ["SPDisplaysDataType", "-json"],
      (err, stdout) => {
        if (err) reject(err);
        else resolve({ stdout });
      },
    );
  });

  const data = JSON.parse(stdout) as {
    SPDisplaysDataType?: Array<{
      sppci_displays?: Array<{
        _spdisplays_resolution?: string;
      }>;
    }>;
  };

  const display = data.SPDisplaysDataType?.[0]?.sppci_displays?.[0];
  if (!display?._spdisplays_resolution) {
    return { width: 1920, height: 1080 };
  }

  // Format: "1920 x 1080"
  const match = display._spdisplays_resolution.match(/(\d+)\s*x\s*(\d+)/);
  if (!match) return { width: 1920, height: 1080 };

  return { width: Number(match[1]), height: Number(match[2]) };
};
