---
title: Getting started
description: Install BrowserShell and run your first commands in under two minutes.
weight: 5
group: Getting started
---

## Install {#install}

### Requirements

- Google Chrome or Chromium (Manifest V3)
- [Node.js](https://nodejs.org/) 20+ (for building from source)

### Build from source

```bash
git clone https://github.com/jamalyusuf/browsershell.git
cd browsershell
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder from the repo

The extension is now active on every page.

## First session

Press **`` ` ``** (backtick) to open the overlay terminal. You should see a prompt like:

```text
you@example.com:/$
```

Try these commands:

```bash
help                  # list commands by category
tabs                  # show open tabs
go example.com        # navigate active tab
touch /notes/todo.md && edit /notes/todo.md   # create and edit a note
man tab               # full manual for tab command
```

### Page hotkeys (Vimium-style)

With the overlay closed, use keys like `f` (link hints), `j`/`k` (scroll), `/` (find), `o` (omnibar), and `gg`/`G` (top/bottom) on any http(s) page. Hotkeys work as soon as the page loads — no extra click needed. Press `?` on a page for the full cheat sheet.

### Built-in editor (beta)

> **Note:** The in-terminal editor is early preview — simple mode works, but full Vim editing is not ready yet.

```bash
edit /notes/todo.md   # arrow keys to move, type to edit
# Ctrl+S to save · Esc to exit
edit /config/rc       # edit keybindings and aliases
```

Press **`` ` ``** again to hide the overlay. Your page stays underneath — no context switch.

## Keyboard shortcuts

| Action | Default |
|--------|---------|
| Toggle overlay | `` ` `` |
| Toggle overlay (alt) | `Ctrl+Shift+K` / `Cmd+Shift+K` |
| Tab completion | `Tab` |
| Command history | `↑` / `↓` |
| Reverse search | `Ctrl+R` |
| Clear screen | `clear` or `Ctrl+L` |

Assign custom shortcuts at `chrome://extensions/shortcuts`.

## Configuration

Open the options page via the extension icon, or run:

```bash
options
```

Aliases: `settings`, `prefs`. Documentation: [jamalyusuf.github.io/BrowserShell](https://jamalyusuf.github.io/BrowserShell/)

Customize theme, font, prompt template, toggle key, forget presets, and aliases.

### Prompt template

Default: `\u@\h:\w$ `

| Token | Meaning |
|-------|---------|
| `\u` | Username |
| `\h` | Current site domain |
| `\w` | Virtual cwd |

### Startup file

Add aliases and exports to your rc file (editable in options):

```bash
alias ll='tabs'
alias gh='tab new https://github.com'
export EDITOR=vim
```

## Virtual filesystem

BrowserShell exposes browser state as paths:

```bash
ls /                  # list mount points
ls /tabs              # tab listing
cd /bookmarks/Work    # navigate bookmark tree
cat /current/url.txt  # read active tab URL
```

## Getting help

```bash
help                  # categorized command list
man <command>         # detailed manual with examples
apropos <keyword>     # search commands by topic
search <query>        # fuzzy command suggestions
```

## Next steps

- [Superuser guide](/docs/superuser/) — power workflows and aliases
- [Command reference](/docs/commands/reference/) — all 105 commands
- [Keyboard shortcuts](/docs/keyboard-shortcuts/) — overlay, terminal, and page keys
- [Permissions](/legal/permissions/) — why the extension needs each Chrome permission