import type { Computer } from "../computer/index.js";
import type { ScrollDirection } from "../types.js";

export const scrollTool = {
  name: "scroll",
  description:
    "Scroll the screen in a given direction. " +
    "Use amount to control how many ticks to scroll.",
  inputSchema: {
    type: "object" as const,
    properties: {
      direction: {
        type: "string",
        enum: ["up", "down", "left", "right"],
        description: "Scroll direction",
      },
      amount: {
        type: "number",
        description: "Number of scroll ticks (default: 3)",
      },
    },
    required: ["direction"],
  },
  async execute(
    input: { direction: ScrollDirection; amount?: number },
    computer: Computer,
  ) {
    await computer.scroll(input.direction, input.amount ?? 3);
    return {
      content: [
        {
          type: "text" as const,
          text: `Scrolled ${input.direction} by ${input.amount ?? 3} ticks`,
        },
      ],
    };
  },
};
