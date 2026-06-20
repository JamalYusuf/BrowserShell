# BrowserShell website

Hugo-powered documentation and landing site for GitHub Pages.

## Local development

```bash
# From repo root
npm run website          # dev server at http://localhost:1313/browsershell/
npm run website:build    # production build → website/public/
npm run website:check-links  # verify internal links after build
```

## Updating content

| What | Where |
|------|-------|
| Landing page hero & features | `themes/browsershell/layouts/index.html` |
| Docs pages | `content/docs/*.md` |
| Legal / privacy | `content/legal/*.md` |
| Roadmap / future vision | `content/future/_index.md` |
| Command reference | Auto-synced — run `npm run sync-website` after `npm run generate-docs` |
| Styles | `themes/browsershell/assets/css/main.css` |
| Site config | `hugo.toml` |

## Deployment

Pushes to `main` trigger `.github/workflows/pages.yml`, which:

1. Generates `docs/COMMANDS.md` from the command registry
2. Syncs it to `website/content/docs/commands/reference.md`
3. Builds Hugo and deploys to GitHub Pages

Enable GitHub Pages in repo settings: **Source → GitHub Actions**.

Site URL: `https://jamalyusuf.github.io/browsershell/`

## Link paths

GitHub Pages serves this site under `/browsershell/`. Markdown links like `[Guide](/docs/foo/)` are rewritten at build time via `render-link.html`. Template links should use `{{ partial "site-url.html" "docs/foo/" }}` (no leading slash — Hugo treats `/paths` as host-root).