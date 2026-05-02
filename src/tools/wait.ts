const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const waitTool = {
  name: "wait",
  description:
    "Wait for a specified number of milliseconds. " +
    "Use this to wait for animations, page loads, or UI transitions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      ms: {
        type: "number",
        description: "Milliseconds to wait (default: 1000, max: 10000)",
      },
    },
    required: [],
  },
  async execute(input: { ms?: number }) {
    const ms = Math.min(input.ms ?? 1000, 10000);
    await sleep(ms);
    return {
      content: [
        {
          type: "text" as const,
          text: `Waited ${ms}ms`,
        },
      ],
    };
  },
};
