---
title: Privacy tools
description: Audit and clear site data with forget, siteinfo, and permissions.
weight: 40
group: Guides
---

BrowserShell includes first-class privacy commands — no need to dig through Chrome settings.

## siteinfo — footprint at a glance

```bash
siteinfo
```

Shows cookies, storage size, script count, and permission state for the current site.

```bash
siteinfo jamal.dev
siteinfo --compare google.com
siteinfo --json
```

Use before and after `forget` to verify cleanup.

## cookies — inspect storage

```bash
cookies
cookies --json
```

Lists cookies for the current site: name, domain, path, session/persistent.

## permissions — effective settings

```bash
permissions
```

Shows content settings: JavaScript, images, cookies, popups, geolocation, etc.

## forget — controlled deletion

The most powerful privacy command. **Always dry-run first.**

```bash
forget --dry-run
```

Shows exactly what would be removed: cookies, cache, storage, history (optional).

```bash
forget
```

Interactive confirmation. Deletes site data for the current domain.

```bash
forget --preset work
forget --preset strict
```

Named presets configured in the options page. Each preset defines scope: cookies, cache, storage, history.

```bash
forget --scope cookies
forget --scope all
forget --force
```

| Flag | Effect |
|------|--------|
| `--dry-run` | Preview only, no changes |
| `--preset <name>` | Use named preset from options |
| `--scope` | Limit to cookies, cache, storage, or all |
| `--force` | Skip confirmation (dangerous) |

{{< warning >}}
`forget --scope all` removes cookies, cache, localStorage, IndexedDB, and optionally history. There is no undo. Always run `--dry-run` first.
{{< /warning >}}

## Audit workflow

```bash
# 1. Understand what's stored
siteinfo
cookies | head
permissions

# 2. Preview cleanup
forget --dry-run

# 3. Apply preset or manual
forget --preset strict

# 4. Verify
siteinfo
```

## Forget presets (options page)

Create reusable profiles:

| Preset | Typical scope |
|--------|---------------|
| `light` | Cookies only |
| `work` | Cookies + cache |
| `strict` | Cookies + cache + storage + history |

Configure in Options → Forget Presets, then use `forget --preset <name>`.

## Chrome Web Store transparency

These commands are why BrowserShell requests `cookies`, `browsingData`, and `contentSettings`. Full mapping: [Permissions](/legal/permissions/).