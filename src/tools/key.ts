import type { Computer } from "../computer/index.js";
import type { KeyName, Modifier } from "../types.js";

export const keyTool = {
  name: "key",
  description:
    "Press a keyboard key, optionally with modifier keys. " +
    "Use for Enter, Tab, Escape, arrow keys, function keys, and shortcuts like cmd+c.",
  inputSchema: {
    type: "object" as const,
    properties: {
      key: {
        type: "string",
        description:
          "Key to press: enter, tab, escape, backspace, delete, space, " +
          "up, down, left, right, home, end, pageup, pagedown, f1-f12",
      },
      modifiers: {
        type: "array",
        items: {
          type: "string",
          enum: ["command", "alt", "shift", "control"],
        },
        description: "Modifier keys to hold (optional)",
      },
    },
    required: ["key"],
  },
  async execute(
    input: { key: KeyName; modifiers?: Modifier[] },
    computer: Computer,
  ) {
    await computer.pressKey(input.key, input.modifiers ?? []);
    const modStr = input.modifiers?.length
      ? `${input.modifiers.join("+")}+`
      : "";
    return {
      content: [
        {
          type: "text" as const,
          text: `Pressed ${modStr}${input.key}`,
        },
      ],
    };
  },
};
