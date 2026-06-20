---
title: Demo walkthroughs
description: Step-by-step explanations of real BrowserShell workflows.
weight: 15
group: Guides
---

Each demo below mirrors the interactive scenarios on the [homepage](/#demos). Run these yourself after installing.

---

## Tab triage on Hacker News

**Scenario:** You have 40 tabs open. You're on HN. Find the Show HN thread and explore its links.

```bash
tabs | grep -i hn
```

Lists only Hacker News tabs. The `grep` builtin filters stdout — same as Unix.

```bash
tab switch 2
```

Switches to tab #2 from the list above. No mouse.

```bash
links | head
```

Lists links on the current page. Row 1 is `comments`. Row 2 is `past`.

```bash
link 1
```

Follows link #1. Or click the row directly.

{{< tip >}}
Combine with `watch 5 "tabs | grep -i deploy"` to monitor CI tabs during a release.
{{< /tip >}}

---

## Privacy audit on a tracker-heavy site

**Scenario:** A site feels slow. You want to know what it's storing before clearing anything.

```bash
siteinfo
```

One-line footprint: cookies, storage size, script count, permissions.

```bash
cookies | head
```

Lists cookies by name and domain. No DevTools dig required.

```bash
permissions
```

Shows effective content settings: JS, images, cookies, popups.

```bash
forget --dry-run
```

**Always start here.** Shows what would be deleted without touching anything.

```bash
forget --preset strict
```

Applies a named preset from your options page. Requires confirmation.

{{< warning >}}
`forget` is destructive. Use `--dry-run` first. Without `--force`, you'll be asked to confirm.
{{< /warning >}}

---

## Research flow on arXiv

**Scenario:** You read a paper last week. Find it, summarize it, extract links.

```bash
history search "transformer"
```

Searches browsing history. Row 1 shows the paper.

```bash
go !1
```

Navigates to history entry #1. Bang `!N` replays history by index.

```bash
read | head -20
```

Extracts page text. Pipes first 20 lines.

```bash
ai summarize --length short
```

Summarizes via Chrome's built-in AI (when available). No external API.

---

## Dev inspection on localhost

**Scenario:** You're debugging a local app. Check stack, network, forms.

```bash
tech
```

Detects frameworks: React, Next.js, Vue, etc.

```bash
reqs | grep api
```

Lists network requests filtered to API calls.

```bash
inputs
```

Lists form fields with type and name.

```bash
fill 1 "dev@example.com"
```

Fills field #1. Pair with `press Enter` or `click` for full form automation.

---

## Try them all

```bash
git clone https://github.com/jamalyusuf/browsershell.git
cd browsershell && npm install && npm run build
```

Load `dist/` at `chrome://extensions`. Press `` ` ``. Pick a demo. Run the commands.