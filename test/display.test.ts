import { describe, expect, test } from "bun:test";
import {
  clearDisplayInfoCache,
  convertPointToNative,
  getDisplayInfo,
  parseSystemProfilerDisplays,
  readPngSize,
} from "../src/computer/display.ts";

describe("display parsing and coordinate conversion", () => {
  test("parses modern macOS display profiler output with Retina scale", () => {
    const info = parseSystemProfilerDisplays({
      SPDisplaysDataType: [
        {
          spdisplays_ndrvs: [
            {
              _name: "Color LCD",
              _spdisplays_displayID: "1",
              _spdisplays_pixels: "3024 x 1964",
              _spdisplays_resolution: "1512 x 982 @ 120.00Hz",
              spdisplays_main: "spdisplays_yes",
            },
          ],
        },
      ],
    });

    expect(info).toEqual({
      id: "1",
      name: "Color LCD",
      logicalSize: { width: 1512, height: 982 },
      pixelSize: { width: 3024, height: 1964 },
      scale: 2,
    });
  });

  test("keeps native coordinates unchanged for mouse actions", () => {
    const point = convertPointToNative(
      { x: 756, y: 491 },
      {
        id: "1",
        name: "Color LCD",
        logicalSize: { width: 1512, height: 982 },
        pixelSize: { width: 3024, height: 1964 },
        scale: 2,
      },
      "native",
    );

    expect(point).toEqual({ x: 756, y: 491 });
  });

  test("still supports physical screenshot-pixel coordinates when requested", () => {
    const point = convertPointToNative(
      { x: 1512, y: 982 },
      {
        id: "1",
        name: "Color LCD",
        logicalSize: { width: 1512, height: 982 },
        pixelSize: { width: 3024, height: 1964 },
        scale: 2,
      },
      "screenshot",
    );

    expect(point).toEqual({ x: 756, y: 491 });
  });

  test("reads PNG dimensions without image dependencies", () => {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x0b, 0xd0,
      0x00, 0x00, 0x07, 0xac,
      0x08, 0x06, 0x00, 0x00, 0x00,
    ]);

    expect(readPngSize(pngHeader)).toEqual({ width: 3024, height: 1964 });
  });

  test("caches display profiler reads within the cache window", async () => {
    clearDisplayInfoCache();
    let calls = 0;
    const readProfiler = async () => {
      calls += 1;
      return JSON.stringify({
        SPDisplaysDataType: [
          {
            spdisplays_ndrvs: [
              {
                _name: "Color LCD",
                _spdisplays_displayID: "1",
                _spdisplays_pixels: "3024 x 1964",
                _spdisplays_resolution: "1512 x 982 @ 120.00Hz",
                spdisplays_main: "spdisplays_yes",
              },
            ],
          },
        ],
      });
    };

    const first = await getDisplayInfo({
      now: () => 1_000,
      readProfiler,
      cacheTtlMs: 10_000,
    });
    const second = await getDisplayInfo({
      now: () => 2_000,
      readProfiler,
      cacheTtlMs: 10_000,
    });

    expect(first).toEqual(second);
    expect(calls).toBe(1);

    await getDisplayInfo({
      now: () => 12_001,
      readProfiler,
      cacheTtlMs: 10_000,
    });
    expect(calls).toBe(2);
    clearDisplayInfoCache();
  });
});
