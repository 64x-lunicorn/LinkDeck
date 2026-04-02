import { describe, it, expect } from 'vitest';
import { unquote, parseConfigYAML, normalize, configToYAML } from './parser.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/* ── unquote ─────────────────────────────────────────────────── */

describe('unquote', () => {
  it('strips double quotes', () => {
    expect(unquote('"hello"')).toBe('hello');
  });
  it('strips single quotes', () => {
    expect(unquote("'world'")).toBe('world');
  });
  it('leaves unquoted strings unchanged', () => {
    expect(unquote('plain')).toBe('plain');
  });
  it('returns null for null', () => {
    expect(unquote(null)).toBeNull();
  });
  it('returns undefined for undefined', () => {
    expect(unquote(undefined)).toBeUndefined();
  });
  it('trims whitespace', () => {
    expect(unquote('  spaced  ')).toBe('spaced');
  });
  it('handles empty string', () => {
    expect(unquote('')).toBe('');
  });
  it('handles quoted empty string', () => {
    expect(unquote('""')).toBe('');
  });
  it('coerces number to string', () => {
    expect(unquote(42)).toBe('42');
  });
});

/* ── parseConfigYAML ─────────────────────────────────────────── */

describe('parseConfigYAML', () => {
  const MINIMAL = `
title: "Test Board"

groups:
  - name: "Dev"
    sections:
      - title: "Tools"
        color: blue
        links:
          - label: "GitHub"
            url: "https://github.com"
`;

  it('parses title', () => {
    const cfg = parseConfigYAML(MINIMAL);
    expect(cfg.title).toBe('Test Board');
  });

  it('parses one group with one section', () => {
    const cfg = parseConfigYAML(MINIMAL);
    expect(cfg.groups).toHaveLength(1);
    expect(cfg.groups[0].name).toBe('Dev');
    expect(cfg.groups[0].sections).toHaveLength(1);
    expect(cfg.groups[0].sections[0].title).toBe('Tools');
  });

  it('parses section color', () => {
    const cfg = parseConfigYAML(MINIMAL);
    expect(cfg.groups[0].sections[0].color).toBe('blue');
  });

  it('parses links', () => {
    const cfg = parseConfigYAML(MINIMAL);
    const links = cfg.groups[0].sections[0].links;
    expect(links).toHaveLength(1);
    expect(links[0].label).toBe('GitHub');
    expect(links[0].url).toBe('https://github.com');
  });

  it('parses dividers', () => {
    const yaml = `
title: X
groups:
  - name: G
    sections:
      - title: S
        color: red
        links:
          - label: A
            url: https://a
          - divider: true
          - label: B
            url: https://b
`;
    const cfg = parseConfigYAML(yaml);
    const links = cfg.groups[0].sections[0].links;
    expect(links).toHaveLength(3);
    expect(links[1].type).toBe('divider');
  });

  it('parses multiple groups with multiple sections', () => {
    const yaml = `
title: Board
groups:
  - name: G1
    sections:
      - title: S1
        color: blue
        links:
          - label: L1
            url: https://1
      - title: S2
        color: green
        links:
          - label: L2
            url: https://2
  - name: G2
    sections:
      - title: S3
        color: red
        links:
          - label: L3
            url: https://3
`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.groups).toHaveLength(2);
    expect(cfg.groups[0].sections).toHaveLength(2);
    expect(cfg.groups[1].sections).toHaveLength(1);
    expect(cfg.groups[0].sections[1].color).toBe('green');
    expect(cfg.groups[1].sections[0].color).toBe('red');
  });

  it('parses section icon', () => {
    const yaml = `
title: X
groups:
  - name: G
    sections:
      - title: S
        icon: cloud
        color: cyan
        links:
          - label: L
            url: https://x
`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.groups[0].sections[0].icon).toBe('cloud');
  });

  it('ignores legacy group-level color', () => {
    const yaml = `
title: X
groups:
  - name: G
    color: blue
    sections:
      - title: S
        color: red
        links:
          - label: L
            url: https://x
`;
    const cfg = parseConfigYAML(yaml);
    // group should NOT have color property from parsing
    expect(cfg.groups[0].color).toBeUndefined();
    expect(cfg.groups[0].sections[0].color).toBe('red');
  });

  it('parses legacy sections-only format', () => {
    const yaml = `
title: Legacy
sections:
  - title: Old
    color: green
    links:
      - label: L
        url: https://x
`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.sections).toHaveLength(1);
    expect(cfg.sections[0].title).toBe('Old');
    expect(cfg.sections[0].color).toBe('green');
  });

  it('handles tabs as indentation', () => {
    const yaml = "title: Tabs\ngroups:\n\t- name: G\n\t\tsections:\n\t\t\t- title: S\n\t\t\t\tcolor: blue\n\t\t\t\tlinks:\n\t\t\t\t\t- label: L\n\t\t\t\t\t\turl: https://x\n";
    const cfg = parseConfigYAML(yaml);
    expect(cfg.groups[0].sections[0].title).toBe('S');
  });

  it('ignores YAML comments', () => {
    const yaml = `
title: Board # this is a comment
groups:
  - name: G # group comment
    sections:
      - title: S # section comment
        color: blue
        links:
          - label: Link # link comment
            url: https://example.com
`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.title).toBe('Board');
    expect(cfg.groups[0].name).toBe('G');
    expect(cfg.groups[0].sections[0].links[0].label).toBe('Link');
  });

  it('skips blank lines gracefully', () => {
    const yaml = `
title: Board

groups:

  - name: G

    sections:

      - title: S
        color: blue

        links:

          - label: L
            url: https://x

`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.groups).toHaveLength(1);
    expect(cfg.groups[0].sections[0].links).toHaveLength(1);
  });

  it('parses "- divider" shorthand', () => {
    const yaml = `
title: X
groups:
  - name: G
    sections:
      - title: S
        color: blue
        links:
          - label: A
            url: https://a
          - divider
          - label: B
            url: https://b
`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.groups[0].sections[0].links[1].type).toBe('divider');
  });

  it('parses "- type: divider" format', () => {
    const yaml = `
title: X
groups:
  - name: G
    sections:
      - title: S
        color: blue
        links:
          - type: divider
          - label: A
            url: https://a
`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.groups[0].sections[0].links[0].type).toBe('divider');
  });

  it('parses URLs with special characters', () => {
    const yaml = `
title: X
groups:
  - name: G
    sections:
      - title: S
        color: blue
        links:
          - label: "Dashboard"
            url: "https://example.com/app/discover#/?_g=(filters:!(),time:(from:now-4d,to:now))&_a=(query:'json.message:%22test%22')"
`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.groups[0].sections[0].links[0].url).toContain('discover#/?_g=');
  });

  it('parses legacy section icon and color', () => {
    const yaml = `
title: L
sections:
  - title: Sec
    icon: settings
    color: purple
    links:
      - label: A
        url: https://a
`;
    const cfg = parseConfigYAML(yaml);
    expect(cfg.sections[0].icon).toBe('settings');
    expect(cfg.sections[0].color).toBe('purple');
  });

  it('returns empty groups and sections for empty input', () => {
    const cfg = parseConfigYAML('');
    expect(cfg.title).toBe('');
    expect(cfg.groups).toHaveLength(0);
    expect(cfg.sections).toHaveLength(0);
  });

  it('handles Windows-style line endings', () => {
    const yaml = "title: Win\r\ngroups:\r\n  - name: G\r\n    sections:\r\n      - title: S\r\n        color: blue\r\n        links:\r\n          - label: L\r\n            url: https://x\r\n";
    const cfg = parseConfigYAML(yaml);
    expect(cfg.groups[0].sections[0].title).toBe('S');
  });

  it('parses default.config.yaml without error', () => {
    const yaml = readFileSync(resolve(__dirname, '../public/default.config.yaml'), 'utf-8');
    const cfg = parseConfigYAML(yaml);
    expect(cfg.title).toBeTruthy();
    expect(cfg.groups.length).toBeGreaterThan(0);
    cfg.groups.forEach(g => {
      expect(g.name).toBeTruthy();
      expect(g.sections.length).toBeGreaterThan(0);
    });
  });
});

