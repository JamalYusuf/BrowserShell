---
title: Future
description: Where BrowserShell is headed — packages, site hooks, and AI-native browsing.
---

BrowserShell v1.0 is a working shell with 105 commands. The architecture is deliberately extensible. Here's what's next.

---

## Package system

**Goal:** Extend the shell without forking the extension — Homebrew for browser commands.

```bash
pkg search weather
pkg install weather
pkg update
weather "San Francisco"
```

### Design principles

- Packages are **signed bundles** of commands, VFS providers, and optional page scripts
- Installed to `/packages/<name>/` in the virtual filesystem
- Registry hosted on GitHub (community contributions via PR)
- Sandboxed execution — packages declare required permissions upfront
- `pkg uninstall` removes cleanly

### Why it matters

Today, adding a command requires a TypeScript PR. The package system lets the community ship integrations for Jira, Linear, Gmail, HN, Reddit, internal tools — without waiting for core releases.

---

## Site hooks

**Goal:** Websites expose domain-specific commands when you arrive.

When BrowserShell loads a page, it checks for a site manifest:

```json
{
  "name": "github",
  "commands": {
    "pr": { "usage": "pr list", "handler": "bs://github/pr-list" },
    "issue": { "usage": "issue <n>", "handler": "bs://github/issue" }
  }
}
```

Delivered via:

1. `<link rel="browser-shell" href="/browser-shell.json">` in page HTML
2. Or well-known path: `/.well-known/browser-shell.json`

### What this enables

| Site | Commands |
|------|----------|
| GitHub | `pr list`, `issue 42`, `repo clone` |
| Gmail | `mail unread`, `mail search` |
| Your SaaS | `deploy status`, `logs tail` |
| Internal wiki | `search docs` |

Sites opt in. No hook = generic commands still work (`links`, `read`, `go`).

### Security

- Site manifests can only register commands scoped to their origin
- User confirmation on first activation per site
- Manifests are cached and inspectable via `siteinfo --hooks`

---

## AI-native shell

**Goal:** When AI can interact with the browser, the shell is the API.

Today's `ai summarize` uses Chrome's on-device AI. The next step is bidirectional:

```bash
# You ask
ai "close all YouTube tabs and summarize my last 5 HN articles"

# The agent plans and executes
→ tabs | grep youtube     # 3 tabs found
→ tab close 2; tab close 4; tab close 7
→ history search hackernews | head -5
→ ai summarize (5 pages)
```

### Why a shell, not a chatbot?

| Chatbot | Shell |
|---------|-------|
| Opaque actions | Every step is a visible, editable command |
| Can't compose | Pipes, aliases, scripts |
| No audit trail | `/audit` logs every action |
| Black box | You can interrupt, modify, re-run |

The shell becomes the **integration layer between humans and agents** — agents propose command sequences, humans approve or edit them, the executor runs them deterministically.

### Building blocks (already in v0.1)

- Structured command output (`--json` flags)
- Audit log (`/audit`)
- Transcript (`/transcript`)
- Watch mode for monitoring
- Composable pipes

### Horizon

- **Agent mode:** natural language → command plan → user confirms → execute
- **MCP integration:** BrowserShell as a tool server for external agents
- **Multi-step macros:** record and replay command sequences
- **Context-aware prompts:** AI reads `/current/content.txt` and suggests next commands

---

## Chrome Web Store

Planned listing with:

- [Privacy policy](/legal/privacy-policy/) ✅
- [Permissions rationale](/legal/permissions/) ✅
- [Security policy](/legal/security/) ✅
- Store screenshots and demo video (coming)

---

## Get involved

The roadmap is public and open source. Pick an area:

- **Commands** — add core commands via PR
- **Packages** — help design the `pkg` spec (discussion welcome on GitHub)
- **Site hooks** — prototype `browser-shell.json` on your site
- **AI** — experiment with agent → command translation

[Contributing on GitHub →](https://github.com/jamalyusuf/browsershell/blob/main/CONTRIBUTING.md)