---
title: Shell features
description: Pipes, aliases, bang expansions, watch mode, and shell builtins.
weight: 25
group: Guides
---

BrowserShell isn't a command palette — it's a shell. These features make it composable.

## Pipes

Pass stdout from one command to stdin of the next:

```bash
tabs | grep youtube
history search react | head
cat /current/content.txt | ai summarize
bookmarks | grep -i work
```

The parser handles `|` left-to-right. Filters like `grep`, `head`, `tail`, and `wc` are builtins that operate on piped input.

## Aliases

Define shortcuts in your rc file or inline:

```bash
alias ll='tabs'
alias gh='tab new https://github.com'
alias triage='tabs | grep -v pinned'
alias audit='siteinfo && cookies && permissions'
```

List all aliases: `alias`

Remove: `alias name=` (empty value)

## Environment variables

```bash
export EDITOR=vim
export PROMPT_THEME=dracula
echo $EDITOR
```

Variables persist in config. Referenced during command expansion.

## Bang expansions

Quick substitutions without typing full commands:

| Bang | Expands to |
|------|-----------|
| `!1` | History entry #1 (re-execute) |
| `!gh query` | GitHub search URL |
| `!so error message` | Stack Overflow search |
| `!1 args` | History entry #1 with modified args |

```bash
history search "react hooks"
go !1                    # navigate to first result
!gh useEffect cleanup    # GitHub search
```

## Watch mode

Re-run any command on an interval:

```bash
watch 5 tabs
watch 10 "tabs | grep -i deploy"
watch 3 siteinfo
```

Output refreshes in place. Stop with `watch stop` or start a new watch.

{{< tip >}}
Pair `watch` with `notify` to get alerted when output changes: run a watch, then `notify "check terminal"` manually when needed.
{{< /tip >}}

## Redirection and export

```bash
export /bookmarks/Work > ~/backup.json
cat /notes/ideas.md
source ~/.browsershellrc
```

## Exit codes

Commands return exit codes like Unix:

- `0` — success
- `1+` — error

The executor stores `$?` as the last exit code. Pipelines fail if any stage fails.

## History

- `↑` / `↓` — navigate command history
- `Ctrl+R` — reverse search (like Bash)
- History persists across sessions in config

## Completion

Press `Tab` to complete:

- Command names
- Flags and options
- VFS paths (`/tabs/`, `/bookmarks/Work/`)
- Bookmark and history entries (context-dependent)

Double-tab shows all matches when ambiguous.