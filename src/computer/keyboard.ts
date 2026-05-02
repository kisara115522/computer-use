import {
  keyboard,
  Key,
  sleep,
} from "@nut-tree-fork/nut-js";
import type { KeyName, Modifier } from "../types.js";

/** Map our Modifier to nut-js Key */
const modifierMap: Record<Modifier, Key> = {
  command: Key.LeftSuper,
  alt: Key.LeftAlt,
  shift: Key.LeftShift,
  control: Key.LeftControl,
};

/** Map our KeyName to nut-js Key */
const keyMap: Record<KeyName, Key> = {
  enter: Key.Enter,
  tab: Key.Tab,
  escape: Key.Escape,
  backspace: Key.Backspace,
  delete: Key.Delete,
  space: Key.Space,
  up: Key.Up,
  down: Key.Down,
  left: Key.Left,
  right: Key.Right,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  pagedown: Key.PageDown,
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
};

/** Type a string character by character */
export const type = async (text: string): Promise<void> => {
  await keyboard.type(text);
};

/** Press a named key (with optional modifiers) */
export const press = async (
  key: KeyName,
  modifiers: Modifier[] = [],
): Promise<void> => {
  const modKeys = modifiers.map((m) => modifierMap[m]);
  const targetKey = keyMap[key];

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
