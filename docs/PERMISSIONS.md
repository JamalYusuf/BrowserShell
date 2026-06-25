# Permissions

BrowserShell requests permissions only to expose browser capabilities as shell commands. No background tracking or data exfiltration.

**Chrome Web Store review:** [website/content/legal/chrome-web-store-permissions.md](../website/content/legal/chrome-web-store-permissions.md) — complete Q&A for every permission.

## Host permissions

### `<all_urls>`

Required for the Quake-style overlay on any page and for page commands (`links`, `click`, `fill`, `read`, …) and Vimium-style hotkeys that inject scripts into the active tab.

## API permissions

| Permission | Used by |
|------------|---------|
| `tabs`, `activeTab` | `tabs`, `tab`, `go`, `open`, `reload`, navigation, window layout |
| `sessions` | `recent`, `session`, `tab-restore` (global hotkey `X`), `workspace load` |
| `bookmarks` | `bookmarks`, `bookmark`, omnibar (`b`/`o`) |
| `history` | `history`, `forget`, omnibar |
| `downloads` | `downloads` |
| `cookies` | `cookies`, `siteinfo`, `forget` |
| `browsingData` | `forget`, `siteinfo` |
| `contentSettings` | `permissions` |
| `management` | `extensions` |
| `scripting` | Page interaction, dev commands, `hints`, seek overlay |
| `storage` | Config, aliases, history, notes, workspaces |
| `notifications` | `notify` |
| `system.display` | `layout`, `split`, `window position`, `workspace` |

All data stays in `chrome.storage.local` on your device.

See also: [website permissions](https://jamalyusuf.github.io/BrowserShell/legal/chrome-web-store-permissions/) for Chrome Web Store review notes.