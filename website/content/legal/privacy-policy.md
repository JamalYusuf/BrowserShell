---
title: Privacy Policy
description: How BrowserShell handles your data. Required for Chrome Web Store listing.
weight: 10
---

**Last updated:** June 19, 2026  
**Effective for version:** 0.1.0

## Summary

BrowserShell **does not collect, transmit, or sell your personal data**. All processing happens locally in your browser. There are no accounts, no analytics, and no external servers.

## Data we access

BrowserShell accesses browser APIs only when **you run a command**. Examples:

| Data | When accessed | Stored? |
|------|---------------|---------|
| Open tabs | `tabs`, `tab` commands | No — read at execution time |
| Bookmarks | `bookmark`, `bookmarks` | No |
| Browsing history | `history` command | No |
| Cookies | `cookies`, `siteinfo`, `forget` | No — unless you export via `export` |
| Downloads | `downloads` command | No |
| Page content | `links`, `read`, `ai` | No — processed in memory |
| Extension list | `extensions` command | No |

## Data we store locally

The following is saved in `chrome.storage.local` on your device only:

| Data | Purpose | Deletable? |
|------|---------|------------|
| Shell configuration | Themes, prompt, hotkeys | Yes — via options or `config` |
| Command history | Shell input history (↑/↓) | Yes — clear in options |
| Aliases & rc file | Custom shortcuts | Yes |
| Transcript | Optional session log | Yes — delete `/transcript` files |
| Notes | User notes in VFS | Yes |
| Audit log | Optional command log | Yes |

You can uninstall the extension to remove all stored data.

## Data sharing

**We do not share data with third parties.** There is no:

- Telemetry or analytics SDK
- Cloud sync (unless you explicitly export files)
- Advertising
- Fingerprinting
- Background data collection

## AI features

The `ai` command uses **Chrome's built-in on-device AI** (Gemini Nano / Prompt API) when available. Page content sent to AI processing stays within Chrome's AI subsystem — BrowserShell does not operate its own AI backend.

## Permissions

BrowserShell requests Chrome permissions to implement shell commands. Each permission maps to explicit user-initiated actions. See the [Permissions](/legal/permissions/) page for full details.

## Children's privacy

BrowserShell is a developer productivity tool not directed at children under 13. We do not knowingly collect data from children.

## Security

Report vulnerabilities privately per our [Security policy](/legal/security/). We do not request passwords, payment information, or government IDs.

## Changes to this policy

We will update this page and the `Last updated` date when practices change. Material changes will be noted in [CHANGELOG](https://github.com/jamalyusuf/browsershell/blob/main/CHANGELOG.md).

## Open source

BrowserShell is MIT licensed. Audit the source at [github.com/jamalyusuf/browsershell](https://github.com/jamalyusuf/browsershell).

## Contact

- **Issues:** [GitHub Issues](https://github.com/jamalyusuf/browsershell/issues)
- **Security:** [Security policy](/legal/security/)