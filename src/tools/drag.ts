import type { Computer } from "../computer/index.js";

export const dragTool = {
  name: "drag",
  description:
    "Drag from one position to another. Useful for moving files, " +
    "selecting text, or rearranging UI elements.",
  inputSchema: {
    type: "object" as const,
    properties: {
      startX: { type: "number", description: "Start X coordinate" },
      startY: { type: "number", description: "Start Y coordinate" },
      endX: { type: "number", description: "End X coordinate" },
      endY: { type: "number", description: "End Y coordinate" },
    },
    required: ["startX", "startY", "endX", "endY"],
  },
  async execute(
    input: { startX: number; startY: number; endX: number; endY: number },
    computer: Computer,
  ) {
    await computer.drag(
      { x: input.startX, y: input.startY },
      { x: input.endX, y: input.endY },
    );
    return {
      content: [
        {
          type: "text" as const,
          text: `Dragged from (${input.startX}, ${input.startY}) to (${input.endX}, ${input.endY})`,
        },
      ],
    };
  },
};
