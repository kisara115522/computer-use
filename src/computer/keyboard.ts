import {
  keyboard,
  Key,
  sleep,
} from "@nut-tree-fork/nut-js";
import type { KeyName, Modifier } from "../types.js";
import * as clipboard from "./clipboard.js";
import { assertAccessibilityPermission } from "./permissions.js";

export type TypeMethod = "typing" | "paste" | "auto";

/** Map our Modifier to nut-js Key */
const modifierMap: Record<Modifier, Key> = {
  command: Key.LeftSuper,
  alt: Key.LeftAlt,
  shift: Key.LeftShift,
  control: Key.LeftControl,
};

const namedKeyMap: Record<string, Key> = {
  enter: Key.Enter,
  return: Key.Enter,
  tab: Key.Tab,
  esc: Key.Escape,
  escape: Key.Escape,
  backspace: Key.Backspace,
  delete: Key.Delete,
  del: Key.Delete,
  space: Key.Space,
  up: Key.Up,
  arrowup: Key.Up,
  down: Key.Down,
  arrowdown: Key.Down,
  left: Key.Left,
  arrowleft: Key.Left,
  right: Key.Right,
  arrowright: Key.Right,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  page_up: Key.PageUp,
  "page-up": Key.PageUp,
  pagedown: Key.PageDown,
  page_down: Key.PageDown,
  "page-down": Key.PageDown,
  insert: Key.Insert,
  f1: Key.F1,
  f2: Key.F2,
  f3: Key.F3,
  f4: Key.F4,
  f5: Key.F5,
  f6: Key.F6,
  f7: Key.F7,
  f8: Key.F8,
  f9: Key.F9,
  f10: Key.F10,
  f11: Key.F11,
  f12: Key.F12,
  minus: Key.Minus,
  "-": Key.Minus,
  equal: Key.Equal,
  "=": Key.Equal,
  comma: Key.Comma,
  ",": Key.Comma,
  period: Key.Period,
  ".": Key.Period,
  slash: Key.Slash,
  "/": Key.Slash,
  semicolon: Key.Semicolon,
  ";": Key.Semicolon,
  quote: Key.Quote,
  "'": Key.Quote,
  backslash: Key.Backslash,
  "\\": Key.Backslash,
  grave: Key.Grave,
  "`": Key.Grave,
};

const digitKeyMap: Record<string, Key> = {
  "0": Key.Num0,
  "1": Key.Num1,
  "2": Key.Num2,
  "3": Key.Num3,
  "4": Key.Num4,
  "5": Key.Num5,
  "6": Key.Num6,
  "7": Key.Num7,
  "8": Key.Num8,
  "9": Key.Num9,
};

const normalize = (key: string): string =>
  key.trim().replace(/\s+/g, "").toLowerCase();

export const resolveKeyName = (key: string): Key => {
  const normalized = normalize(key);
  if (namedKeyMap[normalized] !== undefined) return namedKeyMap[normalized];
  if (digitKeyMap[normalized] !== undefined) return digitKeyMap[normalized];

  if (/^[a-z]$/.test(normalized)) {
    return Key[normalized.toUpperCase() as keyof typeof Key] as Key;
  }

  const functionKey = normalized.match(/^f(\d{1,2})$/);
  if (functionKey) {
    const keyName = `F${functionKey[1]}` as keyof typeof Key;
    if (Key[keyName] !== undefined) return Key[keyName] as Key;
  }

  throw new Error(`Unsupported key: ${key}`);
};

const resolveModifier = (key: string): Key | undefined => {
  const normalized = normalize(key);
  switch (normalized) {
    case "command":
    case "cmd":
    case "super":
    case "meta":
      return Key.LeftSuper;
    case "alt":
    case "option":
      return Key.LeftAlt;
    case "shift":
      return Key.LeftShift;
    case "control":
    case "ctrl":
      return Key.LeftControl;
    default:
      return undefined;
  }
};

export const parseKeyChord = (
  chord: string,
): { key: Key; modifiers: Key[] } => {
  return parseKeyList(chord.split("+"));
};

export const parseKeyList = (
  keys: string[],
): { key: Key; modifiers: Key[] } => {
  const tokens = keys.flatMap((key) => key.split("+")).map((key) => key.trim()).filter(Boolean);
  const modifiers: Key[] = [];
  const regularKeys: string[] = [];

  for (const token of tokens) {
    const modifier = resolveModifier(token);
    if (modifier !== undefined) modifiers.push(modifier);
    else regularKeys.push(token);
  }

  if (regularKeys.length !== 1) {
    throw new Error(
      `Expected exactly one non-modifier key, got ${regularKeys.length}: ${keys.join("+")}`,
    );
  }

  return { key: resolveKeyName(regularKeys[0]), modifiers };
};

export const pressChord = async (keys: string[]): Promise<void> => {
  assertAccessibilityPermission();
  const { key, modifiers } = parseKeyList(keys);

  if (modifiers.length > 0) {
    await keyboard.pressKey(...modifiers, key);
    await sleep(50);
    await keyboard.releaseKey(...modifiers, key);
  } else {
    await keyboard.pressKey(key);
    await sleep(50);
    await keyboard.releaseKey(key);
  }
};

const pasteText = async (text: string): Promise<void> => {
  await clipboard.write(text);
  await pressChord(["command", "v"]);
};

/** Type a string character by character */
export const type = async (
  text: string,
  method: TypeMethod = "auto",
): Promise<void> => {
  assertAccessibilityPermission();
  const shouldPaste =
    method === "paste" || (method === "auto" && /[^\x20-\x7e]|\n/.test(text));

  if (shouldPaste) {
    await pasteText(text);
    return;
  }

  await keyboard.type(text);
};

/** Press a named key (with optional modifiers) */
export const press = async (
  key: KeyName,
  modifiers: Modifier[] = [],
): Promise<void> => {
  assertAccessibilityPermission();
  const modKeys = modifiers.map((m) => modifierMap[m]);
  const targetKey = resolveKeyName(key);

  if (modKeys.length > 0) {
    await keyboard.pressKey(...modKeys, targetKey);
    await sleep(50);
    await keyboard.releaseKey(...modKeys, targetKey);
  } else {
    await keyboard.pressKey(targetKey);
    await sleep(50);
    await keyboard.releaseKey(targetKey);
  }
};

/** Press a hotkey combination (e.g., command+c) */
export const hotkey = async (
  modifiers: Modifier[],
  key: KeyName,
): Promise<void> => {
  await press(key, modifiers);
};
