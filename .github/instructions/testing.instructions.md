---
applyTo: "*.test.js"
---

# Testing Instructions

## Framework
- Vitest (`npx vitest run` / `npm test`).
- Test files: `src/*.test.js` — colocated next to source files.

## Environment
- Tests run in Node.js, NOT in a browser.
- Chrome APIs (`chrome.storage`, `chrome.tabs`, etc.) are unavailable — mock them or guard with `typeof chrome !== 'undefined'`.
- DOM APIs (`document`, `window`) are unavailable — guard with `typeof document !== 'undefined'`.

## Conventions
- Use `describe` / `it` blocks.
- Import from Vitest: `import { describe, it, expect } from 'vitest'`.
- One test file per module is sufficient; cover critical paths and edge cases.
- Current test count: 73 tests across 3 files (parser: 61, search-engines: 11, icon-picker: 1).

## Running
```bash
npm test             # Single run (CI)
npm run test:watch   # Watch mode (dev)
npx vitest run src/parser.test.js   # Single file
```
