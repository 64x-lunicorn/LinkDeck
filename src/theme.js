/* ── Theme Toggle (light / system / dark) ────────────────────── */

(function initTheme() {
  const STORAGE_KEY = 'linkdeck_theme';

  function applyTheme(choice) {
    if (choice === 'light' || choice === 'dark') {
      document.documentElement.setAttribute('data-theme', choice);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function syncButtons(choice) {
    document.querySelectorAll('.theme-toggle button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === choice);
    });
  }

  /* Restore saved preference */
  let saved = 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') saved = stored;
  } catch { /* localStorage unavailable */ }

  applyTheme(saved);

  /* Wire up buttons once DOM is ready */
  function wireToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    syncButtons(saved);

    toggle.addEventListener('click', e => {
      const btn = e.target.closest('button[data-theme]');
      if (!btn) return;
      const choice = btn.dataset.theme;
      applyTheme(choice);
      syncButtons(choice);
      try {
        if (choice === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, choice);
      } catch { /* ignore */ }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireToggle);
  } else {
    wireToggle();
  }
})();
