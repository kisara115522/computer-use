import type { Computer } from "../computer/index.js";

export const doubleClickTool = {
  name: "double_click",
  description: "Double-click at a specific position on the screen.",
  inputSchema: {
    type: "object" as const,
    properties: {
      x: { type: "number", description: "X coordinate in pixels" },
      y: { type: "number", description: "Y coordinate in pixels" },
    },
    required: ["x", "y"],
  },
  async execute(input: { x: number; y: number }, computer: Computer) {
    await computer.doubleClick({ x: input.x, y: input.y });
    return {
      content: [
        {
          type: "text" as const,
          text: `Double-clicked at (${input.x}, ${input.y})`,
        },
      ],
    };
  },
};