/* ── normalize ───────────────────────────────────────────────── */

describe('normalize', () => {
  it('throws on empty config', () => {
    expect(() => normalize(null)).toThrow();
  });

  it('defaults title if missing', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [{ label: 'L', url: 'https://x' }] }] }],
    });
    expect(cfg.title).toBe('LinkDeck');
  });

  it('migrates legacy sections-only to one group', () => {
    const cfg = normalize({
      sections: [{ title: 'S', color: 'red', links: [{ label: 'L', url: 'https://x' }] }],
    });
    expect(cfg.groups).toHaveLength(1);
    expect(cfg.groups[0].name).toBe('General');
    expect(cfg.groups[0].sections[0].title).toBe('S');
  });

  it('validates section color against Chrome enum', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'invalid', links: [{ label: 'L', url: 'https://x' }] }] }],
    });
    expect(cfg.groups[0].sections[0].color).toBe('grey');
  });

  it('accepts valid Chrome colors', () => {
    const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
    colors.forEach(color => {
      const cfg = normalize({
        groups: [{ name: 'G', sections: [{ title: 'S', color, links: [{ label: 'L', url: 'https://x' }] }] }],
      });
      expect(cfg.groups[0].sections[0].color).toBe(color);
    });
  });

  it('lowercases color values', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'BLUE', links: [{ label: 'L', url: 'https://x' }] }] }],
    });
    expect(cfg.groups[0].sections[0].color).toBe('blue');
  });

  it('removes legacy group color', () => {
    const cfg = normalize({
      groups: [{ name: 'G', color: 'blue', sections: [{ title: 'S', color: 'red', links: [{ label: 'L', url: 'https://x' }] }] }],
    });
    expect(cfg.groups[0].color).toBeUndefined();
  });

  it('throws on group without name', () => {
    expect(() => normalize({
      groups: [{ sections: [{ title: 'S', links: [{ label: 'L', url: 'https://x' }] }] }],
    })).toThrow(/name/);
  });

  it('throws on section without title', () => {
    expect(() => normalize({
      groups: [{ name: 'G', sections: [{ links: [{ label: 'L', url: 'https://x' }] }] }],
    })).toThrow(/title/);
  });

  it('throws on link without url', () => {
    expect(() => normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [{ label: 'L' }] }] }],
    })).toThrow(/url/);
  });

  it('normalizes divider links', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [
        { type: 'divider' },
        { label: '---', url: '' },
        { label: 'L', url: 'https://x' },
      ] }] }],
    });
    const links = cfg.groups[0].sections[0].links;
    expect(links[0]).toEqual({ type: 'divider' });
    expect(links[1]).toEqual({ type: 'divider' });
  });

  it('normalizes hr type as divider', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [
        { type: 'hr' },
        { label: 'L', url: 'https://x' },
      ] }] }],
    });
    expect(cfg.groups[0].sections[0].links[0]).toEqual({ type: 'divider' });
  });

  it('normalizes divider: true property as divider', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [
        { divider: true },
        { label: 'L', url: 'https://x' },
      ] }] }],
    });
    expect(cfg.groups[0].sections[0].links[0]).toEqual({ type: 'divider' });
  });

  it('normalizes hr: true property as divider', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [
        { hr: true },
        { label: 'L', url: 'https://x' },
      ] }] }],
    });
    expect(cfg.groups[0].sections[0].links[0]).toEqual({ type: 'divider' });
  });

  it('throws on empty sections list', () => {
    expect(() => normalize({
      groups: [{ name: 'G', sections: [] }],
    })).toThrow(/sections/);
  });

  it('throws on missing links array', () => {
    expect(() => normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue' }] }],
    })).toThrow(/links/);
  });

  it('throws on empty groups', () => {
    expect(() => normalize({ groups: [] })).toThrow();
  });

  it('defaults missing icon to empty string', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [{ label: 'L', url: 'https://x' }] }] }],
    });
    expect(cfg.groups[0].sections[0].icon).toBe('');
  });

  it('defaults missing color to grey', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', links: [{ label: 'L', url: 'https://x' }] }] }],
    });
    expect(cfg.groups[0].sections[0].color).toBe('grey');
  });

  it('trims link label and url whitespace', () => {
    const cfg = normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [{ label: '  A  ', url: '  https://x  ' }] }] }],
    });
    expect(cfg.groups[0].sections[0].links[0].label).toBe('A');
    expect(cfg.groups[0].sections[0].links[0].url).toBe('https://x');
  });

  it('throws on link with empty label', () => {
    expect(() => normalize({
      groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [{ label: '', url: 'https://x' }] }] }],
    })).toThrow(/label.*url/);
  });

  it('deletes legacy sections property after migration', () => {
    const cfg = normalize({
      sections: [{ title: 'S', color: 'red', links: [{ label: 'L', url: 'https://x' }] }],
    });
    expect(cfg.sections).toBeUndefined();
    expect(cfg.groups).toHaveLength(1);
  });
});

