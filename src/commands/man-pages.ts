import type { ManPage } from '@/shared/types';

export const CURATED_MAN_PAGES: Record<string, ManPage> = {
  intro: {
    name: 'intro',
    title: 'BrowserShell Introduction',
    sections: [
      {
        heading: 'NAME',
        content: 'intro — guided introduction to BrowserShell',
      },
      {
        heading: 'DESCRIPTION',
        content: `BrowserShell is a terminal interface for your browser. Navigate tabs, bookmarks,
history, and more using familiar shell commands.

This guided tour covers the essentials. Try each example, then press Enter for the next step.`,
      },
      {
        heading: 'STEP 1 — Explore the filesystem',
        content: `  $ ls /
  $ ls /tabs

BrowserShell exposes browser resources as a virtual filesystem.
/tabs, /bookmarks, /history, and /current are your main directories.`,
      },
      {
        heading: 'STEP 2 — Switch tabs',
        content: `  $ tabs
  $ tab switch 2

Run 'tabs' to see numbered tabs in this window.
Use tab switch 1, tab switch 2, etc. — not long Chrome IDs.`,
      },
      {
        heading: 'STEP 3 — Read the current page',
        content: `  $ cat /current/meta.json
  $ cat /current/content.txt

/current is a symlink to your active tab. Read metadata or page text.`,
      },
      {
        heading: 'STEP 4 — Bookmarks',
        content: `  $ cd /bookmarks
  $ ls
  $ cd Work
  $ ls
  $ open Work/Project

Browse bookmarks like folders. ls shows titles and URLs.`,
      },
      {
        heading: 'STEP 5 — Pipes and power',
        content: `  $ ls -1 /tabs | grep github
  $ tabs | grep -i youtube | wc -l
  $ history | tail -n 5

Use ls -1 for pipe-friendly output. Tab completes paths and commands.
Ctrl+R searches command history. Press \` to toggle this terminal.`,
      },
      {
        heading: 'SEE ALSO',
        content: 'help, man vfs, man scripting, man getting-started',
      },
    ],
  },
  'getting-started': {
    name: 'getting-started',
    title: 'Getting Started',
    sections: [
      {
        heading: 'QUICKSTART',
        content: `1. Press \` (backtick) to toggle the terminal overlay
2. Or click the extension icon / use Cmd+Shift+K
3. Type 'tabs' to see numbered tabs, then 'tab switch 2'
4. Type 'man intro' for a guided tour`,
      },
      {
        heading: 'ESSENTIAL COMMANDS',
        content: `  tabs              List tabs (#1, #2, … in this window)
  tab switch 2      Switch to tab #2
  tab new github.com Open a new tab
  bookmark add      Bookmark current page
  history           Recent history (or: history github)
  ai summarize      Summarize current page`,
      },
    ],
  },
  vfs: {
    name: 'vfs',
    title: 'Virtual Filesystem',
    sections: [
      {
        heading: 'DESCRIPTION',
        content: `BrowserShell maps browser resources to virtual paths:

  /tabs/<id>/meta.json    Tab metadata
  /tabs/<id>/content.txt  Page text content
  /bookmarks/<path>       Bookmark tree
  /history/<id>           History entries
  /current/               Active tab (symlink)
  /config/rc              Shell configuration
  /scripts/               User scripts`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ ls /
  $ cd /tabs
  $ cat /current/url.txt
  $ cat /tabs/42/content.txt`,
      },
    ],
  },
  scripting: {
    name: 'scripting',
    title: 'Scripting',
    sections: [
      {
        heading: 'DESCRIPTION',
        content: `Use aliases, export, and /config/rc for persistent customization.
Scripts live in /scripts/ and can be sourced with the source command.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ alias yt='tab new https://youtube.com'
  $ export PROJECT=work
  $ source /scripts/welcome.sh

Add lines to /config/rc (via config edit) for startup commands.`,
      },
    ],
  },
  edit: {
    name: 'edit',
    title: 'Terminal Editor',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'edit [path|-]',
      },
      {
        heading: 'DESCRIPTION',
        content: `Simple built-in editor for VFS paths and pipe input.
Arrow keys move, type to edit, Ctrl+S or :w to save, Esc or :q to exit.
Writable: /notes/, /scripts/, /config/rc, /config/bangs/, /current/inputs/.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ touch /notes/todo.md && edit /notes/todo.md
  $ edit /config/rc
  $ edit /current/inputs/email
  $ cat /current/content.txt | edit -
  $ bang edit gh`,
      },
    ],
  },
  bang: {
    name: 'bang',
    title: 'Site Shortcut Bangs',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'bang <list|add|edit|remove> [args]',
      },
      {
        heading: 'DESCRIPTION',
        content: `Hashbang shortcuts for fast site searches. Use !name query or go !name query.
Built-in bangs include !gh, !yt, !so, !mdn. Custom bangs use %s for the query.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ bang list
  $ !gh BrowserShell
  $ go !yt jazz live
  $ bang add wiki https://wiki.example.com/search?q=%s
  $ bang edit gh
  $ bang remove mywiki -f`,
      },
    ],
  },
  ps: {
    name: 'ps',
    title: 'Tabs as Processes',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'ps [aux] [--json] [--limit N]',
      },
      {
        heading: 'DESCRIPTION',
        content: `Lists open tabs as processes. PID is the Chrome tab ID.
Use kill <#> or kill <PID> to close tabs. Combine with pkill for patterns.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ ps
  $ ps aux
  $ kill 3
  $ pkill youtube
  $ watch 2 top`,
      },
    ],
  },
  workspace: {
    name: 'workspace',
    title: 'Named Workspaces',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'workspace <save|load|list|delete> <name>',
      },
      {
        heading: 'DESCRIPTION',
        content: `Save and restore multi-window layouts including tab URLs, window geometry
(left/top/width/height), shell aliases, env, and cwd. Use workview as an alias.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ workspace save research
  $ workspace list
  $ workspace load research
  $ layout side-by-side
  $ split vertical https://docs.example.com
  $ workspace delete old -f`,
      },
    ],
  },
  layout: {
    name: 'layout',
    title: 'Window Layout',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'layout <preset> [ratio] [W# W#]',
      },
      {
        heading: 'DESCRIPTION',
        content: `Tile browser windows using geometry presets. Chrome cannot split a single window;
BrowserShell positions two windows side-by-side or stacked using left/top/width/height.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ layout side-by-side
  $ layout main-left 60%
  $ layout left
  $ window position right 2`,
      },
    ],
  },
  split: {
    name: 'split',
    title: 'Split View',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'split <vertical|horizontal> [url] [--side left|right|top|bottom]',
      },
      {
        heading: 'DESCRIPTION',
        content: `Open a URL in a second window and tile with the current window. vertical = left/right;
horizontal = top/bottom.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ split vertical
  $ split vertical github.com
  $ split horizontal --side top`,
      },
    ],
  },
  workview: {
    name: 'workview',
    title: 'Workview (workspace alias)',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'workview <save|load|list|delete> <name>',
      },
      {
        heading: 'DESCRIPTION',
        content: 'Alias for workspace — save and restore named multi-window workviews.',
      },
    ],
  },
  rm: {
    name: 'rm',
    title: 'Remove VFS Files',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'rm <path>... [-f] [--dry-run]',
      },
      {
        heading: 'DESCRIPTION',
        content: `Remove user-writable virtual files under /notes/, /scripts/, and /config/bangs/.
Builtin scripts and /config/rc cannot be removed.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ rm /notes/draft.md
  $ rm /scripts/tmp.sh -f
  $ rm /config/bangs/old.txt`,
      },
    ],
  },
  'import-vimium-keys': {
    name: 'import-vimium-keys',
    title: 'Import Vimium Keybindings',
    sections: [
      {
        heading: 'SYNOPSIS',
        content: 'import-vimium-keys [--dry-run]',
      },
      {
        heading: 'DESCRIPTION',
        content: `Adds common Vimium-style global binds to ~/.browsershellrc without overwriting
existing bindings. Includes hints, scroll, tab navigation, and seek.`,
      },
      {
        heading: 'EXAMPLES',
        content: `  $ import-vimium-keys --dry-run
  $ import-vimium-keys
  $ config reload`,
      },
    ],
  },
};