---
title: Configuration
description: Themes, prompts, hotkeys, aliases, and rc file customization.
weight: 45
group: Guides
---

## Options page

Open via the extension icon, or run:

```bash
config
```

### Appearance

| Setting | Description |
|---------|-------------|
| Theme | Built-in presets (GitHub Dark, Dracula, etc.) + custom themes |
| Font family | Monospace font selection |
| Font size | Terminal font size |
| Line height | Line spacing |
| Letter spacing | Character spacing |
| Cursor style | Block, underline, or bar |

### Prompt

Default template: `\u@\h:\w$ `

| Token | Value |
|-------|-------|
| `\u` | Username (from env) |
| `\h` | Current site domain |
| `\w` | Virtual cwd |

Example: `[\u@\h \w]$ ` → `[you@github.com /tabs]$`

### Toggle key

Default: backtick (`` ` ``). Rebind to any key. Also assign `Ctrl+Shift+K` at `chrome://extensions/shortcuts`.

### Forget presets

Named profiles for `forget --preset <name>`. Define scope: cookies, cache, storage, history inclusion.

## rc file (startup)

Editable in options or via VFS:

```bash
cat /config/rc
source /config/rc
```

Example rc:

```bash
# Aliases
alias ll='tabs'
alias hn='go news.ycombinator.com'
alias triage='tabs | grep -v pinned'

# Environment
export USER=jamal
export EDITOR=vim

# Runs on shell init
```

## Aliases

```bash
alias name='command'
alias              # list all
```

Aliases expand before parsing. Support single-level substitution.

## Custom themes

Create in Options → Custom Themes:

- Background, foreground, cursor colors
- ANSI color palette
- Prompt and accent colors

Themes persist in config and apply immediately.

## Export and backup

```bash
export                       # export config
cat /config/settings.json
```

Back up aliases, themes, presets, and rc before reinstalling.

## Command history

- Stored in config, persists across sessions
- Navigate with `↑` / `↓`
- Reverse search: `Ctrl+R`
- Clear in options page