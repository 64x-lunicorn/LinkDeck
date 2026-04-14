import { parseConfigYAML, normalize, configToYAML } from './parser.js';
import { SEARCH_ENGINES, loadSearchEngine, saveSearchEngine, loadSearchBarVisible, saveSearchBarVisible } from './search-engines.js';
import { createIconPicker } from './icon-picker.js';

(async function init() {
  /* ── DOM refs ──────────────────────────────────────────────── */
  const ta             = document.getElementById('yaml');
  const status         = document.getElementById('status');
  const validation     = document.getElementById('validation');
  const saveBtn        = document.getElementById('save');
  const lineNumbers    = document.getElementById('lineNumbers');
  const storageWarning = document.getElementById('storageWarning');
  const editorWrap     = document.getElementById('editorWrap');
  const groupsEditor   = document.getElementById('groupsEditor');
  const groupsStatus   = document.getElementById('groupsStatus');
  const cfgTitle       = document.getElementById('cfgTitle');

  /* ── Sidebar navigation ────────────────────────────────────── */
  const sidebarBtns = document.querySelectorAll('.sidebar-item[data-view]');
  const viewPanels  = document.querySelectorAll('.view-panel');

  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.view;
      sidebarBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewPanels.forEach(p => {
        p.classList.toggle('active', p.id === 'view' + target.charAt(0).toUpperCase() + target.slice(1));
      });
      /* Sync data when switching views */
      if (target === 'yaml')   syncFormToYAML();
      if (target === 'groups') syncYAMLToForm();
      if (target === 'general') syncYAMLToGeneral();
    });
  });

  /* ── State ─────────────────────────────────────────────────── */
  let currentConfig = null;

  /* ── Load defaults ─────────────────────────────────────────── */
  async function loadDefaults() {
    const res = await fetch('default.config.yaml');
    return await res.text();
  }

  /* ── Load from storage ─────────────────────────────────────── */
  let yamlText;
  try {
    const result = await chrome.storage.local.get(['yamlText']);
    yamlText = result.yamlText;
    /* Migrate from sync → local (one-time) */
    if (!yamlText) {
      const sync = await chrome.storage.sync.get(['yamlText']);
      if (sync.yamlText) {
        yamlText = sync.yamlText;
        await chrome.storage.local.set({ yamlText });
        await chrome.storage.sync.remove('yamlText');
      }
    }
  } catch { /* preview mode */ }
  ta.value = yamlText || await loadDefaults();

  /* ── Line numbers ──────────────────────────────────────────── */
  function updateLineNumbers() {
    const n = ta.value.split('\n').length;
    const nums = [];
    for (let i = 1; i <= n; i++) nums.push(i);
    lineNumbers.textContent = nums.join('\n');
  }
  ta.addEventListener('input', updateLineNumbers);
  ta.addEventListener('scroll', () => { lineNumbers.scrollTop = ta.scrollTop; });

  /* ── Storage limit (local = 5 MB) ────────────────────────── */
  const LOCAL_QUOTA = 5242880;
  function checkStorageUsage(text) {
    const bytes  = new Blob([text]).size;
    const pct    = bytes / LOCAL_QUOTA;
    const pctStr = (pct * 100).toFixed(1);
    const kbStr  = (bytes / 1024).toFixed(1);
    const maxKb  = (LOCAL_QUOTA / 1024).toFixed(0);
    if (pct >= 0.95) {
      storageWarning.textContent = `Storage almost full: ${kbStr} / ${maxKb} KB (${pctStr}%)`;
      storageWarning.className = 'storage-warning critical';
    } else if (pct >= 0.80) {
      storageWarning.textContent = `Storage: ${kbStr} / ${maxKb} KB (${pctStr}%)`;
      storageWarning.className = 'storage-warning warn';
    } else {
      storageWarning.className = 'storage-warning hidden';
    }
  }

  /* ── YAML validation ───────────────────────────────────────── */
  function validateYAML(yaml) {
    try {
      const cfg = normalize(parseConfigYAML(yaml));
      const nSec  = cfg.groups.reduce((s, g) => s + g.sections.length, 0);
      const nLink = cfg.groups.reduce((s, g) =>
        s + g.sections.reduce((s2, sec) => s2 + sec.links.filter(l => l.type !== 'divider').length, 0), 0);
      validation.textContent = `✓ Valid — ${cfg.groups.length} group${cfg.groups.length !== 1 ? 's' : ''}, ${nSec} sections, ${nLink} links`;
      validation.className = 'validation-bar valid';
      if (editorWrap) { editorWrap.classList.remove('is-invalid'); editorWrap.classList.add('is-valid'); }
      saveBtn.disabled = false;
      currentConfig = cfg;
      return cfg;
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      let hint = '';
      if (/indent/i.test(msg)) hint = ' — Tip: use consistent 2-space indentation';
      else if (/color/i.test(msg)) hint = ' — Valid colors: blue, green, red, yellow, purple, cyan, pink, orange, grey';
      else if (/title/i.test(msg)) hint = ' — Each section needs a title field';
      else if (/groups|sections/i.test(msg)) hint = ' — Check YAML structure: groups > sections > links';
      else if (/url|label/i.test(msg)) hint = ' — Each link needs both label and url fields';
      validation.textContent = '✗ ' + msg + hint;
      validation.className = 'validation-bar invalid';
      if (editorWrap) { editorWrap.classList.remove('is-valid'); editorWrap.classList.add('is-invalid'); }
      saveBtn.disabled = true;
      return null;
    }
  }

  let debounce = null;
  ta.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      validateYAML(ta.value);
      checkStorageUsage(ta.value);
    }, 300);
  });

  /* Initial validation */
  validateYAML(ta.value);
  updateLineNumbers();
  checkStorageUsage(ta.value);

  /* ── Sync helpers ──────────────────────────────────────────── */
  function syncFormToYAML() {
    if (currentConfig) {
      ta.value = configToYAML(currentConfig);
      validateYAML(ta.value);
      updateLineNumbers();
      checkStorageUsage(ta.value);
    }
  }

  function syncYAMLToForm() {
    const cfg = validateYAML(ta.value);
    if (cfg) {
      currentConfig = cfg;
      buildGroupsEditor(cfg);
    }
  }

  function syncYAMLToGeneral() {
    const cfg = validateYAML(ta.value);
    if (cfg && cfgTitle) {
      cfgTitle.value = cfg.title || '';
    }
  }

  /* Initial sync */
  if (currentConfig && cfgTitle) cfgTitle.value = currentConfig.title || '';

  /* ── Status helper ─────────────────────────────────────────── */
  function showStatus(el, msg, type = 'success') {
    el.textContent = msg;
    el.className = `status-msg status-${type}`;
    if (type === 'success') {
      setTimeout(() => { el.textContent = ''; el.className = 'status-msg'; }, 2000);
    }
  }

  /* ── Backup system ─────────────────────────────────────────── */
  const MAX_BACKUPS = 10;
  async function getBackups() {
    try {
      const { yamlBackups } = await chrome.storage.local.get(['yamlBackups']);
      return Array.isArray(yamlBackups) ? yamlBackups : [];
    } catch { return []; }
  }

  async function pushBackup(text) {
    const backups = await getBackups();
    backups.unshift({ text, date: new Date().toISOString() });
    if (backups.length > MAX_BACKUPS) backups.length = MAX_BACKUPS;
    await chrome.storage.local.set({ yamlBackups: backups });
    renderBackups(backups);
  }

  function renderBackups(backups) {
    const list = document.getElementById('backupList');
    const none = document.getElementById('noBackups');
    list.innerHTML = '';
    if (!backups.length) { none.style.display = ''; return; }
    none.style.display = 'none';
    backups.forEach(b => {
      const d = new Date(b.date);
      const when = d.toLocaleDateString('en-US') + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const item = document.createElement('div');
      item.className = 'backup-item';
      item.innerHTML = `<span>${when}</span>`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-tertiary btn-sm';
      btn.textContent = 'Restore';
      btn.addEventListener('click', () => {
        ta.value = b.text;
        validateYAML(ta.value);
        updateLineNumbers();
        checkStorageUsage(ta.value);
        syncYAMLToForm();
        syncYAMLToGeneral();
        showStatus(status, 'Backup restored', 'info');
      });
      item.appendChild(btn);
      list.appendChild(item);
    });
  }
  renderBackups(await getBackups());

  /* ── Save (all views use this core) ────────────────────────── */
  async function saveConfig(text) {
    try {
      normalize(parseConfigYAML(text));
    } catch (e) {
      return 'Error: ' + (e && e.message ? e.message : String(e));
    }
    try {
      await pushBackup(text);
      await chrome.storage.local.set({ yamlText: text });
    } catch (e) {
      return 'Save failed: ' + (e && e.message ? e.message : String(e));
    }
    checkStorageUsage(text);
    return null;
  }

  /* ── YAML view: save button ────────────────────────────────── */
  saveBtn.addEventListener('click', async () => {
    const err = await saveConfig(ta.value);
    if (err) showStatus(status, err, 'error');
    else showStatus(status, 'Saved ✓');
  });

  /* ── Defaults button ───────────────────────────────────────── */
  document.getElementById('loadDefaults').addEventListener('click', async () => {
    ta.value = await loadDefaults();
    validateYAML(ta.value);
    updateLineNumbers();
    checkStorageUsage(ta.value);
    syncYAMLToGeneral();
    showStatus(status, 'Defaults loaded', 'info');
  });

  /* ── Export ─────────────────────────────────────────────────── */
  document.getElementById('exportFile').addEventListener('click', () => {
    syncFormToYAML();
    const blob = new Blob([ta.value], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkdeck-config-${new Date().toISOString().slice(0,10)}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ── Import ─────────────────────────────────────────────────── */
  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    /* File validation */
    const MAX_IMPORT_SIZE = 1024 * 1024; // 1 MB
    const ALLOWED_TYPES = ['text/yaml', 'text/x-yaml', 'application/x-yaml', 'text/plain', ''];
    const ALLOWED_EXTS  = ['.yaml', '.yml', '.txt'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext)) {
      showStatus(status, 'Invalid file type — please import a .yaml or .yml file', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMPORT_SIZE) {
      showStatus(status, `File too large (${(file.size / 1024).toFixed(0)} KB) — max 1 MB`, 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      ta.value = reader.result;
      validateYAML(ta.value);
      updateLineNumbers();
      checkStorageUsage(ta.value);
      syncYAMLToForm();
      syncYAMLToGeneral();
      showStatus(status, `"${file.name}" loaded — please review and save`, 'info');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  /* ── Clipboard ──────────────────────────────────────────────── */
  document.getElementById('copyClipboard').addEventListener('click', async () => {
    syncFormToYAML();
    try {
      await navigator.clipboard.writeText(ta.value);
      showStatus(status, 'Copied to clipboard ✓');
    } catch {
      showStatus(status, 'Copy failed', 'error');
    }
  });

  /* ── General view: save title ──────────────────────────────── */
  const generalStatus = document.getElementById('generalStatus');
  document.getElementById('saveGeneral').addEventListener('click', async () => {
    if (currentConfig) {
      currentConfig.title = cfgTitle.value.trim() || 'LinkDeck';
      syncFormToYAML();
      const err = await saveConfig(ta.value);
      if (err) showStatus(generalStatus, err, 'error');
      else showStatus(generalStatus, 'Saved ✓');
    }
  });

  /* ═══════════════════════════════════════════════════════════════
     WYSIWYG Groups Editor
     ═══════════════════════════════════════════════════════════════ */

  const CHROME_COLORS = [
    { name: 'blue',   label: 'Blue',    pastel: '#c5d0f0', accent: '#7b8fd4' },
    { name: 'green',  label: 'Green',   pastel: '#b8e0c8', accent: '#6aad82' },
    { name: 'red',    label: 'Red',     pastel: '#f0c5c5', accent: '#d47b7b' },
    { name: 'yellow', label: 'Yellow',  pastel: '#f0e4c0', accent: '#d4b860' },
    { name: 'purple', label: 'Purple',  pastel: '#d8c5f0', accent: '#a07bd4' },
    { name: 'cyan',   label: 'Cyan',    pastel: '#c0e4f0', accent: '#60b8d4' },
    { name: 'pink',   label: 'Pink',    pastel: '#f0c5d8', accent: '#d47ba0' },
    { name: 'orange', label: 'Orange',  pastel: '#f0d8c0', accent: '#d4a060' },
    { name: 'grey',   label: 'Grey',    pastel: '#d8d8d8', accent: '#9a9a9a' },
  ];

  function accentForColor(name) {
    return CHROME_COLORS.find(c => c.name === name)?.accent || '#9a9a9a';
  }

  /* ── Read form → currentConfig ─────────────────────────────── */
  function readFormToConfig() {
    if (!currentConfig) return;
    currentConfig.title = cfgTitle.value.trim() || currentConfig.title;

    const groupEls = groupsEditor.querySelectorAll('.collection-card[data-group-idx]');
    const groups = [];

    groupEls.forEach(gEl => {
      const name  = gEl.querySelector('.group-name-input')?.value.trim() || 'Unnamed';
      const sections = [];

      gEl.querySelectorAll('.section-card[data-section-idx]').forEach(sEl => {
        const title = sEl.querySelector('.section-title-input')?.value.trim() || 'Unnamed';
        const iconPickerEl = sEl.querySelector('.icon-picker-wrap');
        const icon  = iconPickerEl?._getValue?.() || '';
        const color = sEl.dataset.chromeColor || 'grey';
        const links = [];

        sEl.querySelectorAll('.link-row[data-link-idx]').forEach(lEl => {
          if (lEl.dataset.divider === 'true') {
            links.push({ type: 'divider' });
          } else {
            const label = lEl.querySelector('.link-label-input')?.value.trim() || '';
            const url   = lEl.querySelector('.link-url-input')?.value.trim() || '';
            if (label && url) links.push({ label, url });
          }
        });

        sections.push({ title, icon, color, links });
      });

      groups.push({ name, sections });
    });

    currentConfig.groups = groups;
  }

  /* ── Undo / Redo (snapshot-based) ────────────────────────────── */
  const MAX_UNDO = 30;
  const undoStack = [];
  let redoStack = [];
  const undoBtn = document.getElementById('undoGroups');
  const redoBtn = document.getElementById('redoGroups');

  function snapshotConfig() {
    if (!currentConfig) return;
    readFormToConfig();
    return JSON.stringify(currentConfig);
  }

  function pushUndo() {
    const snap = snapshotConfig();
    if (!snap) return;
    if (undoStack.length && undoStack[undoStack.length - 1] === snap) return; // no change
    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
  }

  function undo() {
    if (undoStack.length < 2) return;
    redoStack.push(undoStack.pop());
    const prev = undoStack[undoStack.length - 1];
    currentConfig = normalize(JSON.parse(prev));
    buildGroupsEditor(currentConfig);
    syncFormToYAML();
    updateUndoRedoButtons();
  }

  function redo() {
    if (!redoStack.length) return;
    const next = redoStack.pop();
    undoStack.push(next);
    currentConfig = normalize(JSON.parse(next));
    buildGroupsEditor(currentConfig);
    syncFormToYAML();
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    if (undoBtn) undoBtn.disabled = undoStack.length < 2;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
  }

  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);

  /* Keyboard shortcuts for undo/redo */
  document.addEventListener('keydown', e => {
    const isGroupsView = document.querySelector('#viewGroups.view-panel.active');
    if (!isGroupsView) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      redo();
    }
  });

  /* ── Drag & drop state ──────────────────────────────────────── */
  let draggedSection = null;
  let draggedGroup = null;

  /* ── Build full editor ─────────────────────────────────────── */
  function buildGroupsEditor(cfg) {
    groupsEditor.innerHTML = '';
    cfg.groups.forEach((grp, gi) => {
      groupsEditor.appendChild(buildGroupCard(grp, gi));
    });
    updateSidebarGroups();
    /* push initial undo snapshot (only if stack is empty) */
    if (undoStack.length === 0) pushUndo();
  }

  /* ── Sidebar group sub-menu ────────────────────────────────── */
  const sidebarGroupsList = document.getElementById('sidebarGroupsList');

  function updateSidebarGroups() {
    if (!sidebarGroupsList) return;
    sidebarGroupsList.innerHTML = '';
    const groupCards = groupsEditor.querySelectorAll('.collection-card[data-group-idx]');
    groupCards.forEach((card) => {
      const name = card.querySelector('.group-name-input')?.value.trim() || 'Unnamed';
      const secCount = card.querySelectorAll('.section-card').length;
      const linkCount = card.querySelectorAll('.link-row').length;

      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebar-group-item';
      btn.innerHTML = `<span class="sidebar-group-name">${name}</span><span class="sidebar-group-badge">${secCount}s · ${linkCount}l</span>`;
      btn.addEventListener('click', () => {
        /* Switch to groups view if not active */
        const groupsBtn = document.querySelector('.sidebar-item[data-view="groups"]');
        if (groupsBtn && !groupsBtn.classList.contains('active')) {
          groupsBtn.click();
        }
        /* Expand if collapsed */
        if (card.classList.contains('collapsed')) {
          card.classList.remove('collapsed');
          const toggle = card.querySelector('.collapse-toggle');
          if (toggle) toggle.querySelector('.material-symbols-outlined').textContent = 'expand_less';
        }
        /* Scroll into view */
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.classList.add('highlight-pulse');
        setTimeout(() => card.classList.remove('highlight-pulse'), 800);
      });
      li.appendChild(btn);
      sidebarGroupsList.appendChild(li);
    });
  }

  /* ── Group drag & drop on container ────────────────────────── */
  groupsEditor.addEventListener('dragover', e => {
    if (!draggedGroup) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const afterEl = getDragAfterElement(groupsEditor, e.clientY);
    if (afterEl) {
      groupsEditor.insertBefore(draggedGroup, afterEl);
    } else {
      groupsEditor.appendChild(draggedGroup);
    }
  });

  groupsEditor.addEventListener('drop', e => {
    if (!draggedGroup) return;
    e.preventDefault();
    readFormToConfig();
    syncFormToYAML();
    draggedGroup = null;
    pushUndo();
  });

  function getDragAfterElement(container, y) {
    const cards = [...container.querySelectorAll('.collection-card:not(.dragging-group)')];
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    for (const child of cards) {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = child;
      }
    }
    return closest;
  }

  /* ── Section drag helpers ─────────────────────────────────── */
  function getSectionAfterElement(container, y) {
    const sections = [...container.querySelectorAll('.section-card:not(.dragging)')];
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    for (const child of sections) {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = child;
      }
    }
    return closest;
  }

  function clearDropIndicators() {
    document.querySelectorAll('.drop-before').forEach(el => el.classList.remove('drop-before'));
    document.querySelectorAll('.drop-at-end').forEach(el => el.classList.remove('drop-at-end'));
  }

  /* ── Group card ────────────────────────────────────────────── */
  function buildGroupCard(grp, gi) {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.dataset.groupIdx = gi;

    /* Header */
    const header = document.createElement('div');
    header.className = 'collection-card-header';

    /* Collapse toggle */
    const collapseBtn = makeIconBtn('expand_less', 'Collapse group');
    collapseBtn.className = 'icon-btn collapse-toggle';
    collapseBtn.addEventListener('click', () => {
      const collapsed = card.classList.toggle('collapsed');
      collapseBtn.querySelector('.material-symbols-outlined').textContent = collapsed ? 'expand_more' : 'expand_less';
    });

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'form-input group-name-input';
    titleInput.value = grp.name;
    titleInput.placeholder = 'Group name';
    titleInput.style.cssText = 'font-size:16px;font-weight:700;border:none;border-bottom:2px solid transparent;max-width:300px;';
    titleInput.addEventListener('focus', () => { titleInput.style.borderBottomColor = 'var(--color-info)'; });
    titleInput.addEventListener('blur', () => { titleInput.style.borderBottomColor = 'transparent'; updateSidebarGroups(); });

    /* Section count badge */
    const badge = document.createElement('span');
    badge.className = 'group-badge';
    badge.textContent = `${grp.sections.length} section${grp.sections.length !== 1 ? 's' : ''}`;

    const actions = document.createElement('div');
    actions.className = 'button-row';

    const dragHandle = makeIconBtn('drag_indicator', 'Move group');
    dragHandle.className = 'icon-btn drag-handle';
    dragHandle.addEventListener('mousedown', () => { card.draggable = true; });
    dragHandle.addEventListener('mouseup', () => { card.draggable = false; });
    actions.appendChild(dragHandle);

    const delBtn = makeIconBtn('delete', 'Delete group', 'danger');
    delBtn.addEventListener('click', () => {
      pushUndo();
      card.remove();
      readFormToConfig();
      syncFormToYAML();
      updateSidebarGroups();
      pushUndo();
    });
    actions.appendChild(delBtn);

    header.appendChild(collapseBtn);
    header.appendChild(titleInput);
    header.appendChild(badge);
    header.appendChild(actions);
    card.appendChild(header);

    /* Group drag start / end */
    card.addEventListener('dragstart', e => {
      if (!draggedGroup) {
        draggedGroup = card;
        card.classList.add('dragging-group');
        e.dataTransfer.effectAllowed = 'move';
      }
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging-group');
      card.draggable = false;
      draggedGroup = null;
      updateSidebarGroups();
    });

    /* Collapsible body */
    const body = document.createElement('div');
    body.className = 'collection-card-body';

    /* Sections */
    const sectionsWrap = document.createElement('div');
    sectionsWrap.className = 'sections-wrap';

    /* Drag & drop zone for sections (reorder within + move between groups) */
    sectionsWrap.addEventListener('dragover', e => {
      if (draggedGroup || !draggedSection) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      sectionsWrap.classList.add('drag-over');

      /* Show positional indicator */
      const afterEl = getSectionAfterElement(sectionsWrap, e.clientY);
      clearDropIndicators();
      if (afterEl) {
        afterEl.classList.add('drop-before');
      } else {
        sectionsWrap.classList.add('drop-at-end');
      }
    });
    sectionsWrap.addEventListener('dragleave', e => {
      if (!sectionsWrap.contains(e.relatedTarget)) {
        sectionsWrap.classList.remove('drag-over', 'drop-at-end');
        clearDropIndicators();
      }
    });
    sectionsWrap.addEventListener('drop', e => {
      e.preventDefault();
      sectionsWrap.classList.remove('drag-over', 'drop-at-end');
      clearDropIndicators();
      if (!draggedSection) return;

      const sourceWrap = draggedSection.parentElement;
      const sourceGroupCard = sourceWrap?.closest('.collection-card');
      const afterEl = getSectionAfterElement(sectionsWrap, e.clientY);

      /* Determine if anything changes */
      const isSameWrap = sourceWrap === sectionsWrap;
      const currentNext = draggedSection.nextElementSibling;
      if (isSameWrap && currentNext === afterEl) {
        draggedSection = null;
        return; /* no-op: dropped in same position */
      }

      pushUndo();
      if (afterEl) {
        sectionsWrap.insertBefore(draggedSection, afterEl);
      } else {
        sectionsWrap.appendChild(draggedSection);
      }
      readFormToConfig();
      syncFormToYAML();
      updateSidebarGroups();
      updateGroupBadge(card);
      if (sourceGroupCard && sourceGroupCard !== card) {
        updateGroupBadge(sourceGroupCard);
      }
      pushUndo();
      draggedSection = null;
    });

    grp.sections.forEach((sec, si) => {
      sectionsWrap.appendChild(buildSectionCard(sec, si, card));
    });
    body.appendChild(sectionsWrap);

    /* Add section button */
    const addSec = document.createElement('button');
    addSec.className = 'add-placeholder';
    addSec.type = 'button';
    addSec.innerHTML = '<span class="material-symbols-outlined">add</span> New Section';
    addSec.addEventListener('click', () => {
      const idx = sectionsWrap.querySelectorAll('.section-card').length;
      sectionsWrap.appendChild(buildSectionCard({ title: '', icon: '', links: [{ label: '', url: '' }] }, idx, card));
      updateGroupBadge(card);
      updateSidebarGroups();
    });
    body.appendChild(addSec);

    card.appendChild(body);

    return card;
  }

  /* ── Update group badge count ──────────────────────────────── */
  function updateGroupBadge(groupCard) {
    const badge = groupCard.querySelector('.group-badge');
    if (!badge) return;
    const count = groupCard.querySelectorAll('.section-card').length;
    badge.textContent = `${count} section${count !== 1 ? 's' : ''}`;
  }

  /* ── Section card ──────────────────────────────────────────── */
  function buildSectionCard(sec, si, parentGroupCard) {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.dataset.sectionIdx = si;
    card.dataset.chromeColor = sec.color || 'grey';
    card.style.borderLeftColor = accentForColor(sec.color);
    card.draggable = true;

    /* Drag start / end */
    card.addEventListener('dragstart', e => {
      draggedSection = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.sections-wrap.drag-over').forEach(el => el.classList.remove('drag-over'));
      draggedSection = null;
    });

    const header = document.createElement('div');
    header.className = 'section-card-header';

    /* Collapse toggle */
    const collapseBtn = makeIconBtn('expand_less', 'Collapse section');
    collapseBtn.className = 'icon-btn collapse-toggle';
    collapseBtn.addEventListener('click', () => {
      const collapsed = card.classList.toggle('sec-collapsed');
      collapseBtn.querySelector('.material-symbols-outlined').textContent = collapsed ? 'expand_more' : 'expand_less';
    });
    header.appendChild(collapseBtn);

    const titleIn = document.createElement('input');
    titleIn.type = 'text';
    titleIn.className = 'form-input section-title-input';
    titleIn.value = sec.title;
    titleIn.placeholder = 'Section title';
    titleIn.style.cssText = 'font-weight:600;flex:1;';

    const iconPicker = createIconPicker(sec.icon || '', () => {});
    iconPicker.style.cssText = 'flex-shrink:0;';

    /* Link count badge */
    const linkBadge = document.createElement('span');
    linkBadge.className = 'section-badge';
    const linkCount = sec.links ? sec.links.filter(l => l.type !== 'divider').length : 0;
    linkBadge.textContent = `${linkCount} link${linkCount !== 1 ? 's' : ''}`;

    const delSec = makeIconBtn('close', 'Remove section', 'danger');
    delSec.addEventListener('click', () => {
      pushUndo();
      card.remove();
      if (parentGroupCard) { updateGroupBadge(parentGroupCard); updateSidebarGroups(); }
      pushUndo();
    });

    header.appendChild(titleIn);
    header.appendChild(iconPicker);
    header.appendChild(linkBadge);
    header.appendChild(delSec);
    card.appendChild(header);

    /* Collapsible body */
    const body = document.createElement('div');
    body.className = 'section-card-body';

    /* Color picker — 9 Chrome Tab Group colors */
    const colorRow = document.createElement('div');
    colorRow.className = 'color-row';
    CHROME_COLORS.forEach(c => {
      const sw = document.createElement('button');
      sw.className = 'color-swatch' + (c.name === (sec.color || 'grey') ? ' active' : '');
      sw.style.background = c.pastel;
      sw.style.color = c.accent;
      sw.title = c.label;
      sw.setAttribute('aria-label', c.label);
      sw.type = 'button';
      sw.addEventListener('click', () => {
        colorRow.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        card.dataset.chromeColor = c.name;
        card.style.borderLeftColor = c.accent;
      });
      colorRow.appendChild(sw);
    });
    body.appendChild(colorRow);

    /* Links */
    const linksWrap = document.createElement('div');
    linksWrap.className = 'links-wrap';
    sec.links.forEach((lnk, li) => {
      linksWrap.appendChild(buildLinkRow(lnk, li));
    });
    body.appendChild(linksWrap);

    /* Add link row */
    const addRow = document.createElement('div');
    addRow.className = 'button-row';
    addRow.style.cssText = 'margin-top:4px;gap:4px;';

    const addLink = document.createElement('button');
    addLink.type = 'button';
    addLink.className = 'icon-btn';
    addLink.title = 'Add link';
    addLink.innerHTML = '<span class="material-symbols-outlined">add_link</span>';
    addLink.addEventListener('click', () => {
      const idx = linksWrap.querySelectorAll('.link-row').length;
      linksWrap.appendChild(buildLinkRow({ label: '', url: '' }, idx));
    });

    const addDiv = document.createElement('button');
    addDiv.type = 'button';
    addDiv.className = 'icon-btn';
    addDiv.title = 'Add divider';
    addDiv.innerHTML = '<span class="material-symbols-outlined">horizontal_rule</span>';
    addDiv.addEventListener('click', () => {
      const idx = linksWrap.querySelectorAll('.link-row').length;
      linksWrap.appendChild(buildLinkRow({ type: 'divider' }, idx));
    });

    addRow.appendChild(addLink);
    addRow.appendChild(addDiv);
    body.appendChild(addRow);

    card.appendChild(body);

    return card;
  }

  /* ── Link row ──────────────────────────────────────────────── */
  function buildLinkRow(lnk, li) {
    const row = document.createElement('div');
    row.dataset.linkIdx = li;

    if (lnk.type === 'divider') {
      row.className = 'link-row';
      row.dataset.divider = 'true';
      const marker = document.createElement('div');
      marker.className = 'divider-marker';
      marker.style.cssText = 'flex:1;display:flex;align-items:center;gap:8px;';
      marker.innerHTML = '<hr style="flex:1;border:0;border-top:1px dashed var(--color-border);"><span style="font-size:11px;color:var(--color-muted);">Divider</span><hr style="flex:1;border:0;border-top:1px dashed var(--color-border);">';
      const del = makeIconBtn('close', 'Remove', 'danger');
      del.addEventListener('click', () => row.remove());
      row.appendChild(marker);
      row.appendChild(del);
      return row;
    }

    row.className = 'link-row';
    const labelIn = document.createElement('input');
    labelIn.type = 'text';
    labelIn.className = 'form-input link-label-input';
    labelIn.value = lnk.label || '';
    labelIn.placeholder = 'Label';

    const urlIn = document.createElement('input');
    urlIn.type = 'text';
    urlIn.className = 'form-input link-url-input';
    urlIn.value = lnk.url || '';
    urlIn.placeholder = 'https://…';

    const del = makeIconBtn('close', 'Remove', 'danger');
    del.addEventListener('click', () => row.remove());

    row.appendChild(labelIn);
    row.appendChild(urlIn);
    row.appendChild(del);
    return row;
  }

  /* ── Icon button helper ────────────────────────────────────── */
  function makeIconBtn(icon, title, variant) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn' + (variant ? ' ' + variant : '');
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${icon}</span>`;
    return btn;
  }

  /* ── Add group button ──────────────────────────────────────── */
  document.getElementById('addGroup').addEventListener('click', () => {
    pushUndo();
    const idx = groupsEditor.querySelectorAll('.collection-card').length;
    const newGrp = {
      name: 'New Group',
      sections: [{ title: 'New Section', icon: '', color: 'grey', links: [{ label: '', url: '' }] }],
    };
    groupsEditor.appendChild(buildGroupCard(newGrp, idx));
    updateSidebarGroups();
    pushUndo();
  });

  /* ── Save groups button ────────────────────────────────────── */
  document.getElementById('saveGroups').addEventListener('click', async () => {
    readFormToConfig();
    syncFormToYAML();
    const err = await saveConfig(ta.value);
    if (err) showStatus(groupsStatus, err, 'error');
    else showStatus(groupsStatus, 'Saved ✓');
  });

  /* ── Initial form build ────────────────────────────────────── */
  if (currentConfig) {
    buildGroupsEditor(currentConfig);
  }

  /* ═══════════════════════════════════════════════════════════════
     Search Engine Settings
     ═══════════════════════════════════════════════════════════════ */

  const engineSelectEl      = document.getElementById('engineSelect');
  const customEngineFields  = document.getElementById('customEngineFields');
  const customEngineName    = document.getElementById('customEngineName');
  const customEngineUrl     = document.getElementById('customEngineUrl');
  const customEngineError   = document.getElementById('customEngineError');
  const searchBarVisibleCb  = document.getElementById('searchBarVisible');

  let selectedEngine = null;

  function buildEngineDropdown(activeId) {
    if (!engineSelectEl) return;
    engineSelectEl.innerHTML = '';

    SEARCH_ENGINES.forEach(eng => {
      const opt = document.createElement('option');
      opt.value = eng.id;
      opt.textContent = eng.name;
      if (eng.id === activeId) opt.selected = true;
      engineSelectEl.appendChild(opt);
    });

    /* Custom option */
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = 'Custom…';
    if (activeId === 'custom') customOpt.selected = true;
    engineSelectEl.appendChild(customOpt);

    engineSelectEl.addEventListener('change', () => {
      const val = engineSelectEl.value;
      if (val === 'custom') {
        selectedEngine = { id: 'custom', name: '', urlTemplate: '' };
        customEngineFields.classList.remove('hidden');
      } else {
        selectedEngine = SEARCH_ENGINES.find(e => e.id === val) || SEARCH_ENGINES[0];
        customEngineFields.classList.add('hidden');
      }
    });
  }

  /* Load current engine and init UI */
  (async function initSearchEngine() {
    const engine = await loadSearchEngine();
    const visible = await loadSearchBarVisible();
    selectedEngine = engine;

    if (searchBarVisibleCb) searchBarVisibleCb.checked = visible;

    const isPreset = SEARCH_ENGINES.some(e => e.id === engine.id);
    buildEngineDropdown(isPreset ? engine.id : 'custom');

    if (!isPreset) {
      customEngineFields.classList.remove('hidden');
      customEngineName.value = engine.name || '';
      customEngineUrl.value  = engine.urlTemplate || '';
    }
  })();

  /* Hook into general save button */
  const origSaveGeneralBtn = document.getElementById('saveGeneral');
  if (origSaveGeneralBtn) {
    origSaveGeneralBtn.addEventListener('click', async () => {
      /* Save search engine */
      try {
        let engineToSave = selectedEngine;

        if (selectedEngine && selectedEngine.id === 'custom') {
          const name = customEngineName.value.trim();
          const url  = customEngineUrl.value.trim();

          if (!name) {
            customEngineError.textContent = 'Please enter a name for your custom search engine.';
            customEngineError.classList.remove('hidden');
            return;
          }
          if (!url || !url.includes('{query}')) {
            customEngineError.textContent = 'URL template must contain {query} placeholder.';
            customEngineError.classList.remove('hidden');
            return;
          }
          customEngineError.classList.add('hidden');
          engineToSave = { id: 'custom', name, urlTemplate: url };
        }

        if (engineToSave) await saveSearchEngine(engineToSave);

        if (searchBarVisibleCb) {
          await saveSearchBarVisible(searchBarVisibleCb.checked);
        }
      } catch (e) {
        showStatus(generalStatus, 'Search engine save failed: ' + (e.message || e), 'error');
      }
    });
  }
})();
