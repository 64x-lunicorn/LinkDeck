---
applyTo: "src/background.js"
---

# Background Service Worker Instructions

## Purpose
Chrome MV3 background service worker that registers a context menu item "Add to LinkDeck".

## Behavior
1. `chrome.runtime.onInstalled` → creates context menu for `link` and `page` contexts.
2. `chrome.contextMenus.onClicked` →
   - Reads `yamlText` from `chrome.storage.local`.
   - Finds the first `links:` line in the YAML.
   - Inserts a new `- label: / url:` entry below it.
   - Saves updated YAML back to storage.
   - Shows a badge (✓) briefly on the extension icon.
3. If no config exists yet, opens the options page.

## Important
- Uses `chrome.storage.local`, never `sync`.
- YAML is manipulated as raw text (line splicing) — does not use the parser module (service workers cannot import from the same bundle easily).
- `quoteYAML(s)` helper wraps strings in double quotes and escapes internal quotes.
