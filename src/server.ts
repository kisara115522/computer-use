import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Computer } from "./computer/index.js";
import type { CoordinateSpace, MouseButton, Point, ScrollDirection } from "./types.js";

export interface ServerOptions {
  name?: string;
  version?: string;
}

const coordinateSpaceSchema = z
  .enum(["screenshot", "native"])
  .optional()
  .describe(
    "Coordinate space for x/y. Default 'native' means macOS logical coordinates shown as nativeWidth/nativeHeight by observe/screenshot. Use 'screenshot' only for full Retina PNG pixels.",
  );

const actionOutputSchema = {
  ok: z.boolean(),
  message: z.string(),
  data: z.unknown().optional(),
};

const ok = (message: string, data?: unknown) => ({
  content: [{ type: "text" as const, text: message }],
  structuredContent: { ok: true, message, data },
});

const point = (x: number, y: number): Point => ({ x, y });

const ticksFromDelta = (delta: number): number =>
  Math.max(1, Math.round(Math.abs(delta) / 100));

const screenshotPayload = async (computer: Computer, label: string) => {
  const result = await computer.screenshot();
  const data = {
    width: result.size.width,
    height: result.size.height,
    nativeWidth: result.nativeSize.width,
    nativeHeight: result.nativeSize.height,
    scale: result.scale,
    coordinateSpace: "native",
    display: result.display,
    mimeType: result.mimeType,
  };

  return {
    content: [
      { type: "image" as const, data: result.base64, mimeType: result.mimeType },
      {
        type: "text" as const,
        text: `${label}: use native coordinates 0-${result.nativeSize.width} x 0-${result.nativeSize.height} for click/move/drag. PNG is ${result.size.width}x${result.size.height}, Retina scale ${result.scale}. Verify with observe/frontmost_app/browser_state before claiming success.`,
      },
    ],
    structuredContent: {
      ok: true,
      message: label,
      data,
    },
  };
};

