---
applyTo: "src/parser.js,src/parser.test.js"
---

# YAML Parser Instructions

## Overview
`parser.js` is a hand-written YAML parser, normalizer, and serializer for the LinkDeck config format. It is **intentionally** hand-written — do NOT replace it with `js-yaml` or any other library.

## Exports
- `unquote(s)` — Strip surrounding quotes from a string.
- `parseConfigYAML(yamlString)` — Parse YAML text into a raw config object.
- `normalize(config)` — Validate & normalize: apply defaults, migrate legacy `sections:` → `groups:`, enforce Chrome color enum.
- `configToYAML(config)` — Serialize a config object back to YAML string.

## YAML Grammar Supported
- Top-level keys: `title`, `groups` (list), legacy `sections` (list).
- Group keys: `name`, `sections` (list).
- Section keys: `title`, `icon`, `color`, `links` (list).
- Link keys: `label`, `url`. Or `divider: true`.
- Strings can be unquoted, single-quoted, or double-quoted.
- Comments with `#` — but `#` inside quoted strings is preserved.

## Chrome Color Enum
Only these 9 values: `grey`, `blue`, `red`, `yellow`, `green`, `pink`, `purple`, `cyan`, `orange`.

## Testing (61 tests)
- Tests live in `src/parser.test.js`.
- Tests cover: `unquote`, `parseConfigYAML`, `normalize`, `configToYAML`, and roundtrip (parse → serialize → parse).
- Run: `npm test` or `npx vitest run src/parser.test.js`.
