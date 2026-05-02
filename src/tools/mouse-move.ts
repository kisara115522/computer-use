import type { Computer } from "../computer/index.js";

export const mouseMoveTool = {
  name: "mouse_move",
  description: "Move the mouse cursor to a specific position without clicking.",
  inputSchema: {
    type: "object" as const,
    properties: {
      x: { type: "number", description: "X coordinate in pixels" },
      y: { type: "number", description: "Y coordinate in pixels" },
    },
    required: ["x", "y"],
  },
  async execute(input: { x: number; y: number }, computer: Computer) {
    await computer.mouseMove({ x: input.x, y: input.y });
    return {
      content: [
        {
          type: "text" as const,
          text: `Mouse moved to (${input.x}, ${input.y})`,
        },
      ],
    };
  },
};
