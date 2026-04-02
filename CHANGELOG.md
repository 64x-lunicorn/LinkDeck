# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
