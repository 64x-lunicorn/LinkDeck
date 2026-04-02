/* ────────────────────────────────────────────────────────────────
   parser.js – YAML-Parser + Normalize + Serializer für LinkDeck
   Supports: title, groups > sections > links (+ legacy sections-only)
   ──────────────────────────────────────────────────────────────── */

export function unquote(s) {
  if (s == null) return s;
  s = String(s).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/* ── Strip YAML comments (but not # inside quotes) ──────────── */

function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '#' && !inSingle && !inDouble) {
      return line.slice(0, i);
    }
  }
  return line;
}

/* ── YAML Parser ─────────────────────────────────────────────── */

export function parseConfigYAML(text) {
  const cfg = { title: '', groups: [], sections: [] };

  let currentGroup = null;
  let currentSection = null;
  let inGroups = false;
  let inSections = false;
  let inLinks = false;
  let linksIndent = 0;
  let lastLink = null;
  let groupSectionsIndent = 0;
  let inGroupSections = false;

  const lines = text
    .replace(/\t/g, '  ')
    .split(/\r?\n/)
    .map(stripComment);
  const indentOf = line => (line.match(/^\s*/) || [''])[0].length;

  for (const raw of lines) {
    if (!raw.trim()) continue;
    const ind = indentOf(raw);
    const line = raw.trim();

    /* ── Top-level title ──────────────────────────────────── */
    const titleMatch = line.match(/^title:\s*(.+)$/);
    if (titleMatch && !inGroups && !inSections && !inLinks) {
      cfg.title = unquote(titleMatch[1]);
      continue;
    }

    /* ── groups: ──────────────────────────────────────────── */
    if (/^groups:\s*$/.test(line)) {
      inGroups = true;
      inSections = false;
      inLinks = false;
      inGroupSections = false;
      currentGroup = null;
      currentSection = null;
      lastLink = null;
      continue;
    }

    /* ── Legacy: sections: (top-level) ────────────────────── */
    if (/^sections:\s*$/.test(line) && !inGroups) {
      inSections = true;
      inLinks = false;
      currentSection = null;
      lastLink = null;
      continue;
    }

    /* ── Inside groups: ───────────────────────────────────── */
    if (inGroups) {
      if (inLinks && ind < linksIndent) {
        inLinks = false;
        lastLink = null;
      }
      if (inGroupSections && ind < groupSectionsIndent && !/^-+\s*title:/.test(line)) {
        inGroupSections = false;
      }

      let m = line.match(/^-+\s*name:\s*(.+)\s*$/);
      if (m && !inLinks) {
        currentGroup = { name: unquote(m[1]), sections: [] };
        cfg.groups.push(currentGroup);
        inGroupSections = false;
        currentSection = null;
        continue;
      }

      m = line.match(/^name:\s*(.+)\s*$/);
      if (m && currentGroup && !inLinks && !inGroupSections) {
        currentGroup.name = unquote(m[1]);
        continue;
      }
      /* Skip legacy group-level color (ignored, color is per-section now) */
      m = line.match(/^color:\s*(.+)\s*$/);
      if (m && currentGroup && !inLinks && !inGroupSections) {
        continue;
      }

      if (/^sections:\s*$/.test(line) && currentGroup) {
        inGroupSections = true;
        groupSectionsIndent = ind + 2;
        currentSection = null;
        inLinks = false;
        lastLink = null;
        continue;
      }

      if (inGroupSections && currentGroup) {
        m = line.match(/^-+\s*title:\s*(.+)\s*$/);
        if (m && !inLinks) {
          currentSection = { title: unquote(m[1]), icon: '', color: '', links: [] };
          currentGroup.sections.push(currentSection);
          continue;
        }

        m = line.match(/^title:\s*(.+)\s*$/);
        if (m && currentSection && !inLinks) {
          currentSection.title = unquote(m[1]);
          continue;
        }
        m = line.match(/^icon:\s*(.+)\s*$/);
        if (m && currentSection && !inLinks) {
          currentSection.icon = unquote(m[1]);
          continue;
        }
        m = line.match(/^color:\s*(.+)\s*$/);
        if (m && currentSection && !inLinks) {
          currentSection.color = unquote(m[1]);
          continue;
        }

        if (/^links:\s*$/.test(line) && currentSection) {
          inLinks = true;
          linksIndent = ind + 2;
          lastLink = null;
          continue;
        }

        if (inLinks && currentSection) {
          lastLink = parseLinkLine(line, currentSection, lastLink);
          continue;
        }
      }
    }

    /* ── Inside legacy sections: ──────────────────────────── */
    if (inSections) {
      if (inLinks && ind < linksIndent) {
        inLinks = false;
        lastLink = null;
      }

      let m = line.match(/^-+\s*title:\s*(.+)\s*$/);
      if (m && !inLinks) {
        currentSection = { title: unquote(m[1]), icon: '', color: '', links: [] };
        cfg.sections.push(currentSection);
        continue;
      }

      m = line.match(/^title:\s*(.+)\s*$/);
      if (m && currentSection && !inLinks) {
        currentSection.title = unquote(m[1]);
        continue;
      }
      m = line.match(/^icon:\s*(.+)\s*$/);
      if (m && currentSection && !inLinks) {
        currentSection.icon = unquote(m[1]);
        continue;
      }
      m = line.match(/^color:\s*(.+)\s*$/);
      if (m && currentSection && !inLinks) {
        currentSection.color = unquote(m[1]);
        continue;
      }

      if (/^links:\s*$/.test(line) && currentSection) {
        inLinks = true;
        linksIndent = ind + 2;
        lastLink = null;
        continue;
      }

      if (inLinks && currentSection) {
        lastLink = parseLinkLine(line, currentSection, lastLink);
        continue;
      }
    }
  }

  return cfg;
}

