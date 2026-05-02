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
2. **`src/server.ts`** — MCP tool definitions that call Computer methods

Entry: `src/index.ts` → `src/server.ts` (registers all tools) → tools call `Computer` → Computer calls macOS APIs.

## Key Files

- `src/types.ts` — Shared types (Point, Size, AgentAction, etc.)
- `src/computer/screen.ts` — `screencapture` + `system_profiler`
- `src/computer/mouse.ts` — nut-js wrapper
- `src/computer/keyboard.ts` — nut-js wrapper
- `src/computer/clipboard.ts` — pbcopy/pbpaste
- `src/computer/computer.ts` — Unified Computer class
- `src/server.ts` — McpServer setup
- `src/computer/display.ts` — Display parsing and screenshot-to-native coordinate conversion
- `src/computer/permissions.ts` — macOS permission diagnostics
- `src/computer/app.ts` — macOS app/URL launch helpers
- `src/server.ts` — MCP tool registration

## Conventions

- TypeScript strict mode
- ESM only (`"type": "module"`)
- Conventional Commits, Chinese descriptions
- macOS only (no cross-platform abstractions needed)

## Desktop MCP Usage

- For `cu-desktop`, use `observe` first and after user-visible actions.
- Mouse coordinates are native macOS logical coordinates (`nativeWidth`/`nativeHeight` from `observe`), not Retina PNG pixel coordinates.
- If screenshot images are not visible to the model, use `screen_ocr` and `browser_state` instead of guessing coordinates.
- Use `screen_ocr` with `numericOnly: true` or `pattern: "^181"` to locate saved phone-number suggestions.
- After browser navigation or login attempts, call `browser_state` and/or `observe` before claiming success.
- Do not infer that login succeeded from a successful click. Verify the active tab URL/title or visible page state first.
- Use `save_screenshot` for "save a screenshot to Desktop"; do not use Bash for that workflow.
