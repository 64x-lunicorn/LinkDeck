# LinkDeck

LinkDeck is a Chrome Extension (Manifest V3) that replaces the new-tab page with a configurable link dashboard, built with vanilla JavaScript ES modules and no framework. Terms live in [CONTEXT.md](CONTEXT.md), decisions in [docs/adr/](docs/adr/README.md).

## Project setup

`.claude/64x-lunicorn.yml` records forge, default branch, research, issues and the CI checks, and every 64x-lunicorn skill reads it. Change it by re-running `/64x-lunicorn:setup-project`, not by hand: the gate, the templates and these docs are generated from it.

## Conventions no validator can check

- No framework — vanilla JS with ES modules only; no React, Vue, Angular, or similar.
- No external YAML library — `src/parser.js` is hand-written on purpose; never replace it with `js-yaml` or similar.
- Never `chrome.storage.sync` — its 8 KB per-item limit breaks larger configs; use `chrome.storage.local` (5 MB) only.
- No hardcoded colors in CSS — use the design tokens (custom properties) in `src/styles.css`.
- Never edit `src/icon-data.js` by hand — it's auto-generated from the Google Fonts API.
- Guard Chrome APIs with `typeof chrome !== 'undefined'` and DOM APIs with `typeof document !== 'undefined'` in code reachable from tests — Vitest runs in Node, where neither exists.
- `background.js` must build un-hashed to `dist/background.js` — `public/manifest.json` references it by that exact literal path, and nothing rewrites the manifest at build time.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server
npm run lint          # ESLint
npm test              # Vitest — 73 tests
npm run build         # Production build → dist/
npm run test:watch    # Vitest in watch mode
npm run ci            # Full validation — lint, test, build
```

## Architecture

- `src/newtab.js` — Dashboard rendering, Chrome Tab Groups, Spotlight search
- `src/options.js` — WYSIWYG editor, YAML editor, undo/redo, backup/restore
- `src/parser.js` — Hand-written YAML parser + normalizer + serializer
- `src/search-engines.js` — Search engine presets & `chrome.storage.local` helpers
- `src/icon-picker.js` — Material Icons picker with 17 category tabs (4 176 icons)
- `src/icon-data.js` — Auto-generated icon database
- `src/background.js` — Service worker for context menu "Add to LinkDeck"
- `src/theme.js` — Light / system / dark toggle
- `src/styles.css` — CSS design tokens, responsive breakpoints
- `public/manifest.json` — Chrome MV3 manifest
- `public/default.config.yaml` — Shipped default config
- `public/icons/` — Extension icons

## Testing

- Vitest, tests in `src/*.test.js` next to source files.
- 73 tests: parser (61), search-engines (11), icon-picker (1).
- Tests run in Node.js, not in a browser.

## Config schema

```yaml
title: "Dashboard Title"
groups:
  - name: "Group Name"
    sections:
      - title: "Section Title"
        icon: "material_icon_name"
        color: blue    # grey|blue|red|yellow|green|pink|purple|cyan|orange
        links:
          - label: "Label"
            url: "https://..."
          - divider: true
```

## Storage keys

- `yamlText` — full YAML config string
- `searchEngine` — `{ id, name, urlTemplate }`
- `searchBarVisible` — boolean
- `yamlBackups` — array (up to 10 snapshots)

## Issue tracker

PRs as a request surface: no — external pull requests are not treated as feature requests for triage purposes.

## Changes

- Code, docs, messages and commits are English.
- Commits follow Conventional Commits in imperative mood.
- Work on a branch; `main` changes only through a squash-merged pull request that passed `CI gate`.
- Run `npm run ci` before pushing; it runs every check the gate runs.
- Issues live in the GitHub issues of `64x-lunicorn/LinkDeck`, with the closed label set.
- Ideas live in `research/` and reach code only after promotion to a Spec.