/* ── Parse a single link line ────────────────────────────────── */

function parseLinkLine(line, section, lastLink) {
  const mDash = line.match(/^-+\s*(.+)\s*$/);
  if (mDash) {
    const content = mDash[1].trim();
    const obj = {};

    const kv = content.match(/^(\w[\w-]*):\s*(.+)?$/);
    if (kv) {
      const key = kv[1].toLowerCase();
      const val = unquote(kv[2] ?? '');
      if (key === 'label' || key === 'url') obj[key] = val;
      else if (key === 'type' && String(val).toLowerCase() === 'divider')
        obj.type = 'divider';
      else if (
        (key === 'divider' || key === 'hr') &&
        String(val).toLowerCase() === 'true'
      )
        obj.type = 'divider';
    } else {
      if (content.toLowerCase() === 'divider') obj.type = 'divider';
    }

    section.links.push(obj);
    return obj;
  }

  const mKV = line.match(/^(\w[\w-]*):\s*(.+)?$/);
  if (mKV && lastLink) {
    const key = mKV[1].toLowerCase();
    const val = unquote(mKV[2] ?? '');
    if (key === 'label' || key === 'url') lastLink[key] = val;
    else if (key === 'type' && String(val).toLowerCase() === 'divider')
      lastLink.type = 'divider';
    else if (
      (key === 'divider' || key === 'hr') &&
      String(val).toLowerCase() === 'true'
    )
      lastLink.type = 'divider';
  }
  return lastLink;
}

/* ── Normalize & Validate ────────────────────────────────────── */

export function normalize(cfg) {
  if (!cfg) throw new Error('Configuration is empty.');

  if (!cfg.title || typeof cfg.title !== 'string') {
    cfg.title = 'LinkDeck';
  }

  /* Legacy migration: sections-only -> wrap in one group */
  if ((!cfg.groups || cfg.groups.length === 0) && Array.isArray(cfg.sections) && cfg.sections.length > 0) {
    cfg.groups = [{
      name: 'General',
      sections: cfg.sections,
    }];
  }
  delete cfg.sections;

  if (!Array.isArray(cfg.groups) || cfg.groups.length === 0) {
    throw new Error('YAML must contain "groups" (or legacy "sections").');
  }

  const CHROME_COLORS = ['grey','blue','red','yellow','green','pink','purple','cyan','orange'];

  cfg.groups.forEach((grp, gi) => {
    if (!grp || typeof grp.name !== 'string' || !grp.name.trim()) {
      throw new Error('Group #' + (gi + 1) + ' requires a "name".');
    }
    /* Groups no longer have a color — remove any legacy value */
    delete grp.color;

    if (!Array.isArray(grp.sections) || grp.sections.length === 0) {
      throw new Error('Group "' + grp.name + '": "sections" must be a non-empty list.');
    }

    grp.sections.forEach((sec, si) => {
      if (!sec || typeof sec.title !== 'string' || !sec.title.trim()) {
        throw new Error('Section #' + (si + 1) + ' in "' + grp.name + '" requires a "title".');
      }
      if (!sec.icon || typeof sec.icon !== 'string') {
        sec.icon = '';
      }
      /* Validate section color against Chrome enum */
      if (!sec.color || !CHROME_COLORS.includes(sec.color.toLowerCase())) {
        sec.color = 'grey';
      } else {
        sec.color = sec.color.toLowerCase();
      }
      if (!Array.isArray(sec.links)) {
        throw new Error('Section "' + sec.title + '": "links" must be a list.');
      }

      sec.links = sec.links.map((lnk, j) => {
        const isDivider =
          (lnk && (lnk.type === 'divider' || lnk.type === 'hr')) ||
          (lnk && (lnk.divider === true || lnk.hr === true)) ||
          (lnk && typeof lnk.label === 'string' && lnk.label.trim() === '---');

        if (isDivider) return { type: 'divider' };

        if (
          !lnk ||
          typeof lnk.label !== 'string' ||
          typeof lnk.url !== 'string' ||
          !lnk.label.trim() ||
          !lnk.url.trim()
        ) {
          throw new Error(
            'Link #' + (j + 1) + ' in "' + sec.title + '" requires "label" and "url".'
          );
        }
        return { label: lnk.label.trim(), url: lnk.url.trim() };
      });
    });
  });

  return cfg;
}

/* ── YAML Serializer ─────────────────────────────────────────── */

function yamlStr(s) {
  if (!s) return '""';
  if (/[:#[\]{}&*?|>!%@`,"']/.test(s) || s.includes('\n') || s !== s.trim()) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return '"' + s + '"';
}

export function configToYAML(cfg) {
  const lines = [];
  lines.push('title: ' + yamlStr(cfg.title || 'LinkDeck'));
  lines.push('');
  lines.push('groups:');

  (cfg.groups || []).forEach(grp => {
    lines.push('  - name: ' + yamlStr(grp.name));
    lines.push('    sections:');

    (grp.sections || []).forEach(sec => {
      lines.push('      - title: ' + yamlStr(sec.title));
      if (sec.icon) {
        lines.push('        icon: ' + yamlStr(sec.icon));
      }
      lines.push('        color: ' + (sec.color || 'grey'));
      lines.push('        links:');

      (sec.links || []).forEach(lnk => {
        if (lnk.type === 'divider') {
          lines.push('          - divider: true');
        } else {
          lines.push('          - label: ' + yamlStr(lnk.label));
          lines.push('            url: ' + yamlStr(lnk.url));
        }
      });
    });
  });

  return lines.join('\n') + '\n';
}
