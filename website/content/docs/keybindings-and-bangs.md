---
title: Keybindings & bangs
description: Customize page hotkeys, terminal binds, editor binds, and !bang URL shortcuts.
weight: 42
group: Guides
---

BrowserShell configuration lives in the rc file (`/config/rc`). It defines **binds** (keyboard actions), **bangs** (URL shortcuts), and **aliases**.

## rc file basics

```bash
cat /config/rc
edit /config/rc              # beta editor — Ctrl+S to save
source /config/rc            # reload without restarting
config reload                # merge rc into runtime config
options                      # Page keys tab has rc editor
```

Example rc:

```bash
bind f hints-current
bind <leader>e edit
leader = "<space>"
global-hotkeys = true

bang gh https://github.com/search?q=%s
bang yt https://www.youtube.com/results?search_query=%s

alias ll='tabs'
alias hn='go news.ycombinator.com'
```

## bind — page & terminal keys

```bash
bind list                    # all keybindings
bind list --json
bind add f hints-current     # page: link hints
bind add gt tab-next         # page: next tab
bind add <c-l> clear         # terminal: clear screen
bind remove f
```

**Scopes:**

| Scope | Where it works |
|-------|----------------|
| `global` | Web pages (overlay closed) |
| `terminal` | Overlay terminal input |
| `editor` | In-terminal `edit` session |

Use `edit-bind` for editor-specific binds:

```bash
edit-bind list
edit-bind add <c-s> save-and-exit
```

{{< warning >}}
Do not bind plain `h/j/k/l` in the editor unless you want movement keys — they intercept typing. Default rc only binds `<c-s>` for save.
{{< /warning >}}

## import-vimium-keys

Merge a curated set of Vimium-style binds into your rc:

```bash
import-vimium-keys --dry-run   # preview diff
import-vimium-keys
config reload
```

Does not overwrite existing binds with the same keys.

## bang — site search shortcuts

Bangs expand `!name query` into URLs (like DuckDuckGo bangs).

```bash
bang list
bang add so https://stackoverflow.com/search?q=%s
bang edit gh                   # open bang URL in editor
bang remove mywiki -f
!gh BrowserShell               # → GitHub search
!so typescript generics
!yt lofi hip hop
```

Custom bangs are stored at `/config/bangs/<name>.txt` and can be edited:

```bash
touch /config/bangs/mywiki.txt
edit /config/bangs/mywiki.txt
```

## config command

```bash
config list
config show
config get theme
config set overlayOpacity 0.9
config reload
```

## VFS file commands

Create and maintain rc-related files:

```bash
touch /notes/todo.md
edit /notes/todo.md
rm /notes/old-draft.md
rm /scripts/tmp.sh -f
```

## Default shipped binds

The default rc includes scroll, hints, seek, omnibar, tab chords, marks, and `<leader>e` → open shell with `edit`. Full list:

```bash
bind list
man bind
```

Or read [Page hotkeys](/docs/page-hotkeys/) and [Keyboard shortcuts](/docs/keyboard-shortcuts/).

## Related

- [Configuration](/docs/configuration/) — options page and themes
- [Command reference](/docs/commands/reference/) — `bind`, `bang`, `config`, `edit-bind`, `import-vimium-keys`