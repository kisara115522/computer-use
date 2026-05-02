# computer-use

macOS computer control as an MCP server. AI agents can observe the screen, click, type, scroll, open apps/URLs, use the clipboard, and continue from fresh screenshots through the Model Context Protocol.

## What is this?

An MCP server that exposes desktop control tools — screen observation, mouse, keyboard, clipboard, app launch, URL launch, and diagnostics — so any MCP-capable AI agent can interact with your computer.

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

## Permissions

macOS permissions are per host process. If you run the server with Bun, grant permissions to `bun`; if you run compiled output with Node, grant them to `node` or the app that launched Node.

Required:

- Screen Recording: `observe` and `screenshot`
- Accessibility: mouse and keyboard tools
- Input Monitoring: useful for global hotkeys/background key events

Use the MCP tools `diagnostics`, `screen_info`, and `request_permissions` to inspect status or open the right System Settings pane.

## Coordinate Model

Mouse tools default to `coordinate_space: "native"`, meaning macOS logical coordinates. `observe` and `screenshot` return `nativeWidth` and `nativeHeight`; use that 1512x982-style coordinate space for clicks, moves, and drags.

Pass `coordinate_space: "screenshot"` only when you intentionally have full Retina PNG pixel coordinates.

## Vision Output

`observe`, `screenshot`, and `screenshot_region` return a downsized JPEG image block for the model plus text metadata for native coordinates. The full Retina PNG is intentionally not returned as the vision block because Claude Code applies an MCP output limit to image data; large screenshots can be dropped before the model sees them.

Use `screenshot_region` when the full-screen preview is visible but text, buttons, or autocomplete popups are too small to read.

Optional tuning:

```bash
MAX_MCP_OUTPUT_TOKENS=200000          # Claude Code MCP result budget
CU_DESKTOP_VISION_MAX_DIMENSION=768   # Larger returned vision image
CU_DESKTOP_VISION_JPEG_QUALITY=55     # Higher JPEG quality
```

## Available Tools

| Tool | Description |
|------|-------------|
| `observe` | Capture the current screen as a vision-sized image plus coordinate metadata |
| `screenshot` | Compatibility alias for visual screen capture |
| `screenshot_region` | Capture a cropped region when the full-screen preview is too small |
| `save_screenshot` | Save a PNG screenshot directly to the Desktop |
| `screen_info` | Display size, scale, and permission diagnostics |
| `diagnostics` | macOS permission report |
| `request_permissions` | Open macOS Privacy & Security panes |
| `click` | Click at (x, y), default native coordinates |
| `double_click` | Double-click at (x, y), default native coordinates |
| `move` / `mouse_move` | Move cursor to (x, y) without clicking |
| `drag` | Drag using `path: [{x,y}, ...]` or legacy start/end coordinates |
| `scroll` | Scroll using `scrollX`/`scrollY` or legacy `direction`/`amount` |
| `keypress` | Press agent-style chords like `["command", "l"]` |
| `press_key` / `key` | Compatibility key press tools |
| `type_text` / `type` | Type or paste text into the focused UI element |
| `open_url` | Open a URL through macOS Launch Services |
| `open_app` | Open an app by name, e.g. `Safari` |
| `frontmost_app` | Verify which macOS app is currently focused |
| `browser_state` | Verify Chrome/Safari active tab title and URL |
| `screen_ocr` | Read visible screen text with native-coordinate bounding boxes |
| `list_apps` | List installed apps in common Applications folders |
| `cursor_position` | Return current cursor position in native coordinates |
| `clipboard_read` | Read system clipboard |
| `clipboard_write` | Write to system clipboard |
| `wait` | Wait for specified milliseconds |

## Requirements

- macOS (uses native `screencapture`, `pbcopy`, `pbpaste`)
- Node.js >= 20 or Bun >= 1.3
- Screen Recording and Accessibility permissions for the host app (System Settings > Privacy & Security)

## Smoke Test

```bash
bun test
bun run typecheck
bun run build

# Inspect registered tools without starting an MCP client
bun -e 'import { createServer } from "./src/server.ts"; console.log(Object.keys(createServer()._registeredTools).sort())'

# Inspect local permission/display state
bun -e 'import { Computer } from "./src/computer/index.ts"; const c = new Computer(); console.log({ permissions: c.permissions(), display: await c.displayInfo() })'
```

## License

MIT
