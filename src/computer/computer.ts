import * as screen from "./screen.js";
import * as mouse from "./mouse.js";
import * as keyboard from "./keyboard.js";
import * as clipboard from "./clipboard.js";
import * as app from "./app.js";
import * as windowState from "./window.js";
import * as ocr from "./ocr.js";
import { getDisplayInfo } from "./display.js";
import { getPermissionReport, openPermissionSettings } from "./permissions.js";
import type {
  CoordinateSpace,
  DisplayInfo,
  Rectangle,
  Point,
  MouseButton,
  Modifier,
  KeyName,
  ScrollDirection,
  ScreenshotResult,
  Size,
} from "../types.js";
import type { TypeMethod } from "./keyboard.js";
import type { BrowserState } from "./window.js";
import type { ScreenOcrOptions } from "./ocr.js";

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

  /** Capture a cropped screen region as base64 PNG plus a vision-sized preview */
  async screenshotRegion(
    rect: Rectangle,
    coordinateSpace: CoordinateSpace = "native",
  ): Promise<ScreenshotResult> {
    return screen.captureScreenRegion(rect, coordinateSpace);
  }

  /** Save current screen to Desktop as PNG */
  async saveScreenshot(filename?: string): Promise<{ path: string; size: Size }> {
    return screen.saveScreenToDesktop(filename);
  }

  /** Get main display resolution */
  async screenSize(): Promise<Size> {
    return screen.getScreenSize();
  }

  /** Get main display metadata */
  async displayInfo(): Promise<DisplayInfo> {
    return getDisplayInfo();
  }

  /** Get macOS permission diagnostics */
  permissions() {
    return getPermissionReport();
  }

  /** Open macOS privacy settings to a relevant permission pane */
  async openPermissionSettings(
    pane: "accessibility" | "screen" | "input-monitoring" = "accessibility",
  ): Promise<void> {
    return openPermissionSettings(pane);
  }

  /** Move cursor to position */
  async mouseMove(
    p: Point,
    coordinateSpace: CoordinateSpace = "native",
  ): Promise<void> {
    return mouse.move(p, coordinateSpace);
  }

  /** Click at position */
  async click(
    p: Point,
    button: MouseButton = "left",
    coordinateSpace: CoordinateSpace = "native",
  ): Promise<void> {
    return mouse.click(p, button, coordinateSpace);
  }

  /** Double-click at position */
  async doubleClick(
    p: Point,
    coordinateSpace: CoordinateSpace = "native",
  ): Promise<void> {
    return mouse.doubleClick(p, coordinateSpace);
  }

  /** Drag from start to end */
  async drag(
    start: Point,
    end: Point,
    coordinateSpace: CoordinateSpace = "native",
    path: Point[] = [],
  ): Promise<void> {
    return mouse.drag(start, end, coordinateSpace, path);
  }

  /** Scroll in direction */
  async scroll(direction: ScrollDirection, amount: number): Promise<void> {
    return mouse.scroll(direction, amount);
  }

  /** Type text string */
  async type(text: string, method: TypeMethod = "auto"): Promise<void> {
    return keyboard.type(text, method);
  }

  /** Press a key with optional modifiers */
  async pressKey(key: KeyName, modifiers: Modifier[] = []): Promise<void> {
    return keyboard.press(key, modifiers);
  }

  /** Press an agent-friendly key chord */
  async keypress(keys: string[]): Promise<void> {
    return keyboard.pressChord(keys);
  }

  /** Hotkey combination */
  async hotkey(modifiers: Modifier[], key: KeyName): Promise<void> {
    return keyboard.hotkey(modifiers, key);
  }

  /** Get current cursor position */
  async cursorPosition(): Promise<Point> {
    return mouse.position();
  }

  /** Read clipboard */
  async clipboardRead(): Promise<string> {
    return clipboard.read();
  }

  /** Write clipboard */
  async clipboardWrite(text: string): Promise<void> {
    return clipboard.write(text);
  }

  /** Open a URL through Launch Services */
  async openUrl(url: string, options: { app?: string; waitMs?: number } = {}): Promise<void> {
    return app.openUrl(url, options);
  }

  /** Open a macOS application by display name */
  async openApp(name: string, options: { waitMs?: number } = {}): Promise<void> {
    return app.openApp(name, options);
  }

  /** List installed macOS apps */
  async listApps(): Promise<string[]> {
    return app.listApps();
  }

  /** Return frontmost macOS app name */
  async frontmostApp(): Promise<string> {
    return windowState.frontmostApp();
  }

  /** Return active browser tab title/URL when Chrome or Safari is available */
  async browserState(
    preferred?: "Google Chrome" | "Safari",
  ): Promise<BrowserState> {
    return windowState.browserState(preferred);
  }

  /** OCR the current screen and return recognized text with native-coordinate boxes */
  async screenOcr(options: ScreenOcrOptions = {}) {
    return ocr.screenOcr(options);
  }
}
