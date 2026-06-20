# Contributing to BrowserShell

Thank you for your interest in contributing. BrowserShell is designed to be extended through commands, VFS providers, and shell primitives — contributions in any of those areas are especially valuable.

## Getting started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Load `dist/` as an unpacked extension in Chrome (see [README.md](README.md))
5. Run tests before submitting: `npm test`

## Development workflow

```bash
npm run dev          # watch mode — reload extension after changes
npm test             # full test suite
npm run typecheck    # TypeScript strict check
npm run generate-docs  # update docs/COMMANDS.md after adding commands
npm run sync-website   # sync command reference to Hugo site
npm run website        # preview site at localhost:1313
```

## Adding a new command

Commands are the primary extension point. Every command must include metadata for help, man pages, and completion.

1. **Create the handler** in `src/commands/<category>/<name>.ts`:

```typescript
import { defineCommand } from '../define';
import { ok } from '@/shared/types';

export const mycommand = defineCommand({
  name: 'mycommand',
  description: 'Short one-line description',
  usage: 'mycommand [options] <arg>',
  examples: ['mycommand', 'mycommand --flag value'],
  category: 'utility',
  seeAlso: ['help', 'man'],
  async handler(args, ctx) {
    return ok('Hello from mycommand\n');
  },
});
```

2. **Register** in `src/commands/manifest.ts` (import + add to `commandManifest` array)
3. **Update the test fixture** in `tests/fixtures/expected-commands.ts`
4. **Add tests** if the command has non-trivial logic
5. **Regenerate docs**: `npm run generate-docs`

### Command categories

| Category | Purpose |
|----------|---------|
| `builtin` | Shell primitives (`ls`, `alias`, `grep`, …) |
| `navigation` | URL navigation (`go`, `open`, `back`, …) |
| `tabs` | Tab management |
| `bookmarks` | Bookmark operations |
| `history` | Browsing history |
| `ai` | Chrome built-in AI integration |
| `utility` | Config, watch, overlay, session, … |

Page interaction, dev, privacy, and downloads commands use folder groupings but share the above categories in their `defineCommand` metadata.

## Code style

- **TypeScript strict mode** — no `any` without justification
- **Match existing patterns** — read neighboring commands before adding new ones
- **Focused diffs** — one command or one fix per PR when possible
- **No drive-by refactors** — keep changes scoped to the task
- **Tests required** for parser, shell, and command logic changes

## Pull request checklist

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] New commands added to `expected-commands.ts` and `manifest.ts`
- [ ] `npm run generate-docs` run if commands changed
- [ ] No secrets, API keys, or personal paths committed

## Reporting issues

- **Bugs** — use the bug report template; include Chrome version, steps to reproduce, and expected behavior
- **Security** — do **not** open public issues; see [SECURITY.md](SECURITY.md)
- **Feature requests** — describe the use case and proposed command syntax

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful and constructive.