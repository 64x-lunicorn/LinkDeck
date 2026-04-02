import { parseConfigYAML, normalize } from './parser.js';

/* ── Pastel color mapping for Chrome tab group enums ─────────── */

const PASTEL_MAP = {
  blue:   { bg: '#c5d0f0', accent: '#7b8fd4' },
  green:  { bg: '#b8e0c8', accent: '#6aad82' },
  red:    { bg: '#f0c5c5', accent: '#d47b7b' },
  yellow: { bg: '#f0e4c0', accent: '#d4b860' },
  purple: { bg: '#d8c5f0', accent: '#a07bd4' },
  cyan:   { bg: '#c0e4f0', accent: '#60b8d4' },
  pink:   { bg: '#f0c5d8', accent: '#d47ba0' },
  orange: { bg: '#f0d8c0', accent: '#d4a060' },
  grey:   { bg: '#d8d8d8', accent: '#9a9a9a' },
};

function pastel(chromeColor) {
  return PASTEL_MAP[chromeColor] || PASTEL_MAP.grey;
}

/* ── DOM helpers ─────────────────────────────────────────────── */

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object')
      Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(ch => {
    if (ch == null) return;
    if (typeof ch === 'string') el.appendChild(document.createTextNode(ch));
    else el.appendChild(ch);
  });
  return el;
}

/* ── Config loader ───────────────────────────────────────────── */

async function getConfigText() {
  try {
    let { yamlText } = await chrome.storage.local.get(['yamlText']);
    /* Migrate from sync → local (one-time) */
    if (!yamlText) {
      const sync = await chrome.storage.sync.get(['yamlText']);
      if (sync.yamlText) {
        yamlText = sync.yamlText;
        await chrome.storage.local.set({ yamlText });
        await chrome.storage.sync.remove('yamlText');
      }
    }
    if (yamlText && typeof yamlText === 'string') return yamlText;
  } catch { /* chrome.* not available (preview) */ }
  const res = await fetch('default.config.yaml');
  return await res.text();
}

/* ── DOM references ──────────────────────────────────────────── */

const mount     = document.getElementById('mount');
const err       = document.getElementById('error');
const tabBar    = document.getElementById('tabBar');
const titleEl   = document.getElementById('boardTitle');
const searchIn  = document.getElementById('searchInput');

const TAB_KEY = 'linkdeck_activeTab';

/* ── Open link in Chrome Tab Group ───────────────────────────── */

async function openInTabGroup(url, groupName, chromeColor) {
  /* Check API availability first — fallback before creating any tab */
  if (!chrome?.tabs?.create) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  const tab = await chrome.tabs.create({ url, active: true });

  /* Try to assign to a tab group (best-effort, don't open again on failure) */
  try {
    const existing = await chrome.tabGroups.query({
      title: groupName,
      windowId: tab.windowId,
    });

    let groupId;
    if (existing.length > 0) {
      groupId = existing[0].id;
      await chrome.tabs.group({ tabIds: [tab.id], groupId });
    } else {
      groupId = await chrome.tabs.group({
        tabIds: [tab.id],
        createProperties: { windowId: tab.windowId },
      });
      await chrome.tabGroups.update(groupId, {
        title: groupName,
        color: chromeColor,
      });
    }
  } catch {
    /* Tab is already open — just skip grouping */
  }
}

/* ── Build a card for a section ──────────────────────────────── */

function buildCard(sec) {
  const colors = pastel(sec.color);

  const listItems = sec.links.map(l => {
    if (l.type === 'divider') {
      return h('li', {}, h('hr', { class: 'link-divider', role: 'separator', 'aria-hidden': 'true' }));
    }
    const a = h('a', { class: 'link-item', href: l.url }, l.label);
    a.addEventListener('click', e => {
      e.preventDefault();
      openInTabGroup(l.url, sec.title, sec.color);
    });
    return h('li', {}, a);
  });

  const ul = h('ul', { class: 'link-list' }, listItems);

  const headerChildren = [];
  if (sec.icon) {
    headerChildren.push(h('span', { class: 'material-symbols-outlined section-icon' }, sec.icon));
  }
  headerChildren.push(h('span', {}, sec.title));

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, h('h3', { class: 'card-title' }, headerChildren)),
    h('div', { class: 'card-body' }, ul),
  ]);

  card.style.setProperty('--card-accent', colors.accent);

  return card;
}

/* ── Render ───────────────────────────────────────────────────── */

let currentCfg = null;

