import { mouse, straightTo, Point as NutPoint, Button } from "@nut-tree-fork/nut-js";
import type { CoordinateSpace, Point, MouseButton } from "../types.js";
import {
  clampToDisplay,
  convertPointToNative,
  getDisplayInfo,
} from "./display.js";
import { assertAccessibilityPermission } from "./permissions.js";

/** Convert our Point to nut-js Point */
const toNut = (p: Point): NutPoint => new NutPoint(p.x, p.y);

/** Map our MouseButton to nut-js Button */
const buttonMap: Record<MouseButton, Button> = {
  left: Button.LEFT,
  right: Button.RIGHT,
  middle: Button.MIDDLE,
};

const toNative = async (
  p: Point,
  coordinateSpace: CoordinateSpace = "native",
): Promise<Point> => {
  const display = await getDisplayInfo();
  return clampToDisplay(convertPointToNative(p, display, coordinateSpace), display);
};

const moveNative = async (p: Point): Promise<void> => {
  await mouse.move(straightTo(toNut(p)));
  const current = await mouse.getPosition();
  const distance = Math.hypot(current.x - p.x, current.y - p.y);
  if (distance > 8) {
    throw new Error(
      `Mouse move verification failed: expected (${p.x}, ${p.y}), got (${current.x}, ${current.y}). Check Accessibility permission.`,
    );
  }
};

/** Move cursor to absolute position */
export const move = async (
  p: Point,
  coordinateSpace: CoordinateSpace = "native",
): Promise<void> => {
  assertAccessibilityPermission();
  await moveNative(await toNative(p, coordinateSpace));
};

/** Move cursor by relative offset */
export const moveRelative = async (dx: number, dy: number): Promise<void> => {
  assertAccessibilityPermission();
  const current = await mouse.getPosition();
  await moveNative({ x: current.x + dx, y: current.y + dy });
};

/** Click at position */
export const click = async (
  p: Point,
  button: MouseButton = "left",
  coordinateSpace: CoordinateSpace = "native",
): Promise<void> => {
  assertAccessibilityPermission();
  await moveNative(await toNative(p, coordinateSpace));
  await mouse.click(buttonMap[button]);
};

/** Double-click at position */
export const doubleClick = async (
  p: Point,
  coordinateSpace: CoordinateSpace = "native",
): Promise<void> => {
  assertAccessibilityPermission();
  await moveNative(await toNative(p, coordinateSpace));
  await mouse.doubleClick(Button.LEFT);
};

/** Right-click at position */
export const rightClick = async (
  p: Point,
  coordinateSpace: CoordinateSpace = "native",
): Promise<void> => {
  assertAccessibilityPermission();
  await moveNative(await toNative(p, coordinateSpace));
  await mouse.rightClick();
};

/** Drag from start to end */
export const drag = async (
  start: Point,
  end: Point,
  coordinateSpace: CoordinateSpace = "native",
  path: Point[] = [],
): Promise<void> => {
  assertAccessibilityPermission();
  const rawPath = path.length > 0 ? path : [start, end];
  const nativePath = await Promise.all(
    rawPath.map((point) => toNative(point, coordinateSpace)),
  );
  const first = nativePath[0];

  await moveNative(first);
  await mouse.pressButton(Button.LEFT);
  try {
    for (const point of nativePath.slice(1)) {
      await mouse.move(straightTo(toNut(point)));
    }
  } finally {
    await mouse.releaseButton(Button.LEFT);
  }
};

/** Scroll in direction (positive = down/right, negative = up/left) */
export const scroll = async (
  direction: "up" | "down" | "left" | "right",
  amount: number,
): Promise<void> => {
  assertAccessibilityPermission();
  switch (direction) {
    case "down":
      await mouse.scrollDown(amount);
      break;
    case "up":
      await mouse.scrollUp(amount);
      break;
    case "right":
      await mouse.scrollRight(amount);
      break;
    case "left":
      await mouse.scrollLeft(amount);
      break;
  }
};

/** Get current cursor position */
export const position = async (): Promise<Point> => {
  assertAccessibilityPermission();
  const p = await mouse.getPosition();
  return { x: p.x, y: p.y };
};
