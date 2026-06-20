---
title: Architecture
description: How BrowserShell is built — shell, commands, VFS, and Chrome APIs.
weight: 80
group: Reference
---

BrowserShell is a Manifest V3 Chrome extension with four layers:

```
Content script → Overlay iframe → Shell executor → Chrome API
                     ↕
              Page inject scripts (DOM commands)
```

## Components

| Layer | Location | Role |
|-------|----------|------|
| Content script | `src/content/overlay.ts` | Injects Quake-style iframe on every page |
| Terminal host | `src/terminal/host.ts` | xterm.js UI, input, history, links |
| Shell executor | `src/shell/executor.ts` | Parser, pipes, aliases, dispatch |
| Commands | `src/commands/` | 86 handlers with `defineCommand()` metadata |
| Chrome API | `src/chrome/api.ts` | Mockable wrapper over `chrome.*` |
| VFS | `src/vfs/` | Virtual paths for tabs, bookmarks, history, … |
| Background | `src/background/` | Privileged actions (downloads, toggle) |

## Command registration

Every command exports a `Command` object:

```typescript
export const tabs = defineCommand({
  name: 'tabs',
  description: 'List open tabs',
  usage: 'tabs [--json]',
  examples: ['tabs', 'tabs --json'],
  category: 'tabs',
  async handler(args, ctx) { /* ... */ },
});
```

Registered in `src/commands/manifest.ts` and validated by tests.

## Testing

154 tests with a mock `ChromeAPI` and happy-dom for DOM commands. No live browser required for CI.

## Building

```bash
npm run build
```

Produces a loadable extension in `dist/`. See [CONTRIBUTING](https://github.com/jamalyusuf/browsershell/blob/main/CONTRIBUTING.md) for adding commands.