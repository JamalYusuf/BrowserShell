---
title: Security
description: Security model and vulnerability reporting for BrowserShell.
weight: 30
---

## Reporting vulnerabilities

**Do not open public GitHub issues for security vulnerabilities.**

Report privately via [GitHub Security Advisories](https://github.com/jamalyusuf/browsershell/security/advisories/new) or contact the maintainer through GitHub.

We aim to acknowledge reports within 72 hours and provide a timeline within 14 days for confirmed issues.

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x | ✅ |

## Security model

### Local-only execution

- No external servers, analytics, or telemetry
- Config and history stored in `chrome.storage.local`
- Commands execute only on user input

### Script injection

Page commands use `chrome.scripting` to run bundled scripts in the **active tab only**, triggered by explicit commands — never silently.

### Link handling

Clickable list rows use an internal `bs://run/` protocol. Commands are validated against numbered-row patterns before execution. Arbitrary URLs cannot trigger shell commands.

### Destructive operations

`forget` requires confirmation unless `--force` is passed. `--dry-run` previews changes without applying them.

### Download actions

`downloads open` and `downloads show` route through the background service worker with state validation — failed operations surface errors instead of failing silently.

## User recommendations

- Review permissions before installing
- Use `forget --dry-run` before privacy operations
- Assign overlay shortcuts carefully on shared machines
- Build from source and audit `dist/manifest.json` for high-threat environments

## Dependencies

Dependencies are pinned in `package-lock.json`. Run `npm audit` periodically. Report supply-chain concerns through the private security channel.