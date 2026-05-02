import * as screen from "./screen.js";
import * as mouse from "./mouse.js";
import * as keyboard from "./keyboard.js";
import * as clipboard from "./clipboard.js";
import type { Point, MouseButton, Modifier, KeyName, ScrollDirection, ScreenshotResult, Size } from "../types.js";

/**
 * Unified computer control interface.
 * Wraps screen capture, mouse, keyboard, and clipboard into a single API
 * for use by MCP tools and agent executors.
 */
export class Computer {
  /** Capture the current screen as base64 PNG */
  async screenshot(): Promise<ScreenshotResult> {
    return screen.captureScreen();
  }

  /** Get main display resolution */
  async screenSize(): Promise<Size> {
    return screen.getScreenSize();
  }

  /** Move cursor to position */
  async mouseMove(p: Point): Promise<void> {
    return mouse.move(p);
  }

  /** Click at position */
  async click(p: Point, button: MouseButton = "left"): Promise<void> {
    return mouse.click(p, button);
  }

  /** Double-click at position */
  async doubleClick(p: Point): Promise<void> {
    return mouse.doubleClick(p);
  }

  /** Drag from start to end */
  async drag(start: Point, end: Point): Promise<void> {
    return mouse.drag(start, end);
  }

  /** Scroll in direction */
  async scroll(direction: ScrollDirection, amount: number): Promise<void> {
    return mouse.scroll(direction, amount);
  }

  /** Type text string */
  async type(text: string): Promise<void> {
    return keyboard.type(text);
  }

  /** Press a key with optional modifiers */
  async pressKey(key: KeyName, modifiers: Modifier[] = []): Promise<void> {
    return keyboard.press(key, modifiers);
  }

  /** Hotkey combination */
  async hotkey(modifiers: Modifier[], key: KeyName): Promise<void> {
    return keyboard.hotkey(modifiers, key);
  }

  /** Read clipboard */
  async clipboardRead(): Promise<string> {
    return clipboard.read();
  }

  /** Write clipboard */
  async clipboardWrite(text: string): Promise<void> {
    return clipboard.write(text);
  }
}
