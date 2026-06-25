---
title: Page hotkeys
description: Vimium-style keyboard navigation on web pages — link hints, scroll, omnibar, marks, and tab chords.
weight: 32
group: Guides
---

Page hotkeys are Vimium-style bindings that work on http(s) pages while the terminal overlay is **closed**. They activate automatically on page load — no extra click required.

Configure in **Options → Page keys** or edit binds in `/config/rc`.

## Quick start

1. Open any website (overlay closed).
2. Press `f` — link hints appear; type letters to follow a link.
3. Press `j` / `k` — scroll down / up.
4. Press `?` — full cheat sheet overlay.

```bash
bind list                    # see all binds from the shell
import-vimium-keys           # merge common Vimium binds into rc
config reload                # apply rc changes
options                      # open Page keys tab
```

## Navigation

| Key | Action |
|-----|--------|
| `f` | Link hints (current tab) |
| `F` | Link hints (new tab) |
| `yf` | Copy link URL via hints |
| `j` / `k` | Scroll down / up |
| `d` / `u` | Half page down / up |
| `h` / `l` | Scroll left / right |
| `gg` / `G` | Jump to top / bottom |
| `zH` / `zL` | Scroll all the way left / right |
| `/` | Find on page (`/pat/` for regex) |
| `n` / `N` | Next / previous match |
| `gi` | Focus first text input |
| `i` | Insert mode (pause hotkeys until Esc) |
| `H` / `L` | Browser back / forward |
| `r` | Reload page |
| `gs` | View page source |
| `yy` | Copy page URL |
| `gf` / `gF` | Next iframe / main frame |
| `gu` / `gU` | Up one URL level / site root |
| `]]` / `[[` | Next / prev pagination link |

## Omnibar & search

| Key | Action |
|-----|--------|
| `o` / `O` | Open URL omnibar (current / new tab) |
| `b` / `B` | Bookmark omnibar |
| `T` | Tab search omnibar |
| `ge` / `gE` | Edit current URL in shell (current / new tab) |

Omnibar sources: open tabs, bookmarks, history, and typed URLs.

## Visual mode & clipboard

| Key | Action |
|-----|--------|
| `v` / `V` | Character / line visual mode |
| `yc` | Visual word mode |
| `y` | Yank selection |
| `p` / `P` | Paste and go (current / new tab) |
| `<c-s>` | Save selection to notes |

## Marks

| Key | Action |
|-----|--------|
| `m{a-z}` | Set mark at scroll position |
| `` `{a-z} `` | Jump to mark |
| `` ` `` `` | Jump back (after `gg` / `G` / seek) |

## Tabs & windows

| Key | Action |
|-----|--------|
| `t` | New tab |
| `x` | Close tab |
| `yt` | Duplicate tab |
| `J` / `K` | Next / prev tab |
| `gt` / `gT` | Next / prev tab |
| `g0` / `g$` | First / last tab |
| `^` | Previous tab |
| `X` | Restore closed tab |
| `W` | Move tab to new window |
| `<a-p>` | Pin / unpin tab |
| `5t` | Count prefix — repeat next command 5× |

## Shell integration

| Key | Action |
|-----|--------|
| `<space>e` | Open overlay with `edit` command |
| `?` | Toggle help overlay |

From the terminal you can also run:

```bash
hints                        # same as f
hints --newtab               # same as F
bind add ; seek              # custom bind
bind remove f
```

## Settings (rc file)

```bash
global-hotkeys = true
insert-mode-auto = true      # pause hotkeys in text fields
leader = "<space>"
hint-chars = "asdfghjklqwertyuiopzxcvbnm"
hint-max = 220
scroll-step = 0.8
global-hotkeys-exceptions = "mail.google.com,*.bank.com"
```

## Troubleshooting

**Hotkeys do nothing after load**

- Confirm **Global hotkeys** is on in options.
- Check the site is not in **Disabled hosts**.
- Ensure you are not in a text field (or press Esc).
- Run `config reload` after editing rc.

**Hotkeys conflict with site shortcuts**

- Add the host to disabled hosts, or rebind conflicting keys with `bind add`.

See also: [Keyboard shortcuts](/docs/keyboard-shortcuts/), [Keybindings & bangs](/docs/keybindings-and-bangs/), [Command reference → hints](/docs/commands/reference/#hints).