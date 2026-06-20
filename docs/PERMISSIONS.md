# Permissions rationale

BrowserShell requests Chrome permissions to expose browser capabilities as shell commands. **No data leaves your device.** This document explains why each permission exists and which commands use it.

## Host permissions

### `<all_urls>`

**Why:** The Quake-style overlay must inject on any page you visit. Page interaction commands (`links`, `click`, `fill`, `read`, `shot`, etc.) run scripts in the active tab's context.

**Commands affected:** All page/* commands, overlay injection, content script

**Not used for:** Background tracking, data exfiltration, or modifying pages without user action

---

## API permissions

### `tabs` + `activeTab`

Manage and query open tabs.

| Commands | Action |
|----------|--------|
| `tabs`, `tab`, `title`, `pin`, `unpin`, `discard`, `pinned`, `domain` | List, switch, move, pin, discard tabs |
| `go`, `open`, `reload`, `back`, `forward`, `here`, `close` | Navigate active tab |
| `mute`, `find`, `detach` | Window/tab audio and search |

### `sessions`

Restore recently closed windows and tabs.

| Commands | Action |
|----------|--------|
| `recent`, `session` | List and restore closed sessions |

### `bookmarks`

Read and modify the bookmark tree.

| Commands | Action |
|----------|--------|
| `bookmarks`, `bookmark` | List, search, add, open, delete bookmarks |

### `history`

Query and delete browsing history.

| Commands | Action |
|----------|--------|
| `history` | Search, list, delete history entries |
| `forget` | Optional history deletion as part of site data clearing |

### `downloads`

List, open, and show downloads in the file manager.

| Commands | Action |
|----------|--------|
| `downloads` | List, open file, reveal in Finder/Explorer |

### `cookies`

Read cookies for the current site or specified domain.

| Commands | Action |
|----------|--------|
| `cookies` | List cookies |
| `siteinfo` | Privacy footprint analysis |
| `forget` | Cookie deletion |

### `browsingData`

Clear cache, storage, and other site data.

| Commands | Action |
|----------|--------|
| `forget` | Clear site data (with confirmation / dry-run) |
| `siteinfo` | Report stored data types |

### `contentSettings`

Inspect content settings (cookies, JS, images, etc.) per site.

| Commands | Action |
|----------|--------|
| `permissions` | Show effective permissions for a site |

### `management`

List and manage installed extensions.

| Commands | Action |
|----------|--------|
| `extensions` | List, enable, disable, open options |

### `scripting`

Inject JavaScript into tabs for DOM interaction.

| Commands | Action |
|----------|--------|
| `links`, `link`, `inputs`, `input`, `click`, `fill`, `press`, `pick`, `read`, `shot`, `images`, `image`, `meta`, `seek`, `scroll`, `zoom`, `volume`, `audible`, `tech`, `reqs`, `frames`, `viewport`, `jsonld`, `storage` (page), `perf` | Page inspection and interaction |

### `storage`

Persist configuration locally.

| Commands | Action |
|----------|--------|
| `config`, `alias`, `export`, `source` | Settings, aliases, rc files |
| All commands | Command history, transcript, notes, audit log |

### `notifications`

Show system notifications.

| Commands | Action |
|----------|--------|
| `notify` | Display a notification |

---

## Data storage

All user data is stored in `chrome.storage.local`:

| Key | Contents |
|-----|----------|
| `config` | Theme, prompt, aliases, env, forget presets |
| `history` | Command history (shell input, not browsing history) |
| `transcript` | Optional session transcript |
| `notes` | User notes |
| `audit` | Command audit log |

No sync to external servers. No analytics SDKs.

---

## Minimizing permission risk

- Run `forget --dry-run` before destructive operations
- Review `siteinfo` output before clearing site data
- Build from source and inspect `dist/manifest.json` if auditing
- Report concerns via [SECURITY.md](../SECURITY.md)