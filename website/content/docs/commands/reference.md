---
title: "Command reference"
description: "Complete reference for all BrowserShell commands — auto-synced from the command registry."
weight: 90
group: Reference
---

> Auto-generated from the command registry. Run `npm run generate-docs && npm run sync-website` to update.

## ai

### `ai`

AI-powered summarization and explanation using built-in browser AI.

**Usage:** `ai <summarize|explain> [target] [--length short|medium|long]`

**Examples:**

- `ai summarize`
- `ai summarize current --length short`
- `cat /current/content.txt | ai summarize`
- `ai explain "TypeError: Cannot read property"`

**See also:** `cat`, `grep`

## bookmarks

### `bookmark`

Bookmark the current page, search, or open bookmarks.

**Usage:** `bookmark | bookmark <query> | bookmark <#> | bookmark <add|search|open> [args]`

**Examples:**

- `bookmark`
- `bookmark react`
- `bookmark 1`
- `bookmark open 1`
- `bookmark add "My Site"`

**See also:** `bookmarks`, `open`

### `bookmarks`

List bookmarks (alias for ls /bookmarks).

**Usage:** `bookmarks [--json]`

**Examples:**

- `bookmarks`
- `ls /bookmarks`

**See also:** `bookmark`, `ls`, `open`

## builtin

### `alias`

Define or list command aliases.

**Usage:** `alias [name='command']`

**Examples:**

- `alias ll='tabs'`
- `alias`
- `alias gh='tab new https://github.com'`

**See also:** `export`, `source`

### `apropos`

Search commands by keyword in name, description, or examples.

**Usage:** `apropos <keyword>`

**Examples:**

- `apropos tab`
- `apropos bookmark`
- `apropos ai`

**See also:** `help`, `man`

### `cat`

Display file contents from the virtual filesystem.

**Usage:** `cat <path> [--raw]`

**Examples:**

- `cat /current/meta.json`
- `cat /current/content.txt`
- `cat /config/rc`

**See also:** `ls`, `grep`

### `clear`

Clear the terminal screen.

**Usage:** `clear`

**Examples:**

- `clear`

### `echo`

Print arguments to stdout (supports $VAR expansion).

**Usage:** `echo [text...]`

**Examples:**

- `echo Hello`
- `echo $HOME`
- `echo $USER`

### `env`

Show shell environment variables (set via export).

**Usage:** `env [VAR] [--json]`

**Examples:**

- `env`
- `env API_URL`
- `export FOO=bar && env FOO`

**See also:** `export`, `alias`, `config`

### `export`

Set an environment variable or export the session transcript.

**Usage:** `export VAR=value | export log [path]`

**Examples:**

- `export MY_VAR=hello`
- `export HOME=/`
- `export log`
- `export log ~/session.txt`

**See also:** `clip`, `cat`

### `help`

Show command overview or help for a specific command.

**Usage:** `help [command|category]`

**Examples:**

- `help`
- `help tab`
- `help privacy`
- `help downloads`
- `help ls | grep tab`

**See also:** `man`, `apropos`, `quick`

### `ls`

List directory contents in the virtual filesystem.

**Usage:** `ls [path] [-1] [--json]`

**Examples:**

- `ls`
- `ls /tabs`
- `ls -1 /tabs | grep github`
- `ls /bookmarks`

**See also:** `cd`, `cat`, `pwd`, `tabs`

### `man`

Display formatted manual page for a command or guide.

**Usage:** `man <command|guide>`

**Examples:**

- `man ls`
- `man tab`
- `man intro`
- `man vfs`

**See also:** `help`, `apropos`

### `source`

Execute commands from a script file.

**Usage:** `source <script>`

**Examples:**

- `source /scripts/welcome.sh`
- `source /config/rc`

**See also:** `alias`, `export`

## history

### `history`

List, search, delete, or clear browsing history.

**Usage:** `history [query] | history <today|yesterday|this-week> [query] | history delete <#|url|domain> -f | history clear <range|domain> -f`

