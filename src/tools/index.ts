import type { Computer } from "../computer/index.js";
import { screenshotTool } from "./screenshot.js";
import { clickTool } from "./click.js";
import { doubleClickTool } from "./double-click.js";
import { typeTool } from "./type.js";
import { keyTool } from "./key.js";
import { scrollTool } from "./scroll.js";
import { dragTool } from "./drag.js";
import { mouseMoveTool } from "./mouse-move.js";
import { clipboardReadTool, clipboardWriteTool } from "./clipboard.js";
import { waitTool } from "./wait.js";

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    input: Record<string, unknown>,
    computer: Computer,
  ) => Promise<{
    content: Array<
      | { type: "text"; text: string }
      | { type: "image"; data: string; mimeType: string }
    >;
  }>;
}

/** All available computer-use tools */
export const allTools: Tool[] = [
  screenshotTool,
  clickTool,
  doubleClickTool,
  typeTool,
  keyTool,
  scrollTool,
  dragTool,
  mouseMoveTool,
  clipboardReadTool,
  clipboardWriteTool,
  waitTool,
] as Tool[];
