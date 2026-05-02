import { describe, expect, test } from "bun:test";
import { fitWithin, rectToScreenshotPixels } from "../src/computer/screen.ts";

describe("vision screenshot sizing", () => {
  test("fits Retina screenshots into a small vision preview", () => {
    expect(fitWithin({ width: 3024, height: 1964 }, 448)).toEqual({
      width: 448,
      height: 291,
    });
  });

  test("converts native crop rectangles to screenshot pixels", () => {
    const rect = rectToScreenshotPixels(
      { x: 100, y: 50, width: 300, height: 200 },
      {
        id: "1",
        name: "Color LCD",
        logicalSize: { width: 1512, height: 982 },
        pixelSize: { width: 3024, height: 1964 },
        scale: 2,
      },
      "native",
    );

    expect(rect).toEqual({ x: 200, y: 100, width: 600, height: 400 });
  });
});
