/** 2D coordinate on screen */
export interface Point {
  x: number;
  y: number;
}

/** Screen dimensions */
export interface Size {
  width: number;
  height: number;
}

/** Rectangle defined by origin + size */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Screenshot result */
export interface ScreenshotResult {
  base64: string;
  mimeType: "image/png";
  size: Size;
}

/** Mouse button */
export type MouseButton = "left" | "right" | "middle";

/** Modifier keys */
export type Modifier = "command" | "alt" | "shift" | "control";

/** Named keys */
export type KeyName =
  | "enter"
  | "tab"
  | "escape"
  | "backspace"
  | "delete"
  | "space"
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "pageup"
  | "pagedown"
  | "f1" | "f2" | "f3" | "f4" | "f5" | "f6"
  | "f7" | "f8" | "f9" | "f10" | "f11" | "f12";

/** Scroll direction */
export type ScrollDirection = "up" | "down" | "left" | "right";

/** MCP tool action returned by the LLM */
export type AgentAction =
  | { type: "screenshot" }
  | { type: "click"; x: number; y: number; button?: MouseButton }
  | { type: "double_click"; x: number; y: number }
  | { type: "type"; text: string }
  | { type: "key"; key: KeyName; modifiers?: Modifier[] }
  | { type: "scroll"; direction: ScrollDirection; amount: number }
  | { type: "drag"; start: Point; end: Point }
  | { type: "clipboard_read" }
  | { type: "clipboard_write"; text: string }
  | { type: "mouse_move"; x: number; y: number }
  | { type: "wait"; ms: number };
