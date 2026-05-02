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

/** Display metadata used to translate screenshots into mouse coordinates */
export interface DisplayInfo {
  id: string;
  name: string;
  logicalSize: Size;
  pixelSize: Size;
  scale: number;
}

/** Coordinate space accepted by mouse tools */
export type CoordinateSpace = "screenshot" | "native";

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
  /** PNG dimensions in screenshot pixels */
  size: Size;
  /** Native macOS/nut-js coordinate space */
  nativeSize: Size;
  scale: number;
  display: DisplayInfo;
}

/** Mouse button */
export type MouseButton = "left" | "right" | "middle";

/** Modifier keys */
export type Modifier = "command" | "alt" | "shift" | "control";

/** Named key or agent-friendly key token */
export type KeyName = string;

/** Scroll direction */
export type ScrollDirection = "up" | "down" | "left" | "right";

/** MCP tool action returned by the LLM */
export type AgentAction =
  | { type: "screenshot" }
  | { type: "observe" }
  | { type: "click"; x: number; y: number; button?: MouseButton; coordinate_space?: CoordinateSpace }
  | { type: "double_click"; x: number; y: number; coordinate_space?: CoordinateSpace }
  | { type: "type"; text: string }
  | { type: "type_text"; text: string }
  | { type: "key"; key: string; modifiers?: Modifier[] }
  | { type: "keypress"; keys: string[] }
  | { type: "scroll"; direction?: ScrollDirection; amount?: number; scrollX?: number; scrollY?: number; x?: number; y?: number; coordinate_space?: CoordinateSpace }
  | { type: "drag"; start?: Point; end?: Point; path?: Point[]; coordinate_space?: CoordinateSpace }
  | { type: "clipboard_read" }
  | { type: "clipboard_write"; text: string }
  | { type: "mouse_move"; x: number; y: number; coordinate_space?: CoordinateSpace }
  | { type: "move"; x: number; y: number; coordinate_space?: CoordinateSpace }
  | { type: "open_url"; url: string; app?: string }
  | { type: "open_app"; name: string }
  | { type: "wait"; ms: number };
