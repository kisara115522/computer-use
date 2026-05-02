# computer-use

macOS computer control as an MCP server. AI agents can take screenshots, click, type, scroll, and more through the Model Context Protocol.

## What is this?

An MCP server that exposes desktop control tools — screenshot, mouse, keyboard, clipboard — so any AI agent (Claude, GPT, etc.) can interact with your computer.

## Install

```bash
bun install
```

## Usage

### As MCP Server (stdio)

```bash
# Direct run
bun run src/index.ts

# Or build and run
bun run build
node dist/index.js
```

### Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "computer-use": {
      "command": "bun",
      "args": ["run", "/path/to/computer-use/src/index.ts"]
    }
  }
}
```

### Claude Code config

```bash
claude mcp add computer-use -- bun run /path/to/computer-use/src/index.ts
```

## Available Tools

| Tool | Description |
|------|-------------|
| `screenshot` | Capture the current screen as PNG |
| `click` | Click at (x, y) with left/right/middle button |
| `double_click` | Double-click at (x, y) |
| `mouse_move` | Move cursor to (x, y) |
| `type` | Type text string |
| `key` | Press a key (enter, tab, escape, arrows, f1-f12) with optional modifiers |
| `scroll` | Scroll up/down/left/right |
| `drag` | Drag from (x1, y1) to (x2, y2) |
| `clipboard_read` | Read system clipboard |
| `clipboard_write` | Write to system clipboard |
| `wait` | Wait for specified milliseconds |

## Requirements

- macOS (uses native `screencapture`, `pbcopy`, `pbpaste`)
- Node.js >= 20 or Bun >= 1.3
- Accessibility permissions for the terminal app (System Settings > Privacy & Security > Accessibility)

## License

MIT