const dragPathFromArgs = (args: {
  path?: Point[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}): { start: Point; end: Point; path: Point[] } => {
  if (args.path && args.path.length >= 2) {
    return {
      start: args.path[0],
      end: args.path[args.path.length - 1],
      path: args.path,
    };
  }

  if (
    args.startX !== undefined &&
    args.startY !== undefined &&
    args.endX !== undefined &&
    args.endY !== undefined
  ) {
    const start = point(args.startX, args.startY);
    const end = point(args.endX, args.endY);
    return { start, end, path: [start, end] };
  }

  throw new Error("Drag needs either path with at least two points or startX/startY/endX/endY.");
};

export const createServer = (options: ServerOptions = {}) => {
  const server = new McpServer({
    name: options.name ?? "computer-use",
    version: options.version ?? "0.1.0",
  });

  const computer = new Computer();

  server.registerTool(
    "observe",
    {
      title: "Observe Screen",
      description:
        "Capture the current screen and return an image plus coordinate metadata. Use this after each desktop action before deciding the next step.",
      inputSchema: {},
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => screenshotPayload(computer, "Observed screen"),
  );

  server.registerTool(
    "screenshot",
    {
      title: "Screenshot",
      description:
        "Capture the current screen as a PNG image. Mouse tools default to native macOS coordinates, not Retina PNG pixels.",
      inputSchema: {},
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => screenshotPayload(computer, "Screenshot"),
  );

  server.registerTool(
    "save_screenshot",
    {
      title: "Save Screenshot",
      description:
        "Capture the current screen and save it directly to the user's Desktop as a PNG file. Use this instead of Bash for 'take a screenshot and put it on the desktop'.",
      inputSchema: {
        filename: z
          .string()
          .optional()
          .describe("Optional PNG filename. Path separators are ignored; defaults to a timestamped filename."),
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ filename }) => {
      const result = await computer.saveScreenshot(filename);
      return ok(`Saved screenshot to ${result.path}`, result);
    },
  );

  server.registerTool(
    "screen_info",
    {
      title: "Screen Info",
      description: "Return display size, coordinate scale, and macOS permission diagnostics.",
      inputSchema: {},
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const [display, permissions] = await Promise.all([
        computer.displayInfo(),
        Promise.resolve(computer.permissions()),
      ]);
      return ok("Screen diagnostics", { display, permissions });
    },
  );

  server.registerTool(
    "diagnostics",
    {
      title: "Diagnostics",
      description:
        "Return macOS permission diagnostics for screen capture, mouse, keyboard, and input monitoring.",
      inputSchema: {},
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => ok("Permission diagnostics", computer.permissions()),
  );

  server.registerTool(
    "request_permissions",
    {
      title: "Open Permission Settings",
      description:
        "Open the relevant macOS Privacy & Security settings pane so the user can grant this MCP server permissions.",
      inputSchema: {
        pane: z
          .enum(["accessibility", "screen", "input-monitoring"])
          .optional()
          .describe("Permission pane to open. Defaults to accessibility."),
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ pane }) => {
      await computer.openPermissionSettings(pane ?? "accessibility");
      return ok(`Opened ${pane ?? "accessibility"} permission settings`);
    },
  );

  server.registerTool(
    "click",
    {
      title: "Click",
      description:
        "Move the mouse to x/y and click. x/y default to native macOS coordinates from observe/screenshot nativeWidth/nativeHeight.",
      inputSchema: {
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
        button: z.enum(["left", "right", "middle"]).optional().describe("Mouse button, default left"),
        coordinate_space: coordinateSpaceSchema,
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ x, y, button, coordinate_space }) => {
      await computer.click(
        point(x, y),
        (button ?? "left") as MouseButton,
        (coordinate_space ?? "native") as CoordinateSpace,
      );
      return ok(`Clicked ${button ?? "left"} at (${x}, ${y})`, {
        x,
        y,
        button: button ?? "left",
        coordinateSpace: coordinate_space ?? "native",
      });
    },
  );

  server.registerTool(
    "double_click",
    {
      title: "Double Click",
      description:
        "Move the mouse to x/y and double-click. x/y default to native macOS coordinates from observe/screenshot nativeWidth/nativeHeight.",
      inputSchema: {
        x: z.number(),
        y: z.number(),
        coordinate_space: coordinateSpaceSchema,
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ x, y, coordinate_space }) => {
      await computer.doubleClick(point(x, y), (coordinate_space ?? "native") as CoordinateSpace);
      return ok(`Double-clicked at (${x}, ${y})`, {
        x,
        y,
        coordinateSpace: coordinate_space ?? "native",
      });
    },
  );

  const registerMoveTool = (name: "move" | "mouse_move") => {
    server.registerTool(
      name,
      {
        title: name === "move" ? "Move Mouse" : "Move Mouse (compat)",
        description:
          "Move the mouse cursor without clicking. x/y default to native macOS coordinates from observe/screenshot nativeWidth/nativeHeight.",
        inputSchema: {
          x: z.number(),
          y: z.number(),
          coordinate_space: coordinateSpaceSchema,
        },
        outputSchema: actionOutputSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      async ({ x, y, coordinate_space }) => {
        await computer.mouseMove(point(x, y), (coordinate_space ?? "native") as CoordinateSpace);
        return ok(`Mouse moved to (${x}, ${y})`, {
          x,
          y,
          coordinateSpace: coordinate_space ?? "native",
        });
      },
    );
  };

  registerMoveTool("move");
  registerMoveTool("mouse_move");

  server.registerTool(
    "drag",
    {
      title: "Drag",
      description:
        "Drag along a path of native-coordinate points, or use legacy startX/startY/endX/endY.",
      inputSchema: {
        path: z
          .array(
            z.object({
              x: z.number().describe("X coordinate"),
              y: z.number().describe("Y coordinate"),
            }),
          )
          .min(2)
          .optional()
          .describe("Agent-style drag path as [{x,y}, {x,y}, ...]."),
        startX: z.number().optional().describe("Legacy start X"),
        startY: z.number().optional().describe("Legacy start Y"),
        endX: z.number().optional().describe("Legacy end X"),
        endY: z.number().optional().describe("Legacy end Y"),
        coordinate_space: coordinateSpaceSchema,
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      const { start, end, path } = dragPathFromArgs(args);
      await computer.drag(
        start,
        end,
        (args.coordinate_space ?? "native") as CoordinateSpace,
        path,
      );
      return ok(`Dragged from (${start.x}, ${start.y}) to (${end.x}, ${end.y})`, {
        path,
        coordinateSpace: args.coordinate_space ?? "native",
      });
    },
  );

  server.registerTool(
    "scroll",
    {
      title: "Scroll",
      description:
        "Scroll the current UI. Supports legacy direction/amount or agent-style scrollX/scrollY deltas. Optional x/y moves before scrolling.",
      inputSchema: {
        direction: z.enum(["up", "down", "left", "right"]).optional(),
        amount: z.number().optional().describe("Legacy scroll ticks, default 3"),
        x: z.number().optional().describe("Optional X coordinate to move to before scrolling"),
        y: z.number().optional().describe("Optional Y coordinate to move to before scrolling"),
        scrollX: z.number().optional().describe("Agent-style horizontal scroll delta; positive scrolls right"),
        scrollY: z.number().optional().describe("Agent-style vertical scroll delta; positive scrolls down"),
        coordinate_space: coordinateSpaceSchema,
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ direction, amount, x, y, scrollX, scrollY, coordinate_space }) => {
      const coordinateSpace = (coordinate_space ?? "native") as CoordinateSpace;
      if (x !== undefined && y !== undefined) {
        await computer.mouseMove(point(x, y), coordinateSpace);
      }

      if (direction) {
        await computer.scroll(direction as ScrollDirection, amount ?? 3);
      } else {
        if (scrollY && scrollY !== 0) {
          await computer.scroll(scrollY > 0 ? "down" : "up", ticksFromDelta(scrollY));
        }
        if (scrollX && scrollX !== 0) {
          await computer.scroll(scrollX > 0 ? "right" : "left", ticksFromDelta(scrollX));
        }
      }

      return ok("Scrolled", {
        direction,
        amount,
        scrollX,
        scrollY,
        x,
        y,
        coordinateSpace,
      });
    },
  );

  server.registerTool(
    "keypress",
    {
      title: "Key Press",
      description:
        "Press a key or chord. Examples: ['ENTER'], ['command','l'], ['cmd+shift+4'].",
      inputSchema: {
        keys: z.array(z.string()).min(1).describe("Key chord tokens"),
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ keys }) => {
      await computer.keypress(keys);
      return ok(`Pressed ${keys.join("+")}`, { keys });
    },
  );

  const legacyKeyInputSchema = {
    key: z
      .string()
      .describe("Key name or chord. Examples: enter, a, 1, command+l."),
    modifiers: z
      .array(z.enum(["command", "alt", "shift", "control"]))
      .optional()
      .describe("Legacy modifier keys to hold"),
  };

  const registerLegacyKeyTool = (name: "key" | "press_key") => {
    server.registerTool(
      name,
      {
        title: name === "key" ? "Key (compat)" : "Press Key",
        description: "Press a keyboard key, optionally with modifiers.",
        inputSchema: legacyKeyInputSchema,
        outputSchema: actionOutputSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      async ({ key, modifiers }) => {
        if (modifiers?.length) await computer.pressKey(key, modifiers);
        else await computer.keypress([key]);
        const label = modifiers?.length ? `${modifiers.join("+")}+${key}` : key;
        return ok(`Pressed ${label}`, { key, modifiers: modifiers ?? [] });
      },
    );
  };

  registerLegacyKeyTool("key");
  registerLegacyKeyTool("press_key");

  const typeInputSchema = {
    text: z.string().describe("Text to enter into the focused UI element"),
    method: z
      .enum(["auto", "typing", "paste"])
      .optional()
      .describe("auto uses paste for unicode/newline text and typing for simple ASCII."),
  };

  const registerTypeTool = (name: "type_text" | "type") => {
    server.registerTool(
      name,
      {
        title: name === "type_text" ? "Type Text" : "Type Text (compat)",
        description: "Enter text into the focused UI element.",
        inputSchema: typeInputSchema,
        outputSchema: actionOutputSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      async ({ text, method }) => {
        await computer.type(text, method ?? "auto");
        return ok(`Typed ${text.length} characters`, { length: text.length, method: method ?? "auto" });
      },
    );
  };

  registerTypeTool("type_text");
  registerTypeTool("type");

  server.registerTool(
    "cursor_position",
    {
      title: "Cursor Position",
      description: "Return the current mouse cursor position in native macOS coordinates.",
      inputSchema: {},
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => ok("Cursor position", await computer.cursorPosition()),
  );

  server.registerTool(
    "frontmost_app",
    {
      title: "Frontmost App",
      description:
        "Return the currently focused macOS application. Use this to verify that desktop actions are affecting the intended app.",
      inputSchema: {},
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => ok("Frontmost app", { app: await computer.frontmostApp() }),
  );

  server.registerTool(
    "browser_state",
    {
      title: "Browser State",
      description:
        "Return the active Chrome or Safari tab title and URL. Use this after navigation or login attempts; do not claim web success without checking it.",
      inputSchema: {
        app: z
          .enum(["Google Chrome", "Safari"])
          .optional()
          .describe("Browser to inspect. Defaults to the frontmost browser when possible."),
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ app }) => ok("Browser state", await computer.browserState(app)),
  );

  server.registerTool(
    "open_url",
    {
      title: "Open URL",
      description:
        "Open a URL using macOS Launch Services. This is more reliable than simulating Spotlight and typing a URL.",
      inputSchema: {
        url: z.string().url().describe("URL to open"),
        app: z.string().optional().describe("Optional browser/app name, e.g. Safari or Google Chrome"),
        waitMs: z.number().optional().describe("Milliseconds to wait after opening, default 800"),
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ url, app, waitMs }) => {
      await computer.openUrl(url, { app, waitMs });
      return ok(`Opened URL ${url}`, { url, app, waitMs: waitMs ?? 800 });
    },
  );

  server.registerTool(
    "open_app",
    {
      title: "Open App",
      description: "Open a macOS app by display name, e.g. Safari, Finder, Notes, Terminal.",
      inputSchema: {
        name: z.string().describe("Application display name"),
        waitMs: z.number().optional().describe("Milliseconds to wait after opening, default 800"),
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ name, waitMs }) => {
      await computer.openApp(name, { waitMs });
      return ok(`Opened app ${name}`, { name, waitMs: waitMs ?? 800 });
    },
  );

  server.registerTool(
    "list_apps",
    {
      title: "List Apps",
      description: "List installed macOS apps visible in common Applications folders.",
      inputSchema: {},
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const apps = await computer.listApps();
      return ok(`Found ${apps.length} apps`, { apps });
    },
  );

  server.registerTool(
    "clipboard_read",
    {
      title: "Read Clipboard",
      description: "Read text from the macOS clipboard.",
      inputSchema: {},
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      const text = await computer.clipboardRead();
      return ok("Clipboard text", { text });
    },
  );

  server.registerTool(
    "clipboard_write",
    {
      title: "Write Clipboard",
      description: "Write text to the macOS clipboard.",
      inputSchema: { text: z.string() },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ text }) => {
      await computer.clipboardWrite(text);
      return ok("Wrote clipboard text", { length: text.length });
    },
  );

  server.registerTool(
    "wait",
    {
      title: "Wait",
      description: "Wait for a short period before observing again.",
      inputSchema: {
        ms: z.number().optional().describe("Milliseconds, default 1000, max 30000"),
      },
      outputSchema: actionOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ ms }) => {
      const t = Math.min(Math.max(ms ?? 1000, 0), 30000);
      await new Promise((resolve) => setTimeout(resolve, t));
      return ok(`Waited ${t}ms`, { ms: t });
    },
  );

  return server;
};
