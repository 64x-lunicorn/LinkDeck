---
applyTo: "**"
---

# General Coding Instructions

## Language & Runtime
- Vanilla JavaScript with ES modules (`import`/`export`). No frameworks.
- Target: Chrome Extension (Manifest V3), runs only in Chromium browsers.
- Node.js is used only for build tooling (Vite, ESLint, Vitest).

## Style
- ESLint flat config with `@eslint/js` recommended rules.
- `no-unused-vars` is a warning; prefix intentionally unused params with `_`.
- Use template literals over string concatenation.
- Use `const` by default, `let` when reassignment is needed, never `var`.
- Comments in German or English are both fine.

## Quality Gates
- Every change must pass: `npm run lint && npm test && npm run build`.
- Test files live next to source: `src/foo.test.js` tests `src/foo.js`.
- Chrome APIs (`chrome.*`) and DOM (`document`, `window`) are unavailable in tests — guard with `typeof`.
