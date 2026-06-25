---
title: Chrome Web Store permissions
description: Complete permission justification for Chrome Web Store reviewers — what BrowserShell requests, why, when it is used, and what data is accessed.
weight: 5
---

This page answers the permission and privacy questions Chrome Web Store reviewers and users ask about BrowserShell. It maps every declared permission in `manifest.json` to concrete user actions.

**Summary:** BrowserShell is a local-first terminal overlay for Chrome. It does not run remote code, does not send user data to any server, and does not use permissions unless you run a command or press a shortcut that requires them.

---

## Single purpose

**What does this extension do?**

BrowserShell adds a Quake-style terminal overlay and Vimium-style page hotkeys so you can manage tabs, bookmarks, history, downloads, windows, and page content through shell commands instead of Chrome menus.

**Is there one clear purpose?**

Yes: **browser control through a keyboard-driven shell interface.** Every permission supports that purpose — listing tabs, reading bookmarks, clearing site data on request, tiling windows, or inspecting the active page when you run a command.

---

## Data collection & remote code

### Does BrowserShell collect or transmit personal data?

**No.** There are no analytics endpoints, no accounts, no telemetry SDKs, and no background sync to external servers.

### Where is data stored?

| Data | Location |
|------|----------|
| Settings, aliases, rc file, history | `chrome.storage.local` on your device |
| Notes and scripts | `chrome.storage.local` (VFS paths `/notes/`, `/scripts/`) |
| Workspaces | `chrome.storage.local` |
| Session transcript / audit log | `chrome.storage.local` |

See the [Privacy policy](/legal/privacy-policy/).

### Does BrowserShell execute remote code?

**No.** All JavaScript is bundled in the extension package at build time. The extension does not `eval()` remote scripts, load code from a CDN at runtime, or fetch executable logic from third-party servers.

### Does BrowserShell use third-party AI services?

The optional `ai` command uses **Chrome's built-in on-device AI APIs** when available. No page content is sent to BrowserShell-operated servers.

---

## Host permissions

### Why does BrowserShell need `<all_urls>`?

| Question | Answer |
|----------|--------|
| **What is it?** | Permission to inject the extension's content script on http(s) pages and extension-accessible URLs. |
| **Why needed?** | The overlay must open on any page when you press `` ` ``. Vimium-style hotkeys (`f`, `j`, `/`, `o`, …) run in the content script on the active page. |
| **When triggered?** | On every page load the content script registers (declared in `manifest.json`). Hotkeys and overlay toggle only respond to **your** key presses. |
| **What data is accessed?** | The DOM of the page you are viewing — only when you run page commands (`links`, `read`, `click`, …) or page hotkeys. |
| **Is data uploaded?** | **No.** DOM access stays in your browser. |
| **Can it be narrower?** | No — users expect `` ` `` and page keys to work on any site they visit. You can disable hotkeys per host in Options → Page keys → Disabled hosts. |

### Why are `web_accessible_resources` declared?

The overlay terminal loads `overlay/index.html` inside an iframe on the current page. These resources are extension-local UI assets, not remote content.

---

## API permissions (Q&A)

Each section follows the same format: **what**, **why**, **when used**, **data accessed**, **uploaded?**

### `tabs`

| | |
|---|---|
| **What** | Read and modify tab properties: URL, title, index, pinned state, muted state, active tab. |
| **Why** | Core shell commands operate on tabs as first-class objects. |
| **When used** | `tabs`, `tab`, `go`, `open`, `close`, `pin`, `discard`, `domain`, `title`, `mute`, `detach`, global hotkeys (`t`, `x`, `J`, `K`, …), omnibar tab search. |
| **Data** | Tab metadata in the current profile. |
| **Uploaded?** | No. |

### `activeTab`

| | |
|---|---|
| **What** | Temporary access to the active tab when the user invokes the extension. |
| **Why** | Chrome grants scoped access when you click the extension icon or use a shortcut, reducing blanket access when combined with user gesture flows. |
| **When used** | Extension icon click (overlay toggle), `chrome://extensions/shortcuts` commands. |
| **Data** | Active tab only at invocation time. |
| **Uploaded?** | No. |

### `storage`

| | |
|---|---|
| **What** | Read/write `chrome.storage.local`. |
| **Why** | Persist configuration, command history, notes, workspaces, and transcripts across sessions. |
| **When used** | Every session; `config`, `alias`, `export`, `edit`, `workspace`, VFS paths under `/config/`, `/notes/`, `/scripts/`. |
| **Data** | User preferences and files you create in the VFS. |
| **Uploaded?** | No. Stays on device. |

### `bookmarks`

| | |
|---|---|
| **What** | Read, create, modify, and remove bookmarks. |
| **Why** | Expose the bookmark tree as navigable paths (`/bookmarks/`) and shell commands. |
| **When used** | `bookmarks`, `bookmark`, `open /bookmarks/...`, omnibar bookmark search (`b`/`B`). |
| **Data** | Bookmark URLs, titles, and folder structure. |
| **Uploaded?** | No. |

### `history`

