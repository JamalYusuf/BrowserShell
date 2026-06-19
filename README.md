# BrowserShell

> A shell for the browser.

BrowserShell is a terminal-first operating layer that runs inside your browser and exposes browser capabilities as commands, resources, and installable packages.

Instead of navigating menus, settings pages, and extension popups, BrowserShell provides a unified command-line interface for interacting with tabs, bookmarks, history, downloads, devices, web applications, and future browser capabilities.

Inspired by Bash, Homebrew, Raycast, and Quake-style consoles.

---

## Why?

Modern browsers have become operating environments.

They manage:

* Tabs
* Windows
* Bookmarks
* History
* Downloads
* Storage
* Web Applications
* Devices
* AI Capabilities
* Extensions

Yet these features remain fragmented across dozens of interfaces.

BrowserShell provides a single, keyboard-driven layer that makes browser functionality:

* Discoverable
* Scriptable
* Extensible
* Fast

---

## Vision

The browser already contains most of the primitives needed for a modern operating environment.

BrowserShell aims to expose those primitives through a consistent shell interface.

Think:

```bash
tab new
bookmark add
history search react
downloads recent
```

instead of:

* Toolbar buttons
* Nested menus
* Settings pages
* Extension popups

---

## Core Concepts

### Everything is a Resource

Browser resources are exposed through a common abstraction.

Examples:

```text
tabs
windows
bookmarks
history
downloads
devices
apps
services
```

Resources can be listed, searched, filtered, and manipulated through commands.

---

### Terminal Overlay

BrowserShell is available anywhere.

Press:

```text
`
```

A Quake-style terminal appears over the current page.

No context switching.

No opening a new tab.

No interrupting your workflow.

---

### Commands

Examples:

```bash
tab new
tab close 3
```

```bash
history today
```

```bash
bookmark search work
```

```bash
open github
```

```bash
downloads recent
```

---

### Pipes

Commands can be composed.

```bash
tabs | grep youtube
```

```bash
history today | summarize
```

```bash
bookmarks work | export markdown
```

---

## Package Manager

BrowserShell includes a package ecosystem inspired by Homebrew.

Search packages:

```bash
pkg search weather
```

Install packages:

```bash
pkg install weather
```

Run commands:

```bash
weather
```

Packages can contribute:

* Commands
* Integrations
* Applications
* Services
* Resource Providers

---

## Example Commands

### Tabs

```bash
tabs
tab new
tab pin 2
tab duplicate 4
```

### Bookmarks

```bash
bookmark add
bookmark search react
bookmark cleanup
```

### History

```bash
history today
history search postgres
history summarize
```

### Downloads

```bash
downloads
downloads recent
downloads open
```

### AI

```bash
ai summarize page
ai explain
ai extract tasks
```

### Devices

```bash
devices
device open arduino
serial monitor arduino
```

---

## Future Resource Model

```text
/
├── tabs
├── windows
├── bookmarks
├── history
├── downloads
├── devices
├── apps
├── services
├── ai
└── user
```

BrowserShell may eventually expose browser resources through a virtual filesystem model, allowing users to navigate browser state using familiar shell concepts.

---

## Goals

* Make browser functionality discoverable
* Create a command-line interface for browser APIs
* Enable community-contributed commands and packages
* Reduce dependence on complex browser UIs
* Provide a consistent abstraction layer for browser capabilities
* Build a platform for browser-native automation

---

## Non-Goals

BrowserShell is not:

* A replacement for your operating system
* A traditional terminal emulator
* A browser automation framework
* A Vim-only browser extension

BrowserShell is a shell for browser resources.

---

## Contributing

BrowserShell is designed to be extensible.

Contributors can create:

* New commands
* New resource providers
* New integrations
* New package repositories
* New browser-native applications

The long-term goal is an ecosystem where browser capabilities can be surfaced through commands without requiring users to learn new interfaces.

---

## Long-Term Vision

Just as Bash became the standard interface for interacting with operating systems, BrowserShell aims to become the standard interface for interacting with browser-based computing.

The browser is evolving into the primary computing environment for millions of users.

BrowserShell provides the shell.