/* ── configToYAML ────────────────────────────────────────────── */

describe('configToYAML', () => {
  it('serializes a config to valid YAML', () => {
    const cfg = {
      title: 'Board',
      groups: [{
        name: 'G1',
        sections: [{
          title: 'S1',
          icon: 'cloud',
          color: 'blue',
          links: [
            { label: 'Link', url: 'https://example.com' },
            { type: 'divider' },
          ],
        }],
      }],
    };
    const yaml = configToYAML(cfg);
    expect(yaml).toContain('title: "Board"');
    expect(yaml).toContain('name: "G1"');
    expect(yaml).toContain('title: "S1"');
    expect(yaml).toContain('icon: "cloud"');
    expect(yaml).toContain('color: blue');
    expect(yaml).toContain('label: "Link"');
    expect(yaml).toContain('divider: true');
  });

  it('does not write group color', () => {
    const cfg = {
      title: 'X',
      groups: [{ name: 'G', color: 'blue', sections: [{ title: 'S', color: 'red', links: [{ label: 'L', url: 'https://x' }] }] }],
    };
    const yaml = configToYAML(cfg);
    const groupLine = yaml.split('\n').find(l => l.includes('name: "G"'));
    const nextLine = yaml.split('\n')[yaml.split('\n').indexOf(groupLine) + 1];
    expect(nextLine).toContain('sections:');
  });

  it('omits icon when empty', () => {
    const cfg = {
      title: 'X',
      groups: [{ name: 'G', sections: [{ title: 'S', icon: '', color: 'blue', links: [{ label: 'L', url: 'https://x' }] }] }],
    };
    const yaml = configToYAML(cfg);
    expect(yaml).not.toContain('icon:');
  });

  it('defaults color to grey', () => {
    const cfg = {
      title: 'X',
      groups: [{ name: 'G', sections: [{ title: 'S', icon: '', links: [{ label: 'L', url: 'https://x' }] }] }],
    };
    const yaml = configToYAML(cfg);
    expect(yaml).toContain('color: grey');
  });

  it('quotes strings with special characters', () => {
    const cfg = {
      title: 'Test: Special',
      groups: [{ name: 'Group #1', sections: [{ title: 'Sec & More', icon: '', color: 'blue', links: [{ label: 'A & B', url: 'https://x?a=1&b=2' }] }] }],
    };
    const yaml = configToYAML(cfg);
    expect(yaml).toContain('"Test: Special"');
    expect(yaml).toContain('"Group #1"');
    expect(yaml).toContain('"A & B"');
  });

  it('defaults title if falsy', () => {
    const cfg = { title: '', groups: [{ name: 'G', sections: [{ title: 'S', color: 'blue', links: [{ label: 'L', url: 'https://x' }] }] }] };
    const yaml = configToYAML(cfg);
    expect(yaml).toContain('LinkDeck');
  });

  it('handles empty groups gracefully', () => {
    const cfg = { title: 'X', groups: [] };
    const yaml = configToYAML(cfg);
    expect(yaml).toContain('groups:');
  });
});

