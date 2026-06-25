---
title: Page commands
description: Inspect and interact with the current page DOM from the shell.
weight: 35
group: Guides
---

Page commands run scripts in the **active tab** to read and manipulate the DOM. They only execute when you type them.

## Discovery

```bash
links           # all links with href
hints           # Vimium-style link hints (or press f on page)
inputs          # form fields
images          # images with src/alt
meta            # meta tags
read            # page text content
seek query      # find on page from shell
tech            # detect frameworks
reqs            # network requests
frames          # iframes
viewport        # viewport dimensions
jsonld          # structured data
```

For keyboard-driven hints and scroll without the terminal, see [Page hotkeys](/docs/page-hotkeys/).

## Interaction

```bash
link 3          # follow link #3 (after links)
input focus 2   # focus field #2 (after inputs)
fill 1 "text"   # fill field #1
press Enter     # press a key
click 1         # click element #1
pick            # interactive element picker
scroll down     # scroll page
zoom 1.2        # zoom level
volume mute     # page audio
shot            # screenshot to clipboard
```

## Dev inspection

```bash
tech            # React, Vue, Next.js, etc.
reqs            # XHR/fetch requests
reqs | grep api # filter requests
perf            # performance timing
env             # page environment
storage         # localStorage/sessionStorage
cookies         # page cookies
frames          # iframe listing
```

## Typical workflows

### Extract all links to a file

```bash
links > /notes/page-links.txt
```

### Fill a login form

```bash
inputs
fill 1 "user@example.com"
fill 2 "password"
press Enter
```

### Debug API calls

```bash
reqs | grep -E "4[0-9]{2}|5[0-9]{2}"
```

### Screenshot for bug report

```bash
shot
notify "Screenshot copied"
```

## Context pattern

List commands set context for numbered follow-ups:

```bash
links           # sets link context
link 1          # uses context
links           # refreshes context
click 3         # different context
```

{{< warning >}}
Page commands inject scripts via `chrome.scripting`. They run only on your command. Some sites with strict CSP may block injection.
{{< /warning >}}