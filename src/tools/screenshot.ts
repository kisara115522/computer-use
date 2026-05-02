import type { Computer } from "../computer/index.js";

export const screenshotTool = {
  name: "screenshot",
  description:
    "Capture the current screen and return a base64-encoded PNG image. " +
    "Use this to see what is currently displayed on the user's screen.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  async execute(_input: Record<string, unknown>, computer: Computer) {
    const result = await computer.screenshot();
    return {
      content: [
        {
          type: "image" as const,
          data: result.base64,
          mimeType: result.mimeType,
        },
        {
          type: "text" as const,
          text: `Screen captured: ${result.size.width}x${result.size.height}`,
        },
      ],
    };
  },
};
