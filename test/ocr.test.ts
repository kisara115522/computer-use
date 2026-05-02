import { describe, expect, test } from "bun:test";
import { parseTesseractTsv } from "../src/computer/ocr.ts";

describe("OCR parsing", () => {
  test("parses tesseract TSV into native-coordinate words", () => {
    const tsv = [
      "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext",
      "5\t1\t1\t1\t1\t1\t100\t200\t160\t40\t92.5\t18154513075",
      "5\t1\t1\t1\t1\t2\t300\t200\t80\t40\t12\tnoise",
      "5\t1\t1\t1\t1\t3\t400\t200\t80\t40\t95\t",
    ].join("\n");

    expect(
      parseTesseractTsv(tsv, {
        scaleX: 0.5,
        scaleY: 0.5,
        minConfidence: 30,
      }),
    ).toEqual([
      {
        text: "18154513075",
        confidence: 92.5,
        bounds: { x: 50, y: 100, width: 80, height: 20 },
      },
    ]);
  });
});
