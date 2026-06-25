---
title: Legal
description: Privacy, permissions, and security documentation for BrowserShell.
weight: 1
---

BrowserShell is local-first and transparent about what it accesses. These pages satisfy Chrome Web Store requirements and help you understand exactly what the extension does.

## Documents

| Document | Description |
|----------|-------------|
| [Chrome Web Store permissions](/legal/chrome-web-store-permissions/) | Complete permission Q&A for Web Store review — every permission, why, when, and what data |
| [Privacy policy](/legal/privacy-policy/) | What data BrowserShell stores, where it lives, and what we never collect |
| [Permissions](/legal/permissions/) | Short summary — which commands use each permission |
| [Security](/legal/security/) | Vulnerability reporting and security model |

## Quick answers

**Does BrowserShell send data to a server?**  
No. Everything runs locally in your browser. Config lives in `chrome.storage.local`.

**Why does it need broad host access?**  
The overlay must inject on every page so `` ` `` works everywhere. Page commands only run when you execute them. See [Chrome Web Store permissions](/legal/chrome-web-store-permissions/).

**Where is the full permission justification for Web Store review?**  
[Chrome Web Store permissions](/legal/chrome-web-store-permissions/) — Q&A for every permission in `manifest.json`.

**How do I report a security issue?**  
Privately, per our [Security policy](/legal/security/). Do not open public GitHub issues for vulnerabilities.

## Open source

BrowserShell is [MIT licensed](https://github.com/jamalyusuf/browsershell/blob/main/LICENSE). Audit the [source on GitHub](https://github.com/jamalyusuf/browsershell) or read the [open source guide](/docs/open-source/).