# BrowserShell

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](public/manifest.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

**A shell for your browser** — tabs, bookmarks, history, downloads, and page actions as terminal commands.

**Website:** [jamalyusuf.github.io/BrowserShell](https://jamalyusuf.github.io/BrowserShell/)

BrowserShell is a Chrome extension that overlays a Quake-style terminal on any page. Instead of hunting through menus and settings, you run keyboard-driven commands to manage browser state: switch tabs, search history, inspect the current page, clear site data, and more.

Inspired by Bash, Raycast, and classic terminal drop-down consoles.

---

## Features

- **Quake-style overlay** — press `` ` `` (configurable) to toggle a full terminal over the current page
- **86 built-in commands** — navigation, tabs, windows, bookmarks, history, downloads, page interaction, dev tools, privacy
- **Virtual filesystem** — browse browser resources with `ls`, `cd`, and `cat` (`/tabs`, `/bookmarks`, `/history`, …)
- **Pipes & shell builtins** — `tabs | grep youtube`, `history | head`, aliases, `export`, bang expansions (`!gh query`)
- **Clickable lists** — numbered output rows run follow-up commands on click (e.g. `downloads show 1`)
- **Self-documenting** — `help`, `man <cmd>`, `apropos <term>`, tab completion
- **Options page** — themes, fonts, prompt, hotkeys, forget presets, command explorer
- **Testable architecture** — mockable Chrome API layer, 154 unit/integration tests

### Example commands

```bash
tabs                          # list open tabs
tab switch 3                  # focus tab 3
go github.com                 # navigate active tab
history search react          # search browsing history
bookmark search docs          # find bookmarks
downloads                     # list recent downloads (click rows to reveal in Finder)
links                         # list links on the current page
forget --dry-run              # preview site data deletion
siteinfo                      # privacy footprint for current site
ai summarize                  # summarize page (Chrome built-in AI, when available)
watch 5 tabs                # re-run a command every 5 seconds
```

Run `help` or see [docs/COMMANDS.md](docs/COMMANDS.md) for the full command reference.

---

## Quick start

### Requirements

- [Node.js](https://nodejs.org/) 20+
- Google Chrome or Chromium (Manifest V3)

### Build & load (development)

```bash
git clone https://github.com/jamalyusuf/browsershell.git
cd browsershell
npm install
npm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

### Usage

| Action | Default |
|--------|---------|
| Toggle overlay | `` ` `` (backtick) |
| Toggle overlay (shortcut) | `Ctrl+Shift+K` / `Cmd+Shift+K` |
| Tab completion | `Tab` |
| Command history | `↑` / `↓` |
| Reverse search | `Ctrl+R` |
| Clear screen | `clear` or `Ctrl+L` |
| Options | Extension icon → Options, or `config` |

Assign additional shortcuts at `chrome://extensions/shortcuts`.

---

## Development

```bash
npm run dev          # watch build (rebuild on change; reload extension manually)
npm test             # run test suite (154 tests)
npm run typecheck    # TypeScript check
npm run generate-docs  # regenerate docs/COMMANDS.md from registry
```

### Project layout

```
src/
├── background/      # Service worker (overlay toggle, download actions)
├── chrome/          # Mockable Chrome API wrapper
├── commands/        # Command handlers (one file per command)
├── content/         # Content script — injects Quake overlay iframe
├── overlay/         # Terminal UI (xterm.js + shell host)
├── options/         # React settings page
├── page/            # Scripts injected into host page for DOM commands
├── shell/           # Parser, executor, completion, output formatting
├── terminal/        # TerminalHost — keyboard, history, link provider
├── vfs/             # Virtual filesystem providers
└── shared/          # Types, storage, themes
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design details.

### Adding a command

1. Create `src/commands/<category>/<name>.ts` using `defineCommand()`
2. Register it in `src/commands/manifest.ts`
3. Add the name to `tests/fixtures/expected-commands.ts`
4. Run `npm test`

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

---

## Permissions

BrowserShell requests broad permissions to expose browser APIs as shell commands. Every permission maps to specific commands — nothing is used for tracking or external data collection.

| Permission | Why |
|------------|-----|
| `tabs`, `activeTab`, `sessions` | Tab/window management |
| `bookmarks`, `history` | Bookmark and history commands |
| `downloads` | Download listing and reveal/open |
| `cookies`, `browsingData`, `contentSettings` | `forget`, `siteinfo`, `permissions` |
| `management` | `extensions` command |
| `scripting` | Page interaction (`links`, `click`, `fill`, …) |
| `storage` | Config, aliases, history, transcript |
| `notifications` | `notify` command |
| `<all_urls>` | Overlay injection and page scripts on any site |

Full rationale: [docs/PERMISSIONS.md](docs/PERMISSIONS.md). Security reporting: [SECURITY.md](SECURITY.md).

---

## Roadmap

Planned but **not yet implemented**:

- Package manager (`pkg install`, community commands)
- Device/serial integration
- Scrollback-persistent clickable lists across command history
- Chrome Web Store release

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

---

## License

[MIT](LICENSE) © 2026 Jamal Yusuf