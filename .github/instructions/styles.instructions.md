---
applyTo: "src/styles.css"
---

# CSS Instructions

## Design Tokens
All colors, spacing, and layout values use CSS custom properties defined at `:root`.
- Colors: `--color-bg`, `--color-text`, `--color-border`, `--color-accent`, etc.
- Spacing: `--spacing-sm`, `--spacing-md`, `--spacing-lg`.
- Never hardcode hex colors — always use or define a design token.

## Theming
- Light/dark themes via `[data-theme="light"]` / `[data-theme="dark"]` attribute on `<html>`.
- System theme is the default (no `data-theme` attribute → uses `prefers-color-scheme`).

## Responsive Breakpoints
- Mobile: `≤ 640px` (default, single-column).
- Tablet: `641px – 1024px` (`@media (min-width: 641px) and (max-width: 1024px)`).
- Desktop: `> 1024px` (full sidebar + multi-column grid).

## Material Icons
Sections use **Material Symbols Outlined** loaded via Google Fonts CDN.
CSS class: `.material-symbols-outlined`.
