# AGENTS.md — LinkDeck

This file provides context for AI coding agents (Codex, Claude, ChatGPT, Cursor, etc.) working on this repository.

## Project

**LinkDeck** — Chrome Extension (Manifest V3) that replaces the new-tab page with a configurable link dashboard. Users organize links into Groups → Sections → Links via a WYSIWYG editor or raw YAML. Sections open as color-coded Chrome Tab Groups.

## Tech Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Language    | Vanilla JavaScript (ES modules)         |
| Runtime     | Chrome Extension (Manifest V3)          |
| Build       | Vite 8                                  |
| Test        | Vitest                                  |
| Lint        | ESLint (flat config, `@eslint/js`)      |
| Styling     | Plain CSS with design tokens            |
| Icons       | Material Symbols Outlined (Google CDN)  |
| License     | GPLv3                                   |

## Repository Structure

```
src/
├── newtab.html / newtab.js    — New-tab dashboard (renders config, Tab Groups, Spotlight search)
├── options.html / options.js  — Settings page (WYSIWYG editor, YAML editor, backup)
├── parser.js                  — Hand-written YAML parser + normalizer + serializer
├── parser.test.js             — 61 tests for the parser
├── search-engines.js          — Search engine presets & chrome.storage helpers
├── search-engines.test.js     — 11 tests
├── icon-picker.js             — Material Icons picker (4 176 icons, 17 category tabs)
├── icon-picker.test.js        — 1 test
├── icon-data.js               — AUTO-GENERATED icon database (DO NOT edit by hand)
├── background.js              — Service worker (context menu "Add to LinkDeck")
├── theme.js                   — Light / system / dark toggle
└── styles.css                 — Design tokens, responsive breakpoints
public/
├── manifest.json              — Chrome MV3 manifest
├── default.config.yaml        — Shipped default config
└── icons/                     — Extension icons
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server
npm run build        # Production build → dist/
npm run lint         # ESLint
npm test             # Vitest (single run, 73 tests)
npm run test:watch   # Vitest watch mode
```

**Validation before any PR:** `npm run lint && npm test && npm run build`

## Architecture Rules

### Must

- Use vanilla JS with ES modules — no React, Vue, Angular, or other frameworks.
- Use the hand-written YAML parser in `parser.js` — no external YAML libraries.
- Use `chrome.storage.local` (5 MB limit) — never `chrome.storage.sync`.
- Use CSS design tokens (custom properties) — no hardcoded colors.
- Use Chrome Tab Group color enum: `grey`, `blue`, `red`, `yellow`, `green`, `pink`, `purple`, `cyan`, `orange`.
- Guard Chrome APIs with `typeof chrome !== 'undefined'` in test-reachable code.
- Guard DOM APIs with `typeof document !== 'undefined'` in test-reachable code.
- Keep `icon-data.js` as auto-generated artifact — regenerate from Google Fonts API when needed.
- Output `background.js` un-hashed at `dist/background.js` (Vite rollup config handles this).

### Must Not

- Do not add frameworks or UI libraries.
- Do not add external YAML parsing libraries.
- Do not use `chrome.storage.sync` (8 KB per-item limit breaks large configs).
- Do not edit `icon-data.js` by hand.
- Do not hardcode hex/rgb colors in CSS — use custom properties.

## Config Schema

```yaml
title: "Dashboard Title"
groups:
  - name: "Group Name"
    sections:
      - title: "Section Title"
        icon: "material_icon_name"     # optional, from Material Symbols Outlined
        color: blue                     # Chrome enum (9 values)
        links:
          - label: "Link Label"
            url: "https://example.com"
          - divider: true               # optional separator
```

## Storage Keys

| Key                | Type     | Description                        |
|--------------------|----------|------------------------------------|
| `yamlText`         | string   | Full YAML config text              |
| `searchEngine`     | object   | `{ id, name, urlTemplate, icon? }` |
| `searchBarVisible` | boolean  | Show/hide the search bar           |
| `yamlBackups`      | array    | Up to 10 automatic backup entries  |

## Testing

- Framework: Vitest — tests run in Node.js, not in a browser.
- Test files: `src/*.test.js` — colocated with source.
- Chrome APIs and DOM APIs are unavailable in tests.
- 73 tests total: parser (61), search-engines (11), icon-picker (1).

## CI/CD

- **CI** (`ci.yml`): lint → test → build → `npm audit` on push/PR to `main`.
- **CodeQL** (`codeql.yml`): JavaScript security scanning weekly + on push/PR.
- **Release** (`release.yml`): on `v*` tag → build → zip → GitHub Release.
- **Dependabot**: weekly npm + GitHub Actions updates.