/* ── Roundtrip ───────────────────────────────────────────────── */

describe('roundtrip', () => {
  it('parse → serialize → parse produces equivalent config', () => {
    const original = {
      title: 'Roundtrip Test',
      groups: [{
        name: 'Projekt',
        sections: [
          { title: 'MIB4', icon: 'cloud', color: 'blue', links: [{ label: 'A', url: 'https://a' }] },
          { title: 'QF', icon: '', color: 'red', links: [{ label: 'B', url: 'https://b' }, { type: 'divider' }, { label: 'C', url: 'https://c' }] },
        ],
      }, {
        name: 'Ops',
        sections: [
          { title: 'Admin', icon: 'settings', color: 'green', links: [{ label: 'D', url: 'https://d' }] },
        ],
      }],
    };

    const yaml = configToYAML(original);
    const parsed = parseConfigYAML(yaml);
    const normalized = normalize(parsed);

    expect(normalized.title).toBe(original.title);
    expect(normalized.groups).toHaveLength(2);
    expect(normalized.groups[0].name).toBe('Projekt');
    expect(normalized.groups[0].sections).toHaveLength(2);
    expect(normalized.groups[0].sections[0].color).toBe('blue');
    expect(normalized.groups[0].sections[1].color).toBe('red');
    expect(normalized.groups[1].sections[0].color).toBe('green');
    expect(normalized.groups[0].sections[1].links).toHaveLength(3);
    expect(normalized.groups[0].sections[1].links[1]).toEqual({ type: 'divider' });
  });

  it('default.config.yaml survives roundtrip', () => {
    const yaml = readFileSync(resolve(__dirname, '../public/default.config.yaml'), 'utf-8');
    const cfg1 = normalize(parseConfigYAML(yaml));
    const serialized = configToYAML(cfg1);
    const cfg2 = normalize(parseConfigYAML(serialized));

    expect(cfg2.title).toBe(cfg1.title);
    expect(cfg2.groups).toHaveLength(cfg1.groups.length);
    cfg1.groups.forEach((g, i) => {
      expect(cfg2.groups[i].name).toBe(g.name);
      expect(cfg2.groups[i].sections).toHaveLength(g.sections.length);
      g.sections.forEach((s, j) => {
        expect(cfg2.groups[i].sections[j].title).toBe(s.title);
        expect(cfg2.groups[i].sections[j].icon).toBe(s.icon);
        expect(cfg2.groups[i].sections[j].color).toBe(s.color);
        expect(cfg2.groups[i].sections[j].links).toHaveLength(s.links.length);
      });
    });
  });

  it('config with special URL characters survives roundtrip', () => {
    const original = {
      title: 'Special URLs',
      groups: [{
        name: 'G',
        sections: [{
          title: 'S', icon: '', color: 'blue',
          links: [
            { label: 'Dashboard', url: "https://example.com/app#/?_g=(filters:!(),time:(from:now))&_a=(query:'test')" },
            { label: 'SharePoint', url: 'https://example.com/:x:/r/sites/Team/Shared%20Documents/file.xlsm?d=w628dc17a' },
          ],
        }],
      }],
    };

    const yaml = configToYAML(original);
    const cfg = normalize(parseConfigYAML(yaml));
    expect(cfg.groups[0].sections[0].links[0].url).toBe(original.groups[0].sections[0].links[0].url);
    expect(cfg.groups[0].sections[0].links[1].url).toBe(original.groups[0].sections[0].links[1].url);
  });

  it('legacy format parses and re-serializes as groups format', () => {
    const legacy = `
title: Legacy
sections:
  - title: Old Section
    icon: settings
    color: green
    links:
      - label: Link1
        url: https://example.com
      - divider: true
      - label: Link2
        url: https://example2.com
`;
    const cfg = normalize(parseConfigYAML(legacy));
    expect(cfg.groups).toHaveLength(1);
    expect(cfg.groups[0].name).toBe('General');

    const yaml = configToYAML(cfg);
    expect(yaml).toContain('groups:');
    expect(yaml).not.toMatch(/^sections:/m);

    const cfg2 = normalize(parseConfigYAML(yaml));
    expect(cfg2.groups[0].sections[0].title).toBe('Old Section');
    expect(cfg2.groups[0].sections[0].links).toHaveLength(3);
  });
});
