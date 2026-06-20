---
title: Keyboard shortcuts
description: Complete reference for terminal and overlay shortcuts.
weight: 50
group: Guides
---

## Overlay

| Action | Default | Configure |
|--------|---------|-----------|
| Toggle overlay | `` ` `` | Options → Toggle key |
| Toggle overlay (alt) | `Ctrl+Shift+K` / `Cmd+Shift+K` | `chrome://extensions/shortcuts` |
| Close overlay (compact) | `Escape` | — |

## Terminal input

| Shortcut | Action |
|----------|--------|
| `Tab` | Auto-complete command, path, or flag |
| `↑` / `↓` | Command history |
| `Ctrl+R` | Reverse history search |
| `Ctrl+C` | Cancel current input / stop watch |
| `Ctrl+L` | Clear screen |
| `Ctrl+U` | Kill line (clear input) |
| `Ctrl+W` | Delete last word |
| `Enter` | Execute command |

## Reverse search

1. Press `Ctrl+R`
2. Type to filter history
3. `Ctrl+R` again to cycle matches
4. `Enter` to accept, `Ctrl+G` to cancel

## Chrome extension shortcuts

Assign at `chrome://extensions/shortcuts`:

| Command | Description |
|---------|-------------|
| Toggle BrowserShell overlay | Global overlay toggle |
| Toggle Quake-style overlay | Same overlay, unassigned by default |

## Clickable lists

| Action | How |
|--------|-----|
| Activate row | Click numbered row |
| Hover highlight | Mouse over row |

Rows run the implied follow-up command (e.g. `downloads show 1`).

## Options page

Access via extension toolbar icon or `config` command.