# Security Policy

BrowserShell is a Chrome extension with broad permissions (`<all_urls>`, `browsingData`, `cookies`, `scripting`, etc.). We take security seriously and welcome responsible disclosure.

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Instead, report privately by emailing the maintainer (see GitHub profile for contact) or opening a [GitHub Security Advisory](https://github.com/jamalyusuf/browsershell/security/advisories/new) if enabled on the repository.

Include:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment (what an attacker could do)
- Chrome version and BrowserShell version
- Any suggested fix (optional)

We aim to acknowledge reports within 72 hours and provide a fix or mitigation timeline within 14 days for confirmed issues.

## Security model

### What BrowserShell does

- Runs entirely **locally** in your browser — no external servers, analytics, or telemetry
- Stores config, aliases, and history in `chrome.storage.local` on your device
- Injects a sandboxed overlay iframe and page scripts only to implement shell commands you run
- Uses `chrome.scripting` to execute page interaction commands (`links`, `click`, `fill`, etc.) on the active tab

### What BrowserShell does not do

- Collect or transmit browsing data to third parties
- Execute commands without user input (no remote code execution)
- Modify pages silently — the overlay is user-toggled

### Permission surface

Each permission is tied to explicit commands. See [docs/PERMISSIONS.md](docs/PERMISSIONS.md) for the full mapping.

High-risk capabilities:

| Capability | Commands | Notes |
|------------|----------|-------|
| Site data deletion | `forget` | Requires confirmation unless `--force`; supports `--dry-run` |
| Cookie access | `cookies`, `forget`, `siteinfo` | Read-only listing; deletion via `forget` |
| Page script injection | `links`, `click`, `fill`, `read`, … | Runs only when you execute a command |
| Extension management | `extensions` | Lists installed extensions; enable/disable/options |

### Link handling

Clickable list rows use a custom `bs://run/` protocol handled internally — commands are not passed to arbitrary URLs. OSC-8 hyperlinks are disabled for list rows to avoid xterm underline issues; the link provider validates row patterns before execution.

## Best practices for users

- Review permissions before installing
- Use `forget --dry-run` before destructive privacy commands
- Assign overlay toggle shortcuts carefully on shared machines
- Build from source and audit `dist/manifest.json` if you have heightened threat requirements

## Dependency security

Dependencies are pinned in `package-lock.json`. Run `npm audit` periodically. Report supply-chain concerns through the same private channel.