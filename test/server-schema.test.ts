import { describe, expect, test } from "bun:test";
import { buildScreenshotToolResult, createServer } from "../src/server.ts";

type ZodLike = {
  type?: string;
  def?: Record<string, unknown>;
  shape?: Record<string, ZodLike>;
};

const collectSchemaTypes = (schema: unknown, seen = new Set<unknown>()): string[] => {
  if (!schema || typeof schema !== "object" || seen.has(schema)) return [];
  seen.add(schema);

  const zod = schema as ZodLike;
  const types = zod.type ? [zod.type] : [];
  const nested: unknown[] = [];

  if (zod.shape) nested.push(...Object.values(zod.shape));
  if (zod.def) nested.push(...Object.values(zod.def));

  return [
    ...types,
    ...nested.flatMap((value) => {
      if (Array.isArray(value)) {
        return value.flatMap((item) => collectSchemaTypes(item, seen));
      }
      return collectSchemaTypes(value, seen);
    }),
  ];
};

describe("MCP tool schemas", () => {
  test("registered input schemas avoid tuple arrays rejected by Claude Code", () => {
    const server = createServer();
    const tools = Object.entries(server._registeredTools ?? {});
    const tupleTools = tools
      .filter(([, tool]) => collectSchemaTypes(tool.inputSchema).includes("tuple"))
      .map(([name]) => name);

    expect(tupleTools).toEqual([]);
  });

  test("registers a desktop screenshot saving tool so agents do not need Bash", () => {
    const server = createServer();

    expect(Object.keys(server._registeredTools ?? {})).toContain(
      "save_screenshot",
    );
  });

  test("registers state tools for verification after desktop actions", () => {
    const server = createServer();
    const tools = Object.keys(server._registeredTools ?? {});

    expect(tools).toContain("frontmost_app");
    expect(tools).toContain("browser_state");
    expect(tools).toContain("screen_ocr");
  });

  test("visual tools return image content instead of structured-only output", () => {
    const server = createServer();
    const tools = server._registeredTools ?? {};

    expect(tools.observe.outputSchema).toBeUndefined();
    expect(tools.screenshot.outputSchema).toBeUndefined();
    expect(Object.keys(tools)).toContain("screenshot_region");
  });

  test("screenshot tool result prioritizes the vision-sized image", () => {
    const result = buildScreenshotToolResult(
      {
        base64: "full-png",
        mimeType: "image/png",
        size: { width: 3024, height: 1964 },
        nativeSize: { width: 1512, height: 982 },
        scale: 2,
        display: {
          id: "1",
          name: "Color LCD",
          logicalSize: { width: 1512, height: 982 },
          pixelSize: { width: 3024, height: 1964 },
          scale: 2,
        },
        vision: {
          base64: "small-jpeg",
          mimeType: "image/jpeg",
          size: { width: 768, height: 498 },
        },
      },
      "Screenshot",
    );

    expect(result.structuredContent).toBeUndefined();
    expect(result.content[0]).toEqual({
      type: "image",
      data: "small-jpeg",
      mimeType: "image/jpeg",
      annotations: { audience: ["assistant"], priority: 1 },
    });
    expect(result.content[1]?.type).toBe("text");
    expect(result.content[1]?.text).toContain("vision image is 768x498 image/jpeg");
  });
});
