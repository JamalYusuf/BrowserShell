---
title: Legal
description: Privacy, permissions, and security documentation for BrowserShell.
weight: 1
---

BrowserShell is local-first and transparent about what it accesses. These pages satisfy Chrome Web Store requirements and help you understand exactly what the extension does.

## Documents

| Document | Description |
|----------|-------------|
| [Privacy policy](/legal/privacy-policy/) | What data BrowserShell stores, where it lives, and what we never collect |
| [Permissions](/legal/permissions/) | Why each Chrome permission exists and which commands use it |
| [Security](/legal/security/) | Vulnerability reporting and security model |

## Quick answers

**Does BrowserShell send data to a server?**  
No. Everything runs locally in your browser. Config lives in `chrome.storage.local`.

**Why does it need broad host access?**  
The overlay must inject on every page so `` ` `` works everywhere. Page commands only run when you execute them. See [Permissions](/legal/permissions/).

**How do I report a security issue?**  
Privately, per our [Security policy](/legal/security/). Do not open public GitHub issues for vulnerabilities.

## Open source

BrowserShell is [MIT licensed](https://github.com/jamalyusuf/browsershell/blob/main/LICENSE). Audit the [source on GitHub](https://github.com/jamalyusuf/browsershell) or read the [open source guide](/docs/open-source/).