---
title: FAQ
description: Frequently asked questions about BrowserShell.
weight: 90
group: Help
---

## General

### What is BrowserShell?

A Chrome extension that overlays a terminal on any webpage. You manage tabs, bookmarks, history, downloads, and page content through shell commands — like Bash, but for browser resources.

### Who is this for?

- Power users who live in keyboard shortcuts
- Developers who want DevTools-adjacent inspection without opening DevTools
- Anyone tired of hunting through Chrome menus
- People who think the browser should have a shell

### Is it free and open source?

Yes. MIT licensed. [GitHub repository](https://github.com/jamalyusuf/browsershell).

---

## Privacy & security

### Does BrowserShell send data anywhere?

**No.** Zero servers, zero analytics, zero accounts. Everything runs locally. See the [Privacy policy](/legal/privacy-policy/).

### Why does it need `<all_urls>`?

The overlay must inject on every page so `` ` `` works everywhere. Page commands run scripts in the active tab only when you execute them. See [Permissions](/legal/permissions/).

### Is `forget` safe?

Run `forget --dry-run` first. It previews deletions. Confirmation is required unless `--force`. Named presets are configurable in options.

### How do I report a security issue?

Privately, per our [Security policy](/legal/security/). Do not open public issues for vulnerabilities.

---

## Comparisons

### vs. Vimium / Surfingkeys / Shortkeys

Those are **keyboard navigation** layers — follow links, scroll, switch tabs with keys. BrowserShell includes Vimium-style global hotkeys **plus** a full shell with 100+ commands, pipes, VFS, editor, workspaces, and privacy tools.

### vs. Chrome DevTools console

DevTools debugs JavaScript on one page. BrowserShell operates on **browser-level resources** (tabs, windows, bookmarks, history, downloads) and composes commands with pipes.

### vs. Raycast / Alfred

Those are OS-level launchers. BrowserShell is **browser-native** — it has direct access to tabs, history, and page DOM without leaving Chrome.

### vs. Apple Shortcuts / Automator

GUI automation tools. BrowserShell is a **text interface** — scriptable, pipeable, grep-able.

---

## Usage

### Do I need to learn 100+ commands?

No. Start with: `tabs`, `go`, `help`, `man`. Tab completion and `search` suggest commands. `apropos` finds commands by keyword.

### Page hotkeys do not work until I click the page

BrowserShell focuses the page automatically on load and when you switch tabs. If keys still fail, check **Options → Page keys → Global hotkeys** is on, the host is not in **Disabled hosts**, and you are not typing in a text field (insert-mode-auto pauses hotkeys). Reload the extension after changing the rc file.

### Built-in editor — not fully ready yet

The `edit` command is **beta preview** software. Simple editing (arrow keys, type, **Ctrl+S** save, **Esc** exit) works for notes and config, but full Vim-style editing is **not ready yet**. Use an external editor for important files until a future release. If typing fails after customizing `edit-bind` with plain `h/j/k/l`, remove those binds — they intercept keystrokes.

### What are the essential commands?

```bash
tabs          # see open tabs
tab switch N  # focus tab
go URL        # navigate
history search QUERY
bookmark search QUERY
links         # page links
help          # discover more
```

### Can I create shortcuts?

Yes. Aliases in your rc file:

```bash
alias hn='go news.ycombinator.com'
alias triage='tabs | grep -v pinned'
```

### Does it work on all websites?

The overlay works everywhere. Page commands (`links`, `read`, `click`) work on most sites. Some pages with strict CSP may limit script injection.

---

## Development

### How do I add a command?

See [Contributing](https://github.com/jamalyusuf/browsershell/blob/main/CONTRIBUTING.md). Create a handler with `defineCommand()`, register in manifest, add tests.

### Will there be a package system?

Yes — on the roadmap. `pkg install <name>` for community commands. See [Future](/future/).

### Will websites be able to add commands?

Yes — via opt-in `browser-shell.json` manifests. Sites register domain-specific commands when you visit. See [Future → Site hooks](/future/#site-hooks).

---

## Chrome Web Store

### Is it on the Web Store yet?

Not yet. Build from source and load unpacked from `dist/` for now. Privacy policy, permissions docs, and security policy are ready for submission.

### What permissions does it need?

Full Chrome Web Store Q&A: [Chrome Web Store permissions](/legal/chrome-web-store-permissions/). Short summary: [Permissions](/legal/permissions/). Every permission maps to commands you explicitly run — tabs, bookmarks, history, downloads, cookies, scripting, storage, `system.display`, and `<all_urls>` for the overlay and page hotkeys.