| | |
|---|---|
| **What** | Search and delete browsing history entries. |
| **Why** | `history` command and omnibar history source. |
| **When used** | `history`, `history delete`, `history clear`, omnibar (`o`/`O`), optional `forget` scope. |
| **Data** | URLs and visit metadata in local history. |
| **Uploaded?** | No. |

### `sessions`

| | |
|---|---|
| **What** | Access recently closed tabs and windows for restoration. |
| **Why** | Undo closed tabs from the shell and Vimium-style `X` hotkey. |
| **When used** | `recent`, `session`, `tab-restore` hotkey, `workspace load` (may restore windows). |
| **Data** | Recently closed session entries managed by Chrome. |
| **Uploaded?** | No. |

### `downloads`

| | |
|---|---|
| **What** | List downloads, open files, show in file manager, remove download entries. |
| **Why** | `downloads` command and clickable download rows. |
| **When used** | `downloads`, `downloads open`, `downloads show`, `watch downloads`. |
| **Data** | Download filenames, URLs, paths, and state. |
| **Uploaded?** | No. |

### `cookies`

| | |
|---|---|
| **What** | Read and remove cookies for origins. |
| **Why** | Inspect site footprint and support privacy workflows. |
| **When used** | `cookies`, `siteinfo`, `forget` (cookie scope). |
| **Data** | Cookie names, values, domains for sites you query. |
| **Uploaded?** | No. |

### `browsingData`

| | |
|---|---|
| **What** | Clear cache, local storage, IndexedDB, service workers, and related site data. |
| **Why** | `forget` command — user-initiated privacy cleanup. |
| **When used** | `forget`, `forget --preset`, `siteinfo` (size estimates). |
| **Data** | Affected origins are chosen by **you** in the command. |
| **Uploaded?** | No. Deletion is local. |

### `contentSettings`

| | |
|---|---|
| **What** | Read per-site permission settings (cookies, JavaScript, images, etc.). |
| **Why** | `permissions` command shows effective site settings. |
| **When used** | `permissions`, `siteinfo`. |
| **Data** | Content setting values for the current site or a named origin. |
| **Uploaded?** | No. |

### `management`

| | |
|---|---|
| **What** | List installed extensions and their enabled state. |
| **Why** | `extensions` command for power users managing the browser profile. |
| **When used** | `extensions`, `extensions disable`. |
| **Data** | Extension names, IDs, and enabled flags. |
| **Uploaded?** | No. |

### `scripting`

| | |
|---|---|
| **What** | Inject JavaScript into tabs to read or manipulate the DOM. |
| **Why** | Page commands and dev tools (`links`, `click`, `fill`, `read`, `shot`, …) run only when you execute them. |
| **When used** | Any `page` or `utility` command that touches the DOM; `hints`; seek/find overlay; not on a timer or in the background. |
| **Data** | DOM text, links, form fields, and media on the **active tab** at command time. |
| **Uploaded?** | No. |
| **User control** | Commands are explicit. Page hotkeys are user-triggered key presses. |

### `notifications`

| | |
|---|---|
| **What** | Show system notifications. |
| **Why** | `notify` command for async workflow feedback. |
| **When used** | Only when you run `notify "message"`. |
| **Data** | Text you pass to the command. |
| **Uploaded?** | No. |

### `system.display`

| | |
|---|---|
| **What** | Read monitor dimensions and work areas. |
| **Why** | Accurate multi-window tiling — `layout`, `split`, `window position`. |
| **When used** | `layout side-by-side`, `split vertical`, workspace geometry restore. |
| **Data** | Display size and work area bounds (not screen contents). |
| **Uploaded?** | No. |

---

## Content scripts

### Why is a content script injected on all pages?

The manifest declares `content/overlay.js` at `document_idle` on `<all_urls>` so that:

1. The `` ` `` overlay toggle works immediately on any page.
2. Vimium-style hotkeys are available without a separate extension.
3. The page receives keyboard focus for hotkeys on load (no extra click).

The content script does **not** modify page content, read the DOM, or exfiltrate data until you press a bound key or open the overlay.

---

## Permissions BrowserShell does **not** request

| Not requested | Why users might ask |
|---------------|---------------------|
| `geolocation` | Location is not part of the shell model. |
| `microphone` / `camera` | No audio/video capture features. |
| `identity` | No OAuth or Google account linking. |
| `webRequest` / `declarativeNetRequest` | No network interception or ad blocking. |
| `clipboardRead` (permission) | Clipboard access uses optional APIs in user gesture contexts (`yy`, `shot`). |
| `nativeMessaging` | No native app bridge. |
| `sidePanel` | Uses a custom full-page overlay instead. |

---

## User controls

- **Disable page hotkeys:** Options → Page keys → Global hotkeys off, or add hosts to Disabled hosts.
- **Disable overlay:** Options → Overlay → Enabled off.
- **Audit permissions:** Build from source and inspect `dist/manifest.json`.
- **Revoke everything:** Remove the extension from `chrome://extensions`.

---

## Related documents

- [Permissions overview](/legal/permissions/) — shorter user-facing summary
- [Privacy policy](/legal/privacy-policy/)
- [Security policy](/legal/security/)
- [Command reference](/docs/commands/reference/) — which commands use which APIs