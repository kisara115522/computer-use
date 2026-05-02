import type { Computer } from "../computer/index.js";

export const typeTool = {
  name: "type",
  description:
    "Type text as if the user is typing on the keyboard. " +
    "Use this to fill in text fields, search boxes, etc.",
  inputSchema: {
    type: "object" as const,
    properties: {
      text: { type: "string", description: "The text to type" },
    },
    required: ["text"],
  },
  async execute(input: { text: string }, computer: Computer) {
    await computer.type(input.text);
    return {
      content: [
        {
          type: "text" as const,
          text: `Typed: "${input.text}"`,
        },
      ],
    };
  },
};
