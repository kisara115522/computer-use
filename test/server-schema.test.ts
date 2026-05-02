import { describe, expect, test } from "bun:test";
import { createServer } from "../src/server.ts";

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
  });
});
