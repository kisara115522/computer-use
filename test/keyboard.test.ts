import { describe, expect, test } from "bun:test";
import { Key } from "@nut-tree-fork/nut-js";
import { parseKeyChord, resolveKeyName } from "../src/computer/keyboard.ts";

describe("keyboard key parsing", () => {
  test("resolves named keys, letters, and digits", () => {
    expect(resolveKeyName("enter")).toBe(Key.Enter);
    expect(resolveKeyName("return")).toBe(Key.Enter);
    expect(resolveKeyName("a")).toBe(Key.A);
    expect(resolveKeyName("L")).toBe(Key.L);
    expect(resolveKeyName("1")).toBe(Key.Num1);
    expect(resolveKeyName("page_down")).toBe(Key.PageDown);
  });

  test("parses agent-friendly key chords", () => {
    expect(parseKeyChord("command+l")).toEqual({
      key: Key.L,
      modifiers: [Key.LeftSuper],
    });
    expect(parseKeyChord("cmd+shift+4")).toEqual({
      key: Key.Num4,
      modifiers: [Key.LeftSuper, Key.LeftShift],
    });
  });

  test("rejects unsupported key names", () => {
    expect(() => resolveKeyName("definitely-not-a-key")).toThrow(
      "Unsupported key",
    );
  });
});
