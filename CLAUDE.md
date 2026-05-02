# CLAUDE.md

## Build & Dev Commands

```bash
bun install          # Install dependencies
bun run dev          # Run MCP server (tsx, hot-reload)
bun run build        # Compile TypeScript
bun run start        # Run compiled output
bun run typecheck    # Type-check only
```

## Architecture

Single-package MCP server. Two layers:

1. **`src/computer/`** — Platform abstraction (macOS): screen capture, mouse, keyboard, clipboard
2. **`src/tools/`** — MCP tool definitions that call Computer methods

Entry: `src/index.ts` → `src/server.ts` (registers all tools) → tools call `Computer` → Computer calls macOS APIs.

## Key Files

- `src/types.ts` — Shared types (Point, Size, AgentAction, etc.)
- `src/computer/screen.ts` — `screencapture` + `system_profiler`
- `src/computer/mouse.ts` — nut-js wrapper
- `src/computer/keyboard.ts` — nut-js wrapper
- `src/computer/clipboard.ts` — pbcopy/pbpaste
- `src/computer/computer.ts` — Unified Computer class
- `src/server.ts` — McpServer setup
- `src/tools/` — One file per MCP tool

## Conventions

- TypeScript strict mode
- ESM only (`"type": "module"`)
- Conventional Commits, Chinese descriptions
- macOS only (no cross-platform abstractions needed)
