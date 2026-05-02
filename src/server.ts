import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Computer } from "./computer/index.js";
import { allTools } from "./tools/index.js";

export interface ServerOptions {
  name?: string;
  version?: string;
}

/**
 * Create and configure the MCP server with all computer-use tools.
 * Each tool receives a shared Computer instance for executing actions.
 */
export const createServer = (options: ServerOptions = {}) => {
  const server = new McpServer({
    name: options.name ?? "computer-use",
    version: options.version ?? "0.1.0",
  });

  const computer = new Computer();

  for (const tool of allTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (args: Record<string, unknown>) => tool.execute(args, computer),
    );
  }

  return server;
};
