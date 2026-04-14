# CLAUDE.md — LinkDeck

## Project
LinkDeck is a Chrome Extension (Manifest V3) that replaces the new-tab page with a configurable link dashboard. Vanilla JavaScript, ES modules, no framework.

## Commands
```bash
npm install          # Install dependencies
npm run lint         # ESLint
npm test             # Vitest — 73 tests
npm run build        # Vite → dist/
npm run lint && npm test && npm run build   # Full validation
```

## Architecture
- `src/newtab.js` — Dashboard rendering, Chrome Tab Groups, Spotlight search
- `src/options.js` — WYSIWYG editor, YAML editor, undo/redo, backup/restore
- `src/parser.js` — Hand-written YAML parser + normalizer + serializer (DO NOT replace with a library)
- `src/search-engines.js` — Search engine presets & `chrome.storage.local` helpers
- `src/icon-picker.js` — Material Icons picker with 17 category tabs (4 176 icons)
- `src/icon-data.js` — **AUTO-GENERATED** — never edit manually
- `src/background.js` — Service worker for context menu "Add to LinkDeck"
- `src/theme.js` — Light / system / dark toggle
- `src/styles.css` — CSS design tokens, responsive breakpoints

## Critical Constraints
1. Vanilla JS only — no React, Vue, Angular, or any framework.
2. Hand-written YAML parser — no `js-yaml` or similar.
3. `chrome.storage.local` only — never `chrome.storage.sync` (8 KB limit).
4. CSS uses design tokens (custom properties) — no hardcoded colors.
5. `icon-data.js` is auto-generated from Google Fonts API — never edit by hand.
6. Chrome APIs are unavailable in tests — guard with `typeof chrome !== 'undefined'`.
7. DOM APIs are unavailable in tests — guard with `typeof document !== 'undefined'`.
8. `background.js` must be emitted un-hashed at `dist/background.js`.

## Testing
- Vitest, tests in `src/*.test.js` next to source files.
- 73 tests: parser (61), search-engines (11), icon-picker (1).
- Tests run in Node.js, not in a browser.

## Config Schema
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

## Storage Keys
- `yamlText` — full YAML config string
- `searchEngine` — `{ id, name, urlTemplate }`
- `searchBarVisible` — boolean
- `yamlBackups` — array (up to 10 snapshots)
