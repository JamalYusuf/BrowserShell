---
title: Open source
description: BrowserShell is MIT licensed. Source, contributing guide, and project resources on GitHub.
weight: 50
group: Help
---

BrowserShell is fully open source. Inspect the code, run the tests, fork it, or contribute back.

## Repository

| Resource | Link |
|----------|------|
| **GitHub repository** | [github.com/jamalyusuf/browsershell](https://github.com/jamalyusuf/browsershell) |
| **README** | [Project overview & quick start](https://github.com/jamalyusuf/browsershell#readme) |
| **Contributing** | [CONTRIBUTING.md](https://github.com/jamalyusuf/browsershell/blob/main/CONTRIBUTING.md) |
| **Changelog** | [CHANGELOG.md](https://github.com/jamalyusuf/browsershell/blob/main/CHANGELOG.md) |
| **License** | [MIT License](https://github.com/jamalyusuf/browsershell/blob/main/LICENSE) |
| **Security** | [SECURITY.md](https://github.com/jamalyusuf/browsershell/blob/main/SECURITY.md) |
| **Issues** | [Report bugs & request features](https://github.com/jamalyusuf/browsershell/issues) |

{{< tip >}}
Once you push to `main`, the links above go live on GitHub. This site is deployed separately via GitHub Pages.
{{< /tip >}}

## Development

```bash
git clone https://github.com/jamalyusuf/browsershell.git
cd browsershell
npm install
npm test        # 154 tests
npm run build   # outputs dist/
```

Load `dist/` at `chrome://extensions` → Developer mode → Load unpacked.

## Architecture docs

Contributors should read:

- [Architecture](/docs/architecture/) — extension design, command registry, Chrome API layer
- [Command reference](/docs/commands/reference/) — auto-generated from source (86 commands)
- [Permissions](/legal/permissions/) — why each Chrome permission exists

## Contributing

We welcome PRs for:

- New commands and bug fixes
- Documentation improvements (this site or repo `docs/`)
- Test coverage

See [CONTRIBUTING.md](https://github.com/jamalyusuf/browsershell/blob/main/CONTRIBUTING.md) for code style, branch workflow, and PR expectations.

## License

BrowserShell is released under the [MIT License](https://github.com/jamalyusuf/browsershell/blob/main/LICENSE). Use it, modify it, ship it in your own projects — just keep the license notice.