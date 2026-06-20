---
title: Permissions
description: Why BrowserShell needs each Chrome permission — required transparency for Web Store reviewers and users.
weight: 20
---

BrowserShell requests permissions to expose browser capabilities as shell commands. **No permission is used for background tracking or data exfiltration.**

## Host permissions

### `<all_urls>`

| | |
|---|---|
| **Why** | The Quake-style overlay must appear on any page. Page commands (`links`, `click`, `fill`, `read`) inject scripts into the active tab. |
| **Triggered by** | Pressing `` ` `` to open overlay; running any page/* command |
| **Not used for** | Silent modification, tracking, or data upload |

---

## API permissions

### `tabs` + `activeTab`

List, switch, pin, discard, and navigate tabs.

**Commands:** `tabs`, `tab`, `go`, `open`, `reload`, `back`, `forward`, `close`, `title`, `pin`, `unpin`, `discard`, `domain`, `mute`, `find`

### `sessions`

Restore closed windows and tabs.

**Commands:** `recent`, `session`

### `bookmarks`

Read and modify bookmarks.

**Commands:** `bookmarks`, `bookmark`

### `history`

Search and delete browsing history.

**Commands:** `history`, `forget` (optional history component)

### `downloads`

List, open, and reveal downloaded files.

**Commands:** `downloads`

### `cookies`

Read cookies for inspection and deletion.

**Commands:** `cookies`, `siteinfo`, `forget`

### `browsingData`

Clear cache, storage, and site data.

**Commands:** `forget`, `siteinfo`

### `contentSettings`

Inspect per-site permission settings.

**Commands:** `permissions`

### `management`

List and manage installed extensions.

**Commands:** `extensions`

### `scripting`

Inject scripts for DOM interaction on the active tab.

**Commands:** `links`, `link`, `inputs`, `input`, `click`, `fill`, `press`, `pick`, `read`, `shot`, `images`, `image`, `meta`, `seek`, `scroll`, `zoom`, `volume`, `audible`, `tech`, `reqs`, `frames`, `viewport`, `jsonld`, `perf`, and related dev commands

### `storage`

Persist configuration, aliases, history, transcript, notes, and audit log locally.

**Commands:** `config`, `alias`, `export`, `source`, and all commands (history persistence)

### `notifications`

Show desktop notifications.

**Commands:** `notify`

---

## Data storage

All stored data remains in `chrome.storage.local` on your device. See [Privacy Policy](/legal/privacy-policy/).

## Minimizing risk

- Use `forget --dry-run` before destructive privacy commands
- Review `siteinfo` before clearing site data
- Build from source and inspect `dist/manifest.json` if auditing
- Uninstall the extension to revoke all permissions