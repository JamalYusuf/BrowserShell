---
title: Superuser guide
description: Power workflows for people who live in the terminal.
weight: 20
group: Guides
---

BrowserShell rewards users who think in pipelines, aliases, and keyboard shortcuts. This guide covers workflows that replace multi-click UI journeys with a single prompt.

## Philosophy

1. **Lists are actions** — numbered output rows are clickable. Run a list command, click a row.
2. **Everything pipes** — stdout from one command feeds the next.
3. **Bang expansions** — `!gh react` becomes a GitHub search URL. `!1` replays history entry 1.
4. **Watch mode** — poll any command on an interval.

---

## Tab and window mastery

### Triage 30 tabs in seconds

```bash
tabs | grep -i youtube          # find distractions
tab discard 4                   # unload tab from memory
tab pin 2                       # pin the keeper
windows                         # see all windows
window focus 2                  # jump windows
recent                          # restore what you just closed
recent restore 1                # click row 1 works too
```

### Domain sweep

```bash
domain github.com               # list all GitHub tabs
tab close 3                     # close by index from last tabs output
detach                          # pop tab to new window
```

### Audio control

```bash
mute                            # mute active tab
tabs | grep audible             # find noisy tabs
```

---

## Navigation without the mouse

```bash
go github.com/trending          # navigate active tab
open /bookmarks/Dev/ReadLater   # open VFS path
back                            # history navigation
qf                              # query current URL fragments
here                            # print current URL
reload --hard                   # bypass cache
```

### Bang expansions

```bash
!gh distributed systems         # → GitHub search URL
!so typescript generics         # → Stack Overflow search
!1                              # re-run history entry #1
```

---

## Page inspection (the web as data)

```bash
links                           # all links on page — click to follow
link 3                          # follow link #3
inputs                          # form fields
input focus 2                   # focus field #2
fill 1 "hello@example.com"      # fill by index
read                            # page text content
meta                            # meta tags
tech                            # detect frameworks
reqs                            # network requests (dev)
shot                            # screenshot to clipboard
```

### Research pipeline

```bash
history search "webgpu"
go !1
links | grep -i docs
link 1
ai summarize --length short
```

---

## Privacy and site control

```bash
siteinfo                        # footprint: cookies, storage, permissions
siteinfo --compare google.com  # compare two sites
cookies                         # list cookies for current site
permissions                     # effective content settings
forget --dry-run                # preview what would be deleted
forget --preset work            # use a named preset from options
```

**Always dry-run first.** `forget` is destructive.

---

## Downloads and files

```bash
downloads                       # recent downloads — click row to reveal in Finder
downloads show 1                # reveal in file manager
downloads open 1                # launch file
```

---

## Monitoring and automation

```bash
watch 5 tabs                    # refresh tab list every 5s
watch 10 "tabs | grep -i deploy"  # monitor deploy tabs
notify "Build done"             # desktop notification
log tail /audit/session.log     # follow audit log
```

Stop watch: `watch stop` or `Ctrl+C` during a watch tick.

---

## Aliases that stick

Add to your rc file or run directly:

```bash
alias ll='tabs'
alias gh='tab new https://github.com'
alias hn='go news.ycombinator.com'
alias triage='tabs | grep -v pinned'
alias audit='siteinfo && cookies && permissions'
```

List aliases: `alias`

---

## VFS power moves

```bash
ls /transcript                  # session transcripts
cat /notes/ideas.md             # user notes
ls /audit                       # command audit log
export /bookmarks/Work > ~/backup.json   # export paths
```

---

## Extension management

```bash
extensions                      # list installed extensions
extensions disable 2            # by index from list
```

---

## AI integration (today)

Uses Chrome's built-in AI when available:

```bash
ai summarize                    # summarize current page
ai summarize --length short     # terse summary
cat /current/content.txt | ai summarize
ai explain "TypeError at line 42"
```

This is the foundation for the [AI-native shell](/future/#ai-native-shell) vision — commands as the interface agents use to act on the browser.