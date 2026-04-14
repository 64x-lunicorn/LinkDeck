# Copilot Instructions — LinkDeck

## Project Overview

LinkDeck is a Chrome Extension (Manifest V3) that replaces the new-tab page with a configurable dashboard. Users organize links into **Groups → Sections → Links** using a WYSIWYG editor or raw YAML. Links open in color-coded Chrome Tab Groups.

- **Runtime**: Browser (Chrome Extension APIs)
- **Build**: Vite 8 (no framework, vanilla JS + ES modules)
- **Test**: Vitest
- **Lint**: ESLint (flat config, recommended rules)
- **License**: GPLv3

## Architecture

```
src/
  newtab.html / newtab.js   — Dashboard (renders config, Tab Groups, Spotlight search)
  options.html / options.js  — Settings page (WYSIWYG editor, YAML editor, backup)
  parser.js                  — Hand-written YAML parser, normalizer, serializer
  search-engines.js          — Search engine presets & chrome.storage helpers
  icon-picker.js             — Material Icons picker (4 176 icons, 17 category tabs)
  icon-data.js               — Auto-generated icon database (do NOT edit manually)
  background.js              — Service worker (context menu: "Add to LinkDeck")
  theme.js                   — Light / system / dark toggle
  styles.css                 — Design tokens (CSS custom properties), responsive
public/
  manifest.json              — Chrome MV3 manifest
  default.config.yaml        — Shipped default configuration
```

## Key Conventions

### Code Style
- Vanilla JavaScript, ES modules (`import`/`export`), no framework.
- No external YAML library — `parser.js` is intentionally hand-written.
- `icon-data.js` is auto-generated from Google Fonts Metadata API — never edit it by hand.
- CSS uses design tokens (custom properties `--color-*`, `--spacing-*`) — avoid hardcoded colors.
- ESLint: `no-unused-vars` is a warning; unused function params prefixed with `_`.
- Comments in German or English are both acceptable.

### Chrome APIs
- Storage: `chrome.storage.local` (5 MB limit, NOT sync).
- Storage keys: `yamlText`, `searchEngine`, `searchBarVisible`, `yamlBackups`.
- Tab Groups: `chrome.tabs.create` → `chrome.tabs.group` → `chrome.tabGroups.update`.
- Context menus: registered in `background.js` `onInstalled`.

### Config Schema (YAML)
```yaml
title: "Dashboard Title"
groups:
  - name: "Group Name"
    sections:
      - title: "Section Title"
        icon: "material_icon_name"     # optional
        color: blue                     # Chrome enum: grey|blue|red|yellow|green|pink|purple|cyan|orange
        links:
          - label: "Link Label"
            url: "https://example.com"
          - divider: true               # optional divider
```

### Testing
- Test files: `*.test.js` alongside source in `src/`.
- Run: `npm test` (Vitest, single run) or `npm run test:watch`.
- Chrome APIs are not available in tests — mock or guard with `typeof chrome !== 'undefined'`.
- DOM APIs are not available in tests — guard with `typeof document !== 'undefined'`.

### Build
- `npm run build` → `dist/` (load as unpacked extension in Chrome).
- `background.js` must be output un-hashed at `dist/background.js` (Vite rollup config handles this).
- All other JS/CSS chunks go to `dist/assets/`.

## Do's
- Run `npm run lint && npm test` before considering any change complete.
- Keep the hand-written YAML parser; do not add js-yaml or similar.
- Use Chrome Tab Group colors enum (`grey`, `blue`, `red`, `yellow`, `green`, `pink`, `purple`, `cyan`, `orange`) — no other color values.
- Keep `icon-data.js` as an auto-generated artifact.
- Use `chrome.storage.local`, never `chrome.storage.sync`.

## Don'ts
- Do not add a framework (React, Vue, etc.) — this is intentionally vanilla JS.
- Do not edit `icon-data.js` manually — regenerate from Google Fonts API if needed.
- Do not add external YAML libraries.
- Do not use `chrome.storage.sync` (8 KB per-item limit breaks large configs).
- Do not hardcode colors in CSS — use design tokens.
