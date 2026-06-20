# Architecture

BrowserShell is a Manifest V3 Chrome extension that injects a terminal overlay into web pages and exposes browser APIs as shell commands.

## High-level flow

```
User presses ` (or shortcut)
        │
        ▼
Content script (content/overlay.ts)
  └─ injects <iframe src="overlay/index.html">
        │
        ▼
Overlay page (overlay/index.ts → terminal/host.ts)
  └─ xterm.js terminal + ShellExecutor
        │
        ├─► Chrome API wrapper (chrome/api.ts)
        │     └─ tabs, bookmarks, history, downloads, …
        │
        ├─► Page scripts (page/inject.ts via scripting API)
        │     └─ DOM queries, clicks, form fill on host tab
        │
        └─► Virtual filesystem (vfs/)
              └─ pluggable providers for /tabs, /bookmarks, …
```

The **background service worker** handles extension icon clicks, keyboard commands, and privileged actions (e.g. `chrome.downloads.open`) that cannot run from the overlay iframe.

## Core modules

### Shell (`src/shell/`)

| Module | Role |
|--------|------|
| `parser.ts` | Tokenizes and parses command lines (pipes, redirects, quotes) |
| `executor.ts` | Runs parsed AST: aliases, builtins, pipelines, exit codes |
| `registry.ts` | Command lookup by name |
| `completion.ts` | Tab completion for commands, paths, and flags |
| `output.ts` | ANSI formatting, tables, clickable row styling |
| `clickable-list.ts` | Numbered-row pattern matching for link provider |

### Commands (`src/commands/`)

Each command is a `Command` object created with `defineCommand()`:

```typescript
interface Command {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  category: CommandCategory;
  handler: (args, context) => Promise<CommandResult>;
  getCompletions?: (partial, context) => Promise<string[]>;
}
```

Commands are registered in `manifest.ts` and validated by `tests/command-manifest.test.ts`.

### Chrome API wrapper (`src/chrome/api.ts`)

A single `ChromeAPI` interface implemented by:

- **Production**: thin delegates to `chrome.*` APIs
- **Tests**: in-memory mock with realistic fixtures

This keeps command handlers testable without a live browser.

### Virtual filesystem (`src/vfs/`)

`VirtualFileSystem` routes paths to providers:

| Mount | Provider | Contents |
|-------|----------|----------|
| `/tabs` | TabsProvider | Open tabs as virtual files |
| `/bookmarks` | BookmarksProvider | Bookmark tree |
| `/history` | HistoryProvider | History entries |
| `/downloads` | DownloadsProvider | Download metadata |
| `/current` | CurrentProvider | Symlink to active tab |
| `/config` | ConfigProvider | Shell configuration |
| `/scripts` | ScriptsProvider | User scripts |
| `/transcript` | TranscriptProvider | Session transcript |
| `/notes` | NotesProvider | User notes |
| `/audit` | AuditProvider | Command audit log |

Navigation commands (`cd`, `ls`, `cat`, `open`) use the VFS.

### Terminal host (`src/terminal/host.ts`)

Owns the xterm.js instance and user input loop:

- Prompt rendering with configurable template (`\u@\h:\w$`)
- Input history, reverse search, tab completion UI
- Link provider for clickable list rows
- Routes `bs://run/` URIs and link activations to `runClickCommand()`
- Watch timer for `watch` command intervals

### Content script (`src/content/overlay.ts`)

Injected on `<all_urls>`. Creates a fixed-position iframe loading the overlay bundle. Communicates via `postMessage` for focus, toggle, and close.

### Build pipeline

```
npm run build
  ├─ generate-icons.ts
  ├─ tsc --noEmit
  ├─ vite build (overlay + options)
  ├─ vite build (content script, IIFE)
  ├─ vite build (background service worker)
  ├─ vite build (page inject bundle)
  └─ postbuild.ts → assembles dist/manifest.json
```

`public/manifest.json` is the source of truth for permissions and metadata. `postbuild.ts` adjusts paths for the `dist/` layout.

## Testing strategy

- **Unit tests**: parser, output formatting, VFS, utilities
- **Command tests**: handler logic with mocked `ChromeAPI` and DOM
- **Manifest test**: ensures all 86 registered commands match `expected-commands.ts`
- **No E2E yet**: overlay UI and content script rely on manual verification

Run: `npm test` (Vitest + happy-dom for DOM commands)

## Extension points

1. **New commands** — `defineCommand()` + manifest registration (see CONTRIBUTING.md)
2. **VFS providers** — implement `VFSProvider`, register in `VirtualFileSystem`
3. **Themes** — add presets in `shared/themes.ts` or user custom themes via options
4. **Page scripts** — register in `page-script-registry.ts` for new DOM operations