function render(cfg) {
  currentCfg = cfg;
  mount.innerHTML = '';
  tabBar.innerHTML = '';

  /* Title */
  if (titleEl && cfg.title) {
    titleEl.textContent = cfg.title;
    document.title = cfg.title;
  }

  const groups = cfg.groups;

  /* Single group → no tab bar needed */
  if (groups.length === 1) {
    tabBar.classList.add('hidden');
    const panel = h('div', { class: 'card-grid tab-panel active', 'data-group': '0' });
    groups[0].sections.forEach(sec => panel.appendChild(buildCard(sec)));
    mount.appendChild(panel);
    return;
  }

  /* Multiple groups → render tabs */
  tabBar.classList.remove('hidden');
  const savedIdx = parseInt(sessionStorage.getItem(TAB_KEY), 10) || 0;
  const activeIdx = savedIdx < groups.length ? savedIdx : 0;

  groups.forEach((grp, i) => {
    /* Tab button — neutral (no group color) */
    const btn = h('button', {
      class: 'tab-btn',
      role: 'tab',
      'aria-selected': i === activeIdx ? 'true' : 'false',
      'data-idx': String(i),
    }, grp.name);
    btn.addEventListener('click', () => activateTab(i));
    tabBar.appendChild(btn);

    /* Tab panel */
    const panel = h('div', {
      class: 'card-grid tab-panel' + (i === activeIdx ? ' active' : ''),
      role: 'tabpanel',
      'data-group': String(i),
    });
    grp.sections.forEach(sec => panel.appendChild(buildCard(sec)));
    mount.appendChild(panel);
  });
}

/* ── Tab switching ───────────────────────────────────────────── */

function activateTab(idx) {
  tabBar.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });
  mount.querySelectorAll('.tab-panel').forEach((p, i) => {
    p.classList.toggle('active', i === idx);
  });
  sessionStorage.setItem(TAB_KEY, String(idx));
}

/* ── Search ──────────────────────────────────────────────────── */

function applySearch(query) {
  const q = query.trim().toLowerCase();

  mount.querySelectorAll('.tab-panel').forEach(panel => {
    let visibleCards = 0;

    panel.querySelectorAll('.card').forEach(card => {
      if (!q) { card.classList.remove('hidden'); visibleCards++; return; }

      const title = (card.querySelector('.card-title')?.textContent || '').toLowerCase();
      const links = Array.from(card.querySelectorAll('.link-item'))
        .map(a => a.textContent.toLowerCase());

      const match = title.includes(q) || links.some(l => l.includes(q));
      card.classList.toggle('hidden', !match);
      if (match) visibleCards++;
    });

    /* No-results hint */
    let hint = panel.querySelector('.no-results');
    if (visibleCards === 0 && q) {
      if (!hint) {
        hint = h('div', { class: 'no-results' }, 'No results for \u201C' + query.trim() + '\u201D');
        panel.appendChild(hint);
      } else {
        hint.textContent = 'No results for \u201C' + query.trim() + '\u201D';
        hint.classList.remove('hidden');
      }
    } else if (hint) {
      hint.classList.add('hidden');
    }
  });
}

if (searchIn) {
  searchIn.addEventListener('input', () => applySearch(searchIn.value));

  /* Keyboard shortcut: "/" focuses search, Escape clears */
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== searchIn) {
      e.preventDefault();
      searchIn.focus();
    }
    if (e.key === 'Escape' && document.activeElement === searchIn) {
      searchIn.value = '';
      applySearch('');
      searchIn.blur();
    }
  });
}

/* ── Boot ─────────────────────────────────────────────────────── */

async function boot() {
  try {
    const yamlText = await getConfigText();
    let cfg = parseConfigYAML(yamlText);
    cfg = normalize(cfg);
    render(cfg);
    if (err) err.textContent = '';
  } catch (e) {
    mount.innerHTML = '';
    const msg = h('div', { class: 'alert alert-error' },
      'YAML configuration error:\n' + (e && e.message ? e.message : String(e))
    );
    if (err) { err.innerHTML = ''; err.appendChild(msg); }
    else document.body.appendChild(msg);
  }
}

boot();

/* ── Options button ──────────────────────────────────────────── */

(function wireOptionsButton() {
  const btn = document.getElementById('openOptions');
  if (!btn) return;
  btn.addEventListener('click', e => {
    e.preventDefault();
    if (chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.location.href = 'options.html';
    }
  });
})();
