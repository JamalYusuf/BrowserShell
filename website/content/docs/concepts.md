---
title: Core concepts
description: How BrowserShell thinks — commands, resources, overlay, and the virtual filesystem.
weight: 10
group: Getting started
---

BrowserShell applies four decades of shell design to the browser. Understanding these concepts makes everything click.

## The overlay

BrowserShell is not a new tab. It's a **Quake-style terminal** injected over whatever page you're on.

- Press `` ` `` (backtick) to toggle
- The page underneath stays loaded and visible
- The terminal runs in a sandboxed iframe
- Close it and you're exactly where you were

This matters because context switches kill flow. BrowserShell keeps you on the page while giving you full browser control.

## Commands, not menus

Every browser capability is a **command** with a name, usage string, examples, and a `man` page.

```bash
tabs                    # list open tabs
tab switch 3            # focus tab 3
go github.com           # navigate
history search react    # search history
```

Commands are discoverable:

| Tool | Purpose |
|------|---------|
| `help` | Categorized command list |
| `man <cmd>` | Full manual with examples |
| `apropos <word>` | Search by keyword |
| `search <query>` | Fuzzy command suggestions |
| `Tab` | Auto-complete command names and flags |

## The virtual filesystem

Browser resources are exposed as **paths**:

```text
/
├── tabs/           # open tabs
├── bookmarks/      # bookmark tree
├── history/        # browsing history
├── downloads/      # download metadata
├── current/        # symlink → active tab
├── config/         # shell settings
├── transcript/     # session logs
├── notes/          # user notes
└── audit/          # command audit log
```

Use familiar shell commands:

```bash
ls /tabs
cd /bookmarks/Work
cat /current/url.txt
open /bookmarks/Dev/ReadLater
```

## Pipes and composition

Output flows between commands:

```bash
tabs | grep youtube
history search react | head
cat /current/content.txt | ai summarize
```

The executor parses pipelines left-to-right, passing stdout as stdin to the next command.

## Clickable lists

Many commands output **numbered rows**. In the terminal, these rows are clickable:

```bash
downloads
#  File                     Size
1  report.pdf               2.1 MB    ← click → downloads show 1
2  data.csv                 840 KB    ← click → downloads show 2
```

Clicking runs the follow-up command. It's a TUI pattern — list, select, act — without leaving the shell.

## Context and state

Some commands set **context** for follow-ups:

| List command | Follow-up |
|-------------|-----------|
| `links` | `link 3` |
| `inputs` | `input focus 2` |
| `history search x` | `go <url>` or `history delete 1` |
| `downloads` | `downloads show 1` |
| `extensions` | `extensions disable 2` |

The latest list is always in context. Numbered commands resolve against it.

## Local-only execution

- No servers, no accounts, no telemetry
- Config in `chrome.storage.local`
- Commands run only when you type them
- Page scripts inject only on explicit page commands

See [Privacy policy](/legal/privacy-policy/) and [Permissions](/legal/permissions/).

## What's next

- [Superuser guide](/docs/superuser/) — power workflows
- [Shell features](/docs/shell-features/) — aliases, watch, bang expansions
- [Virtual filesystem](/docs/vfs/) — deep dive on paths