/* ── Search Engine Presets & Helpers ──────────────────────────── */

export const SEARCH_ENGINES = [
  { id: 'ecosia',      name: 'Ecosia',      urlTemplate: 'https://www.ecosia.org/search?q={query}' },
  { id: 'duckduckgo',  name: 'DuckDuckGo',  urlTemplate: 'https://duckduckgo.com/?q={query}' },
  { id: 'google',      name: 'Google',       urlTemplate: 'https://www.google.com/search?q={query}' },
  { id: 'bing',        name: 'Bing',         urlTemplate: 'https://www.bing.com/search?q={query}' },
];

export const DEFAULT_ENGINE = SEARCH_ENGINES[0]; // Ecosia

const STORAGE_KEY = 'searchEngine';

export async function loadSearchEngine() {
  try {
    const { [STORAGE_KEY]: saved } = await chrome.storage.local.get([STORAGE_KEY]);
    if (saved && saved.id && saved.urlTemplate) return saved;
  } catch { /* preview mode or no storage */ }
  return DEFAULT_ENGINE;
}

export async function saveSearchEngine(engine) {
  await chrome.storage.local.set({ [STORAGE_KEY]: engine });
}

export function buildSearchURL(engine, query) {
  return engine.urlTemplate.replace('{query}', encodeURIComponent(query));
}

export async function loadSearchBarVisible() {
  try {
    const { searchBarVisible } = await chrome.storage.local.get(['searchBarVisible']);
    return searchBarVisible !== false; // default true
  } catch { return true; }
}

export async function saveSearchBarVisible(visible) {
  await chrome.storage.local.set({ searchBarVisible: visible });
}
