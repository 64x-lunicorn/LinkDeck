/* ── Background Service Worker ────────────────────────────────── */
/* Adds a "Add to LinkDeck" context menu item for links and pages */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-linkdeck',
    title: 'Add to LinkDeck',
    contexts: ['link', 'page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'add-to-linkdeck') return;

  const url = info.linkUrl || info.pageUrl || tab?.url;
  const label = info.linkUrl ? (info.selectionText || new URL(url).hostname) : (tab?.title || new URL(url).hostname);

  if (!url) return;

  try {
    const { yamlText } = await chrome.storage.local.get(['yamlText']);
    if (!yamlText) {
      /* No config yet → open options */
      chrome.runtime.openOptionsPage();
      return;
    }

    /* Append link to the first section of the first group */
    const lines = yamlText.split('\n');
    let insertIdx = -1;
    let indent = '';

    /* Find the first "links:" line and its indentation */
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\s*)links:\s*$/);
      if (m) {
        indent = m[1] + '    ';
        insertIdx = i + 1;
        /* Skip existing link entries to append at end */
        while (insertIdx < lines.length) {
          const nextLine = lines[insertIdx];
          if (!nextLine.trim() || nextLine.match(/^\s*-/)) {
            if (nextLine.trim() && nextLine.match(/^\s*-/)) {
              insertIdx++;
              /* Also skip continuation lines (url:, label: without dash) */
              while (insertIdx < lines.length && lines[insertIdx].trim() && !lines[insertIdx].match(/^\s*-/) && lines[insertIdx].match(/^\s+\w/)) {
                insertIdx++;
              }
              continue;
            }
            break;
          }
          break;
        }
        break;
      }
    }

    if (insertIdx === -1) {
      /* Could not find a links section — open options instead */
      chrome.runtime.openOptionsPage();
      return;
    }

    /* Build the new link YAML */
    const safeLabel = quoteYAML(label);
    const safeUrl = quoteYAML(url);
    const newLines = [
      `${indent}- label: ${safeLabel}`,
      `${indent}  url: ${safeUrl}`,
    ];

    lines.splice(insertIdx, 0, ...newLines);
    const updatedYaml = lines.join('\n');

    await chrome.storage.local.set({ yamlText: updatedYaml });

    /* Show a brief badge */
    chrome.action?.setBadgeText?.({ text: '✓', tabId: tab?.id });
    chrome.action?.setBadgeBackgroundColor?.({ color: '#017e3a', tabId: tab?.id });
    setTimeout(() => {
      chrome.action?.setBadgeText?.({ text: '', tabId: tab?.id });
    }, 2000);

  } catch {
    /* Fallback: open options page */
    chrome.runtime.openOptionsPage();
  }
});

function quoteYAML(s) {
  if (/[:#'"{}[\],&*?|>!%@`]/.test(s) || s.trim() !== s) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return s;
}
