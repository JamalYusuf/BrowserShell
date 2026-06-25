# Architecture

BrowserShell is a Manifest V3 Chrome extension with four main surfaces:

1. **Content script** (`src/content/`) — Quake-style overlay iframe and Vimium-style global hotkeys
2. **Overlay terminal** (`src/overlay/`, `src/terminal/`) — xterm.js UI driven by `ShellExecutor`
3. **Service worker** (`src/background/`) — overlay toggle, tab actions, omnibar search
4. **Options page** (`src/options/`) — React settings UI

## Command flow

```
User input → TerminalHost → ShellExecutor → Command handler
                ↓                              ↓
           VFS / Chrome API              structured result (e.g. editor)
```

Commands live in `src/commands/` and register via `src/commands/manifest.ts`. The Chrome API is wrapped in `src/chrome/api.ts` for testability.

## Virtual filesystem

Providers under `src/vfs/providers/` mount browser state at paths like `/tabs`, `/bookmarks`, `/notes`, `/config/rc`.

## Configuration

`~/.browsershellrc` (stored in config) controls terminal binds, global page hotkeys, editor shortcuts, bangs, and aliases — parsed by `src/shared/rc-parser.ts`.