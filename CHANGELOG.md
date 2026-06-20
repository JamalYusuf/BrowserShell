# Changelog

All notable changes to BrowserShell are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-19

### Added

- Quake-style terminal overlay on any page (`` ` `` toggle)
- 86 shell commands across navigation, tabs, windows, bookmarks, history, downloads, page interaction, dev tools, and privacy
- Virtual filesystem (`/tabs`, `/bookmarks`, `/history`, `/downloads`, `/transcript`, `/notes`, `/audit`, …)
- Shell features: pipes, aliases, bang expansions, tab completion, reverse history search (`Ctrl+R`)
- Clickable numbered list rows with hover highlight
- Options page with themes, fonts, prompt customization, forget presets
- `watch` command for periodic re-execution
- `search` command with fuzzy command suggestions
- `recent` session restore, `overlay` panel control, `permissions` inspector
- Mockable Chrome API layer for testing
- 154 automated tests

### Security

- `forget` command with dry-run and confirmation gates
- Background-routed download open/show actions with state validation
- Documented permission rationale (see `docs/PERMISSIONS.md`)

[0.1.0]: https://github.com/jamalyusuf/browsershell/releases/tag/v0.1.0