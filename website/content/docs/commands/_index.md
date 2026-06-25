---
title: Commands
description: Overview of BrowserShell's 105 built-in commands.
weight: 70
group: Reference
---

BrowserShell ships **105 commands** organized by category. Every command includes `help` text, a `man` page, tab completion, and examples.

## Quick reference by category

| Category | Commands | Guide |
|----------|----------|-------|
| **Navigation** | `go`, `open`, `back`, `forward`, `reload`, `close`, `search`, `bang`, `cd`, `here`, `pwd` | [Superuser](/docs/superuser/) |
| **Tabs** | `tabs`, `tab`, `pin`, `unpin`, `discard`, `domain`, `title`, `detach`, `find`, `qf` | [Superuser](/docs/superuser/) |
| **Windows** | `windows`, `window`, `recent`, `sessions` | [Workspaces](/docs/workspaces/) |
| **Workspace** | `layout`, `split`, `workspace`, `workview` | [Workspaces](/docs/workspaces/) |
| **Process** | `ps`, `top`, `kill`, `pkill`, `renice` | [Workspaces](/docs/workspaces/) |
| **Bookmarks** | `bookmarks`, `bookmark` | [VFS](/docs/vfs/) |
| **History** | `history` | [Privacy tools](/docs/privacy-tools/) |
| **Downloads** | `downloads` | [Superuser](/docs/superuser/) |
| **Page** | `links`, `click`, `fill`, `read`, `shot`, `inputs`, `meta`, `tech`, `hints`, … | [Page commands](/docs/page-commands/) |
| **Page hotkeys** | (rc `bind` actions, not separate commands) | [Page hotkeys](/docs/page-hotkeys/) |
| **Config** | `config`, `bind`, `edit-bind`, `import-vimium-keys` | [Keybindings & bangs](/docs/keybindings-and-bangs/) |
| **Privacy** | `forget`, `siteinfo`, `permissions` | [Privacy tools](/docs/privacy-tools/) |
| **Dev** | `cookies`, `reqs`, `frames`, `audit`, `perf`, `env`, `storage` | [Page commands](/docs/page-commands/) |
| **AI** | `ai summarize`, `ai explain` | [Superuser](/docs/superuser/) |
| **Builtin** | `ls`, `cd`, `cat`, `grep`, `alias`, `rm`, `touch`, `export`, `clear`, `man`, `help` | [VFS](/docs/vfs/), [Shell features](/docs/shell-features/) |
| **Utility** | `edit`, `watch`, `notify`, `overlay`, `clip`, `session`, `options`, `seek`, `scroll`, … | [Shell features](/docs/shell-features/) |

## New in 2.0

| Command | What it does |
|---------|--------------|
| `bind` / `edit-bind` | Add or remove keyboard bindings in rc |
| `import-vimium-keys` | Import common Vimium-style page binds |
| `bang` | Manage `!name` URL search shortcuts |
| `edit` | In-terminal file editor (beta) |
| `touch` / `rm` | Create or delete writable VFS files |
| `hints` | Link hints from the shell (same as `f` hotkey) |
| `layout` / `split` | Tile windows and split views |
| `workspace` / `workview` | Save and restore multi-window layouts |
| `ps` / `kill` / `pkill` / `top` / `renice` | Unix-style tab process management |

## Discover commands

```bash
help                  # categorized list
apropos tab            # search by keyword
search bookmark        # fuzzy suggestions
man downloads          # full manual
```

## Full reference

The complete auto-generated reference (synced from the command registry):

**[Command reference →](/docs/commands/reference/)**