---
title: Virtual filesystem
description: Navigate browser resources as files and directories.
weight: 30
group: Guides
---

BrowserShell maps browser state to a **virtual filesystem**. Use `ls`, `cd`, `cat`, `pwd`, and `open` like a Unix shell.

## Root layout

```bash
ls /
```

```text
tabs/        bookmarks/   history/     downloads/
current@     config/      scripts/     transcript/
notes/       audit/
```

| Path | Contents |
|------|----------|
| `/tabs` | Open tabs as entries |
| `/bookmarks` | Bookmark folder tree |
| `/history` | Browsing history entries |
| `/downloads` | Download metadata |
| `/current` | Symlink to active tab |
| `/config` | Shell configuration files |
| `/scripts` | User scripts |
| `/transcript` | Session transcripts |
| `/notes` | User notes (markdown) |
| `/audit` | Command audit log |

## Navigation

```bash
pwd                         # show current vfs path
cd /bookmarks               # enter bookmarks root
cd Work/Projects            # descend (relative or absolute)
cd ..                       # parent directory
cd /                        # root
```

## Reading files

```bash
cat /current/url.txt        # active tab URL
cat /current/title.txt      # active tab title
cat /current/content.txt    # page text content
cat /config/rc              # startup file
cat /notes/todo.md          # user note
```

Pipe content to other commands:

```bash
cat /current/content.txt | ai summarize
cat /current/content.txt | grep "error"
```

## Opening paths

```bash
open /bookmarks/Work/Project    # open bookmark in new tab
open /tabs/3                    # switch to tab by vfs path
```

## Listing with filters

```bash
ls /tabs
ls /bookmarks/Work
ls /history | head
ls /downloads
```

## Transcript and audit

Every session can be logged:

```bash
ls /transcript
cat /transcript/2026-06-19.txt
ls /audit
log tail /audit/session.log
```

Useful for reviewing what you ran, sharing workflows, or debugging.

## Notes

```bash
echo "idea for feature" >> /notes/ideas.md
cat /notes/ideas.md
```

Notes persist in `chrome.storage.local`.

{{< note >}}
The VFS is virtual — files don't exist on disk. Paths are a uniform interface to browser APIs.
{{< /note >}}