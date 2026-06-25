---
title: Workspaces & window layout
description: Tile windows, split views, and save multi-window layouts with layout, split, workspace, and workview.
weight: 33
group: Guides
---

BrowserShell can position Chrome windows on your displays and save entire multi-window setups for later restoration.

**Requires:** `system.display` permission (monitor work areas for accurate geometry).

## Window layout

`layout` tiles existing windows without opening new ones.

```bash
layout side-by-side          # two windows, 50/50
layout main-left 60%         # primary window 60% left
layout top-bottom            # stack vertically
layout left                  # active window left half
layout right 1 2             # window 1 left, window 2 right
layout full                  # maximize active window
layout reset                 # remove stored geometry
```

Typical workflow:

```bash
windows                      # list windows with indices
layout side-by-side          # tile two windows on current display
layout main-left 70%         # reading layout: wide left pane
```

## Split view

`split` opens a URL in a second window and tiles both.

```bash
split vertical               # current tab left, new pane right
split vertical https://docs.example.com
split horizontal github.com
split v about:blank --side left
```

Alias: `split v` = vertical, `split h` = horizontal.

## Named workspaces

Save and restore full browser setups (windows, tabs, positions).

```bash
workspace list
workspace save research      # snapshot all windows + geometry
workspace load research      # restore layout and tabs
workspace delete old -f
workview save coding         # alias for workspace
workview load coding
```

Workspaces persist in `chrome.storage.local`. Paths are also available under the VFS:

```bash
ls /config/workspaces/
cat /config/workspaces/research.json
```

## Combine with shell commands

```bash
# Research setup
layout main-left 65%
tab new https://scholar.google.com
split vertical /current/url.txt   # docs in right pane
workspace save deep-work

# Restore tomorrow
workspace load deep-work
```

## Tab process commands

Unix-style tab management complements layouts:

```bash
ps                           # tabs as processes (PID = tab ID)
ps aux
top                          # live tab list
kill 3                       # close tab #3 from ps output
kill 142857 -9               # force close by tab ID
pkill youtube                # close tabs matching URL/title
pkill ads --dry-run
renice 3 -5                  # pin-like priority (pins tab)
```

See [Command reference](/docs/commands/reference/) for full flag lists.

## Related

- [Keyboard shortcuts](/docs/keyboard-shortcuts/) — `layout` binds via `<leader>s` in default rc
- [Permissions](/legal/chrome-web-store-permissions/) — why `system.display` is needed