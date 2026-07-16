/* ── Material Icons Picker (Category Tabs) ───────────────────── */
import { ICON_CATEGORIES } from './icon-data.js';

/* Category tab icons (one Material icon per category) */
const CAT_ICONS = {
  actions: 'flash_on', activities: 'fitness_center', business: 'business',
  chat: 'chat', devices: 'devices', editor: 'edit_note',
  hardware: 'memory', home: 'home', household: 'kitchen',
  maps: 'map', media: 'play_circle', photos: 'photo_camera',
  privacy: 'shield', social: 'people', transit: 'directions_car',
  travel: 'flight', ui: 'widgets',
};

/**
 * Create an icon picker with iOS-style category tabs.
 * Returns the wrapper element.
 */
export function createIconPicker(currentIcon, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'icon-picker-wrap';

  /* ── Trigger button ──────────────────────────────────────── */
  const display = document.createElement('button');
  display.type = 'button';
  display.className = 'icon-picker-trigger';
  setDisplayValue(display, currentIcon);
  display.setAttribute('aria-label', 'Choose icon');

  /* ── Dropdown ────────────────────────────────────────────── */
  const dropdown = document.createElement('div');
  dropdown.className = 'icon-picker-dropdown hidden';

  /* Search bar */
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'icon-picker-search';
  searchInput.placeholder = 'Search 4 000+ icons…';
  searchInput.setAttribute('aria-label', 'Search icons');

  /* Category tabs (iOS emoji-style horizontal scroll) */
  const tabBar = document.createElement('div');
  tabBar.className = 'icon-picker-tabs';

  /* Grid container */
  const gridWrap = document.createElement('div');
  gridWrap.className = 'icon-picker-grid-wrap';

  const grid = document.createElement('div');
  grid.className = 'icon-picker-grid';
  gridWrap.appendChild(grid);

  /* Build tabs */
  const tabs = [];

  ICON_CATEGORIES.forEach(cat => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'icon-picker-tab';
    tab.title = cat.label;
    tab.setAttribute('aria-label', cat.label);
    tab.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${CAT_ICONS[cat.id] || 'category'}</span>`;
    tab.addEventListener('click', () => {
      activateCategory(cat, tab);
      searchInput.value = '';
    });
    tabBar.appendChild(tab);
    tabs.push({ tab, cat });
  });

  /* Assemble dropdown */
  dropdown.appendChild(searchInput);
  dropdown.appendChild(tabBar);
  dropdown.appendChild(gridWrap);
  wrap.appendChild(display);
  wrap.appendChild(dropdown);

  /* ── Render a category into the grid ─────────────────────── */
  function activateCategory(cat, tabEl) {
    tabs.forEach(t => t.tab.classList.remove('active'));
    tabEl.classList.add('active');
    renderIcons(cat.icons, currentIcon);
  }

  /* ── Render icons (virtualized — show up to 200 at a time) ─ */
  function renderIcons(icons, selected) {
    grid.innerHTML = '';

    /* "None" option (only when not searching) */
    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.className = 'icon-picker-item icon-picker-none' + (!selected ? ' active' : '');
    noneBtn.title = 'No icon';
    noneBtn.setAttribute('aria-label', 'No icon');
    noneBtn.textContent = '✕';
    noneBtn.addEventListener('click', () => selectIcon(''));
    grid.appendChild(noneBtn);

    const fragment = document.createDocumentFragment();
    icons.forEach(name => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'icon-picker-item' + (name === selected ? ' active' : '');
      btn.title = name;
      btn.setAttribute('aria-label', name);
      btn.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
      btn.addEventListener('click', () => selectIcon(name));
      fragment.appendChild(btn);
    });
    grid.appendChild(fragment);
    gridWrap.scrollTop = 0;
  }

  /* ── Search across ALL categories ────────────────────────── */
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    if (!q) {
      /* Restore active category */
      const active = tabs.find(t => t.tab.classList.contains('active'));
      if (active) renderIcons(active.cat.icons, currentIcon);
      else if (tabs[0]) activateCategory(tabs[0].cat, tabs[0].tab);
      tabs.forEach(t => t.tab.classList.remove('search-dimmed'));
      return;
    }
    /* Search all categories */
    tabs.forEach(t => t.tab.classList.add('search-dimmed'));
    const results = [];
    ICON_CATEGORIES.forEach(cat => {
      cat.icons.forEach(name => {
        if (name.includes(q)) results.push(name);
      });
    });
    renderIcons(results, currentIcon);
  });

  /* ── Toggle dropdown ─────────────────────────────────────── */
  display.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = !dropdown.classList.contains('hidden');
    closeAllPickers();
    if (!isOpen) {
      dropdown.classList.remove('hidden');
      searchInput.value = '';
      /* Find which category the current icon belongs to, or default to first */
      let startCat = tabs[0];
      if (currentIcon) {
        const found = tabs.find(t => t.cat.icons.includes(currentIcon));
        if (found) startCat = found;
      }
      activateCategory(startCat.cat, startCat.tab);
      requestAnimationFrame(() => searchInput.focus());
    }
  });

  /* ── Select icon ─────────────────────────────────────────── */
  function selectIcon(name) {
    currentIcon = name;
    setDisplayValue(display, name);
    dropdown.classList.add('hidden');
    if (onChange) onChange(name);
  }

  /* ── Value accessor ──────────────────────────────────────── */
  wrap._getValue = () => currentIcon || '';

  return wrap;
}

/* ── Helpers ──────────────────────────────────────────────────── */

function setDisplayValue(display, name) {
  display.textContent = '';

  if (name) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-symbols-outlined';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = name;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'icon-picker-label';
    labelSpan.textContent = name;

    display.appendChild(iconSpan);
    display.appendChild(labelSpan);
  } else {
    const placeholderSpan = document.createElement('span');
    placeholderSpan.className = 'icon-picker-label icon-picker-placeholder';
    placeholderSpan.textContent = 'Choose icon…';
    display.appendChild(placeholderSpan);
  }
}

function closeAllPickers() {
  document.querySelectorAll('.icon-picker-dropdown').forEach(d => d.classList.add('hidden'));
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    if (!e.target.closest('.icon-picker-wrap')) closeAllPickers();
  });
}
