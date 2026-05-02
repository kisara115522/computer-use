import { execFile } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { captureScreen } from "./screen.js";
import type { Rectangle } from "../types.js";

export interface OcrWord {
  text: string;
  confidence: number;
  bounds: Rectangle;
}

export interface OcrParseOptions {
  scaleX: number;
  scaleY: number;
  minConfidence: number;
}

export interface ScreenOcrOptions {
  minConfidence?: number;
  pattern?: string;
  numericOnly?: boolean;
}

const splitTsvLine = (line: string): string[] => line.split("\t");

export const parseTesseractTsv = (
  tsv: string,
  options: OcrParseOptions,
): OcrWord[] => {
  const lines = tsv.split(/\r?\n/).filter(Boolean);
  const header = splitTsvLine(lines[0] ?? "");
  const index = (name: string): number => header.indexOf(name);

  const indexes = {
    left: index("left"),
    top: index("top"),
    width: index("width"),
    height: index("height"),
    confidence: index("conf"),
    text: index("text"),
  };

  if (Object.values(indexes).some((value) => value < 0)) return [];

  return lines.slice(1).flatMap((line): OcrWord[] => {
    const fields = splitTsvLine(line);
    const text = fields[indexes.text]?.trim();
    const confidence = Number(fields[indexes.confidence]);

    if (!text || !Number.isFinite(confidence) || confidence < options.minConfidence) {
      return [];
    }

    const left = Number(fields[indexes.left]);
    const top = Number(fields[indexes.top]);
    const width = Number(fields[indexes.width]);
    const height = Number(fields[indexes.height]);

    if ([left, top, width, height].some((value) => !Number.isFinite(value))) {
      return [];
    }

    return [
      {
        text,
        confidence,
        bounds: {
          x: Math.round(left * options.scaleX),
          y: Math.round(top * options.scaleY),
          width: Math.round(width * options.scaleX),
          height: Math.round(height * options.scaleY),
        },
      },
    ];
  });
};

const runTesseract = async (imagePath: string, numericOnly: boolean): Promise<string> => {
  const args = [
    imagePath,
    "stdout",
    "-l",
    numericOnly ? "snum" : "eng+snum",
    "--psm",
    "6",
    "tsv",
  ];

  return new Promise<string>((resolve, reject) => {
    execFile("/opt/homebrew/bin/tesseract", args, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr.trim() || err.message));
      else resolve(stdout);
    });
  });
};

export const screenOcr = async (
  options: ScreenOcrOptions = {},
): Promise<{ words: OcrWord[]; text: string }> => {
  const screenshot = await captureScreen();
  const imagePath = join(tmpdir(), `cu-ocr-${randomUUID()}.png`);
  const minConfidence = options.minConfidence ?? 35;

  await writeFile(imagePath, Buffer.from(screenshot.base64, "base64"));

  try {
    const tsv = await runTesseract(imagePath, options.numericOnly ?? false);
    let words = parseTesseractTsv(tsv, {
      scaleX: screenshot.nativeSize.width / screenshot.size.width,
      scaleY: screenshot.nativeSize.height / screenshot.size.height,
      minConfidence,
    });

    if (options.pattern) {
      const regex = new RegExp(options.pattern, "i");
      words = words.filter((word) => regex.test(word.text));
    }

    return {
      words,
      text: words.map((word) => word.text).join(" "),
    };
  } finally {
    await unlink(imagePath).catch(() => {});
  }
};
