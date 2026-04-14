---
applyTo: "src/icon-data.js,src/icon-picker.js,src/icon-picker.test.js"
---

# Icon Picker Instructions

## icon-data.js — AUTO-GENERATED, DO NOT EDIT
- Generated from the Google Fonts Metadata API (`https://fonts.google.com/metadata/icons?incomplete=1`).
- Exports `ICON_CATEGORIES`: array of 17 category objects, each `{ id, label, icons: string[] }`.
- Contains 4 176 unique Material icon names.
- To regenerate: fetch the API, group by `unsupported_families` + `categories`, deduplicate, and write the JS export.

## icon-picker.js
- Exports `createIconPicker(currentIcon, onChange)` — builds a dropdown trigger + icon grid.
- 17 category tabs (iOS emoji-bar style), horizontal-scrollable tab bar.
- Each tab lazy-renders its icons on activation.
- Global search input filters across all categories.
- `closeAllPickers()` export for programmatic close; guarded with `typeof document !== 'undefined'`.

## Testing
- `icon-picker.test.js` — basic module export check.
- DOM-dependent code is guarded for Node.js compatibility.