**Examples:**

- `history`
- `history today`
- `history yesterday github`
- `history jamal.dev`
- `history delete 3 -f`
- `history delete jamal.dev -f`
- `history clear day -f`
- `history clear today -f`
- `history clear jamal.dev -f`

**See also:** `forget`, `open`, `grep`

## navigation

### `back`

Go back in the current tab history.

**Usage:** `back [#]`

**Examples:**

- `back`
- `back 2`

### `cd`

Change the current working directory in the virtual filesystem.

**Usage:** `cd [path]`

**Examples:**

- `cd /tabs`
- `cd /bookmarks`
- `cd /current`
- `cd ..`

**See also:** `pwd`, `ls`

### `close`

Close the current tab, a tab by #, or remove a bookmark.

**Usage:** `close [#|bookmark-path] [-f]`

**Examples:**

- `close`
- `close 3`
- `close /bookmarks/Old -f`

**See also:** `tab`, `bookmark`

### `forward`

Go forward in the current tab history.

**Usage:** `forward [#]`

**Examples:**

- `forward`
- `forward 2`

### `go`

Smart go: switch tab, open bookmark/URL/history, or search.

**Usage:** `go <query|url>`

**Examples:**

- `go github`
- `go gmail.com`
- `go react docs`
- `go https://example.com`

**See also:** `qf`, `open`, `tab`, `find`

### `here`

