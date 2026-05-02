import type { Computer } from "../computer/index.js";
import type { MouseButton } from "../types.js";

export const clickTool = {
  name: "click",
  description:
    "Click at a specific position on the screen. " +
    "Coordinates are in pixels from the top-left corner.",
  inputSchema: {
    type: "object" as const,
    properties: {
      x: { type: "number", description: "X coordinate in pixels" },
      y: { type: "number", description: "Y coordinate in pixels" },
      button: {
        type: "string",
        enum: ["left", "right", "middle"],
        description: "Mouse button (default: left)",
      },
    },
    required: ["x", "y"],
  },
  async execute(
    input: { x: number; y: number; button?: MouseButton },
    computer: Computer,
  ) {
    await computer.click({ x: input.x, y: input.y }, input.button ?? "left");
    return {
      content: [
        {
          type: "text" as const,
          text: `Clicked at (${input.x}, ${input.y}) with ${input.button ?? "left"} button`,
        },
      ],
    };
  },
};
