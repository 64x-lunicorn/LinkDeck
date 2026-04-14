# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.1.0] – 2026-04-14

### Added
- **Spotlight Search**: Unified search bar — filters dashboard links in real-time as you type, press Enter to search the web (like macOS Spotlight)
- **Search engine presets**: Ecosia (default), DuckDuckGo, Google, Bing
- **Custom search engine**: Define a custom engine with name, URL template (`{query}` placeholder), and icon
- **Search bar visibility toggle**: Option to show/hide the search bar
- **Search filter counter**: Shows "X of Y links" when filtering
- **Link tooltips**: Hover over any link on the dashboard to see the full URL
- **Collapsible groups & sections**: Groups and sections in the editor can be collapsed/expanded for easier navigation
- **Sidebar group navigation**: Groups appear as a sub-list in the sidebar for quick scroll-to-group access
- **Group & section badges**: Section count and link count badges for at-a-glance overview
- **Undo / Redo**: Snapshot-based undo/redo in the WYSIWYG editor (Ctrl+Z / Ctrl+Shift+Z, up to 30 steps)
- **Icon picker**: Visual Material Icons grid with search, replaces the free-text icon input
- **Context menu**: Right-click any link or page → "Add to LinkDeck" (appends to first group)
- **File import validation**: MIME type, extension, and size checks on YAML import (max 1 MB)
- **Better error messages**: YAML validation now shows fix hints (indentation, colors, structure)
- **Tablet breakpoint**: Responsive layout for 641–1024 px screens
- **`search-engines.js` module**: Shared presets, storage helpers, and URL builder
- **`icon-picker.js` module**: Curated Material Icons grid with search
- **`background.js`**: Background service worker for context menu
- **Color swatch accessibility**: `aria-label` on all color swatches
- **Full icon library**: 4 176 Material Icons with 17 iOS-style category tabs
- **AI-ready repo**: `.github/copilot-instructions.md`, scoped `.instructions.md` files, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.editorconfig`, `.vscode/settings.json`, `.vscode/extensions.json`

### Changed
- **Manifest**: Added `contextMenus` permission, background service worker
- **Test suite**: 73 tests (was 61) — added `search-engines.test.js` and `icon-picker.test.js`

## [2.0.0] – 2026-03-30

### Added
- **Groups system**: Sections are now organized in named groups (tab navigation in the board)
- **WYSIWYG editor**: Visual groups/sections/links editor with color picker (9 Chrome Tab Group colors)
- **Drag & drop**: Move sections between groups, reorder groups via drag handle
- **Sidebar navigation**: Four views — General, Groups, YAML, Backup
- **Backup system**: Automatic backups (up to 10) with restore
- **Export/import**: Export and import config as YAML file
- **Clipboard**: Copy config to clipboard
- **Chrome Tab Groups**: Links open in color-matched Chrome Tab Groups
- **Search**: Live search across all sections and links in the board
- **Storage indicator**: Warning on high storage usage
- **Section icons**: Configurable Material Symbols (Outlined) icons per section
- **Section colors**: 9 Chrome colors (blue, green, red, yellow, purple, cyan, pink, orange, grey)
- **YAML validation**: Real-time validation with error details and line numbers
- **Legacy support**: Old `sections:`-only configs are automatically migrated to groups
- **CSP**: Content Security Policy for Google Fonts
- **Test suite**: 61 tests (unquote, parseConfigYAML, normalize, configToYAML, roundtrip)

### Fixed
- **Storage bug**: Switched from `chrome.storage.sync` (8 KB per item limit) to `chrome.storage.local` (5 MB)
- **Automatic migration**: Existing configs are migrated once from sync → local
- **Error display**: Error messages stay visible (no longer hidden after 2 s)
- **General view status**: Dedicated status element instead of invisible groups status
- **Comment parsing**: `#` in URLs is no longer truncated as YAML comment

### Changed
- Complete redesign of the options page with sidebar layout
- Config format: `groups > sections > links` instead of flat `sections > links`
- Colors are now per section instead of per group

## [1.0.0] – Initial release

### Added
- Link dashboard as Chrome new tab override
- YAML-based configuration
- Sections with links and dividers
- Direct YAML editor in options
