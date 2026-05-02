import type { Computer } from "../computer/index.js";

export const clipboardReadTool = {
  name: "clipboard_read",
  description: "Read the current text content of the system clipboard.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  async execute(_input: Record<string, unknown>, computer: Computer) {
    const text = await computer.clipboardRead();
    return {
      content: [
        {
          type: "text" as const,
          text: `Clipboard content: ${text}`,
        },
      ],
    };
  },
};

export const clipboardWriteTool = {
  name: "clipboard_write",
  description: "Write text to the system clipboard.",
  inputSchema: {
    type: "object" as const,
    properties: {
      text: { type: "string", description: "Text to write to clipboard" },
    },
    required: ["text"],
  },
  async execute(input: { text: string }, computer: Computer) {
    await computer.clipboardWrite(input.text);
    return {
      content: [
        {
          type: "text" as const,
          text: `Wrote to clipboard: "${input.text}"`,
        },
      ],
    };
  },
};
