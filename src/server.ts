import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Computer } from "./computer/index.js";

export interface ServerOptions {
  name?: string;
  version?: string;
}

export const createServer = (options: ServerOptions = {}) => {
  const server = new McpServer({
    name: options.name ?? "computer-use",
    version: options.version ?? "0.1.0",
  });

  const computer = new Computer();

  // --- screenshot ---
  server.tool("screenshot", "Capture the current screen as a base64 PNG image.", {}, async () => {
    const result = await computer.screenshot();
    return {
      content: [
        { type: "image" as const, data: result.base64, mimeType: result.mimeType },
        { type: "text" as const, text: `Screen: ${result.size.width}x${result.size.height}` },
      ],
    };
  });

  // --- click ---
  server.tool(
    "click",
    "Click at a specific position on screen.",
    { x: z.number().describe("X coordinate in pixels"), y: z.number().describe("Y coordinate in pixels"), button: z.enum(["left", "right", "middle"]).optional().describe("Mouse button, default left") },
    async ({ x, y, button }) => {
      await computer.click({ x, y }, button ?? "left");
      return { content: [{ type: "text" as const, text: `Clicked (${x}, ${y}) ${button ?? "left"}` }] };
    },
  );

  // --- double_click ---
  server.tool(
    "double_click",
    "Double-click at a specific position on screen.",
    { x: z.number(), y: z.number() },
    async ({ x, y }) => {
      await computer.doubleClick({ x, y });
      return { content: [{ type: "text" as const, text: `Double-clicked (${x}, ${y})` }] };
    },
  );

  // --- mouse_move ---
  server.tool(
    "mouse_move",
    "Move the mouse cursor without clicking.",
    { x: z.number(), y: z.number() },
    async ({ x, y }) => {
      await computer.mouseMove({ x, y });
      return { content: [{ type: "text" as const, text: `Mouse moved to (${x}, ${y})` }] };
    },
  );

  // --- type ---
  server.tool(
    "type",
    "Type text as if the user is typing on the keyboard.",
    { text: z.string().describe("The text to type") },
    async ({ text }) => {
      await computer.type(text);
      return { content: [{ type: "text" as const, text: `Typed: "${text}"` }] };
    },
  );

  // --- key ---
  server.tool(
    "key",
    "Press a keyboard key, optionally with modifier keys (command, alt, shift, control).",
    {
      key: z.string().describe("Key name: enter, tab, escape, backspace, delete, space, up, down, left, right, home, end, pageup, pagedown, f1-f12"),
      modifiers: z.array(z.enum(["command", "alt", "shift", "control"])).optional().describe("Modifier keys to hold"),
    },
    async ({ key, modifiers }) => {
      await computer.pressKey(key as any, (modifiers ?? []) as any);
      const mod = modifiers?.length ? modifiers.join("+") + "+" : "";
      return { content: [{ type: "text" as const, text: `Pressed ${mod}${key}` }] };
    },
  );

  // --- scroll ---
  server.tool(
    "scroll",
    "Scroll the screen in a direction.",
    {
      direction: z.enum(["up", "down", "left", "right"]),
      amount: z.number().optional().describe("Scroll ticks, default 3"),
    },
    async ({ direction, amount }) => {
      await computer.scroll(direction, amount ?? 3);
      return { content: [{ type: "text" as const, text: `Scrolled ${direction} ${amount ?? 3} ticks` }] };
    },
  );

  // --- drag ---
  server.tool(
    "drag",
    "Drag from one position to another.",
    {
      startX: z.number(), startY: z.number(),
      endX: z.number(), endY: z.number(),
    },
    async ({ startX, startY, endX, endY }) => {
      await computer.drag({ x: startX, y: startY }, { x: endX, y: endY });
      return { content: [{ type: "text" as const, text: `Dragged (${startX},${startY}) → (${endX},${endY})` }] };
    },
  );

  // --- clipboard_read ---
  server.tool("clipboard_read", "Read the current text from the system clipboard.", {}, async () => {
    const text = await computer.clipboardRead();
    return { content: [{ type: "text" as const, text: `Clipboard: ${text}` }] };
  });

  // --- clipboard_write ---
  server.tool(
    "clipboard_write",
    "Write text to the system clipboard.",
    { text: z.string() },
    async ({ text }) => {
      await computer.clipboardWrite(text);
      return { content: [{ type: "text" as const, text: `Wrote to clipboard` }] };
    },
  );

  // --- wait ---
  server.tool(
    "wait",
    "Wait for a number of milliseconds.",
    { ms: z.number().optional().describe("Milliseconds, default 1000, max 10000") },
    async ({ ms }) => {
      const t = Math.min(ms ?? 1000, 10000);
      await new Promise((r) => setTimeout(r, t));
      return { content: [{ type: "text" as const, text: `Waited ${t}ms` }] };
    },
  );

  return server;
};
