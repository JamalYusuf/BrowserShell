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
};