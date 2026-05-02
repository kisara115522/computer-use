import { mouse, straightTo, Point as NutPoint, Button } from "@nut-tree-fork/nut-js";
import type { Point, MouseButton } from "../types.js";

/** Convert our Point to nut-js Point */
const toNut = (p: Point): NutPoint => new NutPoint(p.x, p.y);

/** Map our MouseButton to nut-js Button */
const buttonMap: Record<MouseButton, Button> = {
  left: Button.LEFT,
  right: Button.RIGHT,
  middle: Button.MIDDLE,
};

/** Move cursor to absolute position */
export const move = async (p: Point): Promise<void> => {
  await mouse.move(straightTo(toNut(p)));
};

/** Move cursor by relative offset */
export const moveRelative = async (dx: number, dy: number): Promise<void> => {
  await mouse.move(straightTo(toNut({ x: dx, y: dy })));
};

/** Click at position */
export const click = async (
  p: Point,
  button: MouseButton = "left",
): Promise<void> => {
  await mouse.move(straightTo(toNut(p)));
  await mouse.click(buttonMap[button]);
};

/** Double-click at position */
export const doubleClick = async (p: Point): Promise<void> => {
  await mouse.move(straightTo(toNut(p)));
  await mouse.doubleClick(Button.LEFT);
};

/** Right-click at position */
export const rightClick = async (p: Point): Promise<void> => {
  await mouse.move(straightTo(toNut(p)));
  await mouse.rightClick();
};

/** Drag from start to end */
export const drag = async (start: Point, end: Point): Promise<void> => {
  await mouse.move(straightTo(toNut(start)));
  await mouse.pressButton(Button.LEFT);
  await mouse.move(straightTo(toNut(end)));
  await mouse.releaseButton(Button.LEFT);
};

/** Scroll in direction (positive = down/right, negative = up/left) */
export const scroll = async (
  direction: "up" | "down" | "left" | "right",
  amount: number,
): Promise<void> => {
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
  const p = await mouse.getPosition();
  return { x: p.x, y: p.y };
};