Show the current tab (title, url, #, domain, status).

**Usage:** `here [--json]`

**Examples:**

- `here`
- `here --json`
- `clip url`
- `domain`

**See also:** `tabs`, `clip`, `domain`

### `open`

Open a URL, bookmark path, VFS path, or a new tab when called with no args.

**Usage:** `open [url|path]`

**Examples:**

- `open`
- `open github.com`
- `open https://example.com`
- `open /bookmarks/Work/Project`

**See also:** `tab`, `bookmark`, `go`

### `pwd`

Print the current working directory.

**Usage:** `pwd`

**Examples:**

- `pwd`
- `cd /tabs && pwd`

**See also:** `cd`, `ls`

### `reload`

Reload the current tab (or tab #). Use --hard to bypass cache.

**Usage:** `reload [#] [--hard]`

**Examples:**

- `reload`
- `reload 2`
- `reload --hard`
- `reload 3 --hard`

**See also:** `tab`, `back`, `forward`, `hard`

### `search`

Fuzzy search tabs, bookmarks, history, and downloads.

**Usage:** `search <query> | search --tabs|--bookmarks|--history|--downloads <query>`

**Examples:**

- `search github`
- `search --tabs mail`
- `search --history react`
- `search --downloads pdf`

**See also:** `go`, `find`, `qf`, `bookmark`

## tabs

### `detach`

Move current tab (or #) into a new window.

**Usage:** `detach [#]`

**Examples:**

- `detach`
- `detach 3`
- `tab move 2 new`

**See also:** `tab`, `window`

### `discard`

Unload a tab from memory (keeps tab, frees RAM). Reload to restore.

**Usage:** `discard [#]`

**Examples:**

- `discard`
- `discard 3`
- `tabs | grep old | discard`

**See also:** `tab`, `reload`, `close`

### `domain`

Show current domain or list tabs matching a domain.

**Usage:** `domain [hostname]`

**Examples:**

- `domain`
- `domain github.com`
- `domain google`

**See also:** `here`, `tabs`, `qf`

### `find`

Find a tab across all windows and switch to it.

**Usage:** `find [-i] <pattern>`

**Examples:**

- `find github`
- `find -i mail`
- `find youtube`

**See also:** `qf`, `go`, `sessions`

### `pin`

Pin the current tab (shortcut for tab pin).

**Usage:** `pin [#]`

**Examples:**

- `pin`
- `pin 2`

**See also:** `unpin`, `tab`, `pinned`

### `pinned`

List all pinned tabs across windows.

**Usage:** `pinned [--json]`

**Examples:**

- `pinned`
- `pinned --json`
- `pinned | tab switch`

**See also:** `tabs`, `tab`, `windows`

### `qf`

Quick-find: switch to the first tab matching a pattern.

**Usage:** `qf <pattern> [--all]`

**Examples:**

- `qf github`
- `qf mail`
- `qf youtube --all`

**See also:** `go`, `find`, `tabs`

### `recent`

List and restore recently closed tabs or windows.

**Usage:** `recent | recent restore <#>`

**Examples:**

- `recent`
- `recent restore 1`

**See also:** `session`, `tabs`, `open`

### `sessions`

Tree view of all windows and their tabs.

**Usage:** `sessions [--json]`

**Examples:**

- `sessions`
- `sessions | grep github`
- `find mail`

**See also:** `windows`, `tabs`, `find`

### `tab`

Manage browser tabs: list, switch, close, pin, and more.

**Usage:** `tab [#|new|close|switch|move|next|prev|pin|unpin|duplicate] [args]`

**Examples:**

- `tab`
- `tab 2`
- `tab switch 2`
- `tab switch 1@2`
- `tab move 3 2`
- `tab new github.com`

**See also:** `tabs`, `open`, `close`

### `tabs`

List tabs in the active shell window (same numbers as tab switch).

**Usage:** `tabs [--all] [--json]`

**Examples:**

- `tabs`
- `tabs --all`
- `tabs --all --json`
- `tab switch 2@2`

**See also:** `tab`, `pinned`, `domain`, `ls`

### `title`

Rename the current tab by setting the page title.

**Usage:** `title <new-title> [#]`

**Examples:**

- `title "Research Notes"`
- `title Inbox`
- `title "🔥 Urgent" 2`

**See also:** `here`, `tab`

### `unpin`

Unpin the current tab (shortcut for tab unpin).

**Usage:** `unpin [#]`

**Examples:**

- `unpin`
- `unpin 1`

**See also:** `pin`, `tab`, `pinned`

### `window`

List or manage browser windows: focus, new, close, tabs.

**Usage:** `window | window <W#> | window <focus|new|close|tabs> [args] [-f]`

**Examples:**

- `window`
- `window 2`
- `window focus 2`
- `window tabs`
- `window new github.com`

**See also:** `windows`, `tabs`, `tab`, `detach`

### `windows`

List browser windows (W#). Sets context for tabs/tab commands.

**Usage:** `windows [--json]`

**Examples:**

- `windows`
- `window focus 2`
- `tabs`
- `tab switch 1@2`

**See also:** `window`, `tabs`, `sessions`

## utility

### `audible`

List tabs currently playing audio across all windows.

**Usage:** `audible [--json]`

**Examples:**

- `audible`
- `audible --json`
- `audible | tab switch`

**See also:** `mute`, `volume`, `find`

### `audit`

Page health snapshot: DOM size, load timing, storage, memory.

**Usage:** `audit [--json] [#]`

**Examples:**

- `audit`
- `audit --json`
- `here && audit`
- `audit 2`

**See also:** `tech`, `reqs`, `meta`, `viewport`

### `click`

Alias for link find — click/open first matching link or button.

**Usage:** `click <text|selector> [#]`

**Examples:**

- `link find Home`
- `click Home`
- `click Sign in`
- `click "#submit"`

**See also:** `link`, `links`, `fill`

### `clip`

Copy tab URL, title, markdown link, or page selection to clipboard.

**Usage:** `clip [url|title|md|both|selection|log]`

**Examples:**

- `clip`
- `clip md`
- `clip both`
- `clip selection`
- `clip log`
- `pick | clip`

**See also:** `here`, `pick`

### `config`

View or edit shell configuration.

**Usage:** `config <get|set|list> [key] [value]`

**Examples:**

- `config list`
- `config get theme`
- `config set overlayOpacity 0.9`

**See also:** `alias`, `export`

### `cookies`

List or clear cookies for the current page.

**Usage:** `cookies [clear -f] [--json] [#]`

**Examples:**

- `cookies`
- `cookies --json`
- `cookies clear -f`
- `audit && cookies`

**See also:** `storage`, `forget`, `audit`

### `downloads`

List, open, show, or remove browser downloads.

**Usage:** `downloads [query] | downloads <open|show|delete> <#> | downloads clear -f`

**Examples:**

- `downloads`
- `downloads pdf`
- `downloads open 1`
- `downloads show 2`
- `downloads delete 1 -f`
- `downloads clear -f`

**See also:** `open`, `grep`

### `extensions`

List, enable, disable, or open options for browser extensions.

**Usage:** `extensions [query] | extensions <enable|disable|options> <#|id|name>`

**Examples:**

- `extensions`
- `extensions shell`
- `extensions disable 2`
- `extensions enable uBlock`
- `extensions options 1`

**See also:** `config`, `help`

### `fill`

Fill an input or textarea on the page by CSS selector.

**Usage:** `fill <selector> <text> [#]`

**Examples:**

- `fill "#search" "react hooks"`
- `fill input[name=q] browsershell`

**See also:** `click`, `seek`

### `forget`

Forget site data — cookies, cache, storage — like clearing data for one site.

**Usage:** `forget [domain] [cookies|cache|storage] | forget preset <name> [--history] [--all -f] [--dry-run]`

**Examples:**

- `forget`
- `forget --dry-run`
- `forget jamal.dev -f`
- `forget preset light -f`
- `forget preset full --dry-run`
- `forget cookies -f`
- `forget --history -f`
- `forget --all -f`

**See also:** `history delete`, `history clear`, `cookies`, `storage`

### `frames`

List iframes embedded on the page.

**Usage:** `frames [--limit N] [--json] [#]`

**Examples:**

- `frames`
- `frames --json`
- `audit && frames`

**See also:** `audit`, `links`, `tech`

### `grep`

Filter lines matching a pattern from stdin or a file.

**Usage:** `grep [-i] [-v] <pattern> [path]`

**Examples:**

- `tabs | grep -i youtube`
- `history | grep github`
- `tabs | grep -v example`

**See also:** `cat`, `tabs`, `head`, `wc`

### `head`

Output the first N lines of input.

**Usage:** `head [-n N]`

**Examples:**

- `tabs | head -n 5`
- `history | head -n 3`

**See also:** `tail`, `grep`, `wc`

### `image`

List or open/copy/show page images by number.

**Usage:** `image | image <#> [open|copy|show] | image <action> <#>`

**Examples:**

- `image`
- `image 1`
- `image 1 copy`
- `image copy 2`
- `image show 1`

**See also:** `images`, `shot`, `clip`

### `images`

List images on the current page.

**Usage:** `images [pattern] [--limit N] [#]`

**Examples:**

- `images`
- `images logo`
- `images hero`
- `images | head -n 5`

**See also:** `image`, `shot`, `meta`

### `input`

List, focus, fill, or clear page inputs by number.

**Usage:** `input | input <#> [text] | input <#> <clear|show> | input <fill|clear|show> <#> [text]`

**Examples:**

- `input`
- `input 1`
- `input 1 hello@mail.com`
- `input fill 1 "query"`
- `input 1 clear`

**See also:** `inputs`, `fill`, `press`, `link`

### `inputs`

List form fields on the current page.

**Usage:** `inputs [pattern] [--limit N] [#]`

**Examples:**

- `inputs`
- `inputs email`
- `inputs search`
- `inputs && input fill 1 "query"`

**See also:** `input`, `fill`, `press`

### `jsonld`

Extract JSON-LD structured data blocks from the page.

**Usage:** `jsonld [--limit N] [--json] [#]`

**Examples:**

- `jsonld`
- `jsonld --json`
- `jsonld | head -n 20`
- `meta && jsonld`

**See also:** `meta`, `read`, `tech`

### `link`

List or interact with page links by number or text.

**Usage:** `link | link <#> [open|copy|show|click|new] | link <action> <#> | link <text>`

**Examples:**

- `link`
- `link 1`
- `link 1 copy`
- `link copy 1 --md`
- `link Sign in`
- `link click 4`

**See also:** `links`, `open`, `clip`

### `links`

List links on the current page.

**Usage:** `links [pattern] [--limit N] [#]`

**Examples:**

- `links`
- `links home`
- `links github`
- `links | head -n 5`
- `links && link 1`

**See also:** `link`, `open`, `go`

### `log`

View or clear the session transcript.

**Usage:** `log | log clear`

**Examples:**

- `log`
- `log clear`
- `cat /transcript/live.txt`
- `clip log`

**See also:** `export`, `clip`, `cat`

### `meta`

Show page metadata (title, description, OG tags, canonical).

**Usage:** `meta [--json] [#]`

**Examples:**

- `meta`
- `meta --json`
- `clip md`
- `here`

**See also:** `here`, `read`, `clip`

### `mute`

Mute or unmute tab audio.

**Usage:** `mute [on|off|toggle] [#]`

**Examples:**

- `mute`
- `mute off`
- `mute on 2`

**See also:** `volume`, `audible`, `tab`

### `notify`

Show a desktop notification.

**Usage:** `notify <message>`

**Examples:**

- `notify Done!`
- `downloads | notify "Check downloads"`
- `wait 5000 && notify "Time's up"`

**See also:** `wait`, `echo`

### `options`

Open the BrowserShell settings / options page.

**Usage:** `options`

**Examples:**

- `options`

**See also:** `config`, `help`, `overlay`

### `overlay`

Control the Quake-style terminal overlay size and visibility.

**Usage:** `overlay <half|full|show|hide|toggle|status> | overlay height <percent>`

**Examples:**

- `overlay half`
- `overlay full`
- `overlay toggle`
- `overlay show`
- `overlay status`
- `overlay height 60`

**See also:** `config`, `quick`

### `perf`

Page performance snapshot: load time, transfer size, heap.

**Usage:** `perf [--json] [#]`

**Examples:**

- `perf`
- `perf --json`
- `reload --hard && perf`

**See also:** `audit`, `reqs`, `reload`

### `permissions`

View or set site content permissions for the active page.

**Usage:** `permissions | permissions set <type> <allow|block|ask> | permissions reset <type>`

**Examples:**

- `permissions`
- `permissions set notifications block`
- `permissions set javascript allow`
- `permissions reset location`

**See also:** `siteinfo`, `forget`, `cookies`

### `pick`

Print highlighted/selected text from the page.

**Usage:** `pick [#]`

**Examples:**

- `pick`
- `pick | wc -w`
- `pick | clip`

**See also:** `clip`, `seek`, `read`

### `press`

Send a keyboard key to the focused page element.

**Usage:** `press <key> [#]`

**Examples:**

- `press enter`
- `press tab`
- `input fill 1 "query" && press enter`
- `press escape`

**See also:** `input`, `fill`, `link`

### `quick`

Cheat sheet of power-user shortcuts and workflows.

**Usage:** `quick`

**Examples:**

- `quick`

### `read`

Extract readable article text from the page (main content).

**Usage:** `read [--limit N] [#]`

**Examples:**

- `read`
- `read --limit 2000`
- `read | head -n 20`
- `read | ai summarize`

**See also:** `cat`, `ai`, `pick`

### `reqs`

Show network resource timing (slowest first).

**Usage:** `reqs [pattern] [--slow] [--limit N] [--json] [#]`

**Examples:**

- `reqs`
- `reqs --slow`
- `reqs js`
- `reqs api --limit 30`
- `audit && reqs --slow`

**See also:** `audit`, `tech`, `reload`

### `scroll`

Show scroll position or scroll the page.

**Usage:** `scroll | scroll [top|bottom|up|down|<px>] [#]`

**Examples:**

- `scroll`
- `scroll down`
- `scroll top`
- `scroll 800`
- `scroll down 2`

**See also:** `viewport`, `seek`, `zoom`

### `seek`

Find text in the current page (like Ctrl+F). Highlights matches.

**Usage:** `seek <text> [--next|--prev] [--grep] [#]`

**Examples:**

- `seek login`
- `seek error --next`
- `seek TODO --grep`
- `cat /current/content.txt | seek --grep api`

**See also:** `grep`, `qf`, `links`

### `session`

Save and restore window/tab layouts.

**Usage:** `session | session save <name> | session restore <name> | session delete <name> -f`

**Examples:**

- `session`
- `session save work`
- `session restore work`
- `session delete work -f`

**See also:** `sessions`, `windows`, `tabs`

### `shot`

Capture a screenshot of the current window.

**Usage:** `shot [--copy] [#]`

**Examples:**

- `shot`
- `shot --copy`

**See also:** `clip`, `here`

### `siteinfo`

Audit cookies, history, and storage footprint for a site.

**Usage:** `siteinfo [domain] [--json] [--compare <domain>]`

**Examples:**

- `siteinfo`
- `siteinfo jamal.dev`
- `siteinfo --compare github.com`
- `siteinfo --json`
- `forget --dry-run && siteinfo`

**See also:** `forget`, `cookies`, `history`, `storage`

### `storage`

List, read, or clear localStorage / sessionStorage on the page.

**Usage:** `storage [local|session] [pattern] | storage get <key> | storage clear [local|session] -f`

**Examples:**

- `storage`
- `storage session`
- `storage auth`
- `storage get token`
- `storage clear -f`
- `storage clear session -f`

**See also:** `cookies`, `forget`, `audit`

### `tail`

Output the last N lines of input.

**Usage:** `tail [-n N]`

**Examples:**

- `history | tail -n 5`
- `tabs | tail -n 3`

**See also:** `head`, `grep`

### `tech`

Detect frameworks, CMS, and third-party scripts on the page.

**Usage:** `tech [--json] [#]`

**Examples:**

- `tech`
- `tech --json`
- `open site.com && wait 1000 && tech`

**See also:** `audit`, `reqs`, `meta`

### `user`

Show or set the prompt username (\u in PS1).

**Usage:** `user [set <name>]`

**Examples:**

- `user`
- `user set jamal`
- `user set dev`

**See also:** `config`, `export`, `options`

### `viewport`

Show viewport size, scroll position, and page dimensions.

**Usage:** `viewport [--json] [#]`

**Examples:**

- `viewport`
- `vp`
- `viewport --json`
- `scroll bottom && viewport`

**See also:** `scroll`, `audit`, `zoom`

### `volume`

Control in-page media volume (video/audio elements). Tab mute: see mute.

**Usage:** `volume [status|mute|unmute|0-100|+N|-N] [#]`

**Examples:**

- `volume`
- `volume 50`
- `volume mute`
- `volume +10`
- `volume -20`

**See also:** `mute`, `audible`

### `wait`

Pause for milliseconds (useful in scripts and chained workflows).

**Usage:** `wait <ms>`

**Examples:**

- `wait 500`
- `wait 2000`
- `tab new example.com && wait 1000 && here`

**See also:** `source`, `reload`

### `watch`

Repeat a command on an interval (stop with watch stop).

**Usage:** `watch <seconds> <command> | watch stop | watch status`

**Examples:**

- `watch 5 tabs --all`
- `watch 2 downloads`
- `watch stop`

**See also:** `wait`, `tabs`, `downloads`

### `wc`

Count lines, words, or characters in input.

**Usage:** `wc [-l] [-w] [path]`

**Examples:**

- `tabs | wc -l`
- `history | wc -l`
- `wc -l /config/rc`

**See also:** `grep`, `head`

### `zoom`

Show, set, or adjust page zoom.

**Usage:** `zoom [in|out|reset|<percent>] [#]`

**Examples:**

- `zoom`
- `zoom in`
- `zoom 125`
- `zoom out 2`

**See also:** `here`, `scroll`

