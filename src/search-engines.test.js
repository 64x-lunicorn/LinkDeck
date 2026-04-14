import { describe, it, expect } from 'vitest';
import { SEARCH_ENGINES, DEFAULT_ENGINE, buildSearchURL } from './search-engines.js';

/* ── SEARCH_ENGINES ──────────────────────────────────────────── */

describe('SEARCH_ENGINES', () => {
  it('has at least 4 presets', () => {
    expect(SEARCH_ENGINES.length).toBeGreaterThanOrEqual(4);
  });

  it('each engine has id, name, urlTemplate', () => {
    SEARCH_ENGINES.forEach(e => {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.urlTemplate).toContain('{query}');
    });
  });

  it('all ids are unique', () => {
    const ids = SEARCH_ENGINES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all urlTemplates are valid URLs (with placeholder)', () => {
    SEARCH_ENGINES.forEach(e => {
      const test = e.urlTemplate.replace('{query}', 'test');
      expect(() => new URL(test)).not.toThrow();
    });
  });
});

/* ── DEFAULT_ENGINE ──────────────────────────────────────────── */

describe('DEFAULT_ENGINE', () => {
  it('defaults to Ecosia', () => {
    expect(DEFAULT_ENGINE.id).toBe('ecosia');
  });

  it('is one of the presets', () => {
    expect(SEARCH_ENGINES).toContainEqual(DEFAULT_ENGINE);
  });
});

/* ── buildSearchURL ──────────────────────────────────────────── */

describe('buildSearchURL', () => {
  it('replaces {query} with encoded search term', () => {
    const engine = SEARCH_ENGINES[0];
    const url = buildSearchURL(engine, 'hello world');
    expect(url).toContain('hello%20world');
    expect(url).not.toContain('{query}');
  });

  it('encodes special characters', () => {
    const engine = { urlTemplate: 'https://example.com/?q={query}' };
    const url = buildSearchURL(engine, 'a&b=c');
    expect(url).toBe('https://example.com/?q=a%26b%3Dc');
  });

  it('works with custom engine', () => {
    const engine = { id: 'custom', name: 'Test', urlTemplate: 'https://test.com/search?q={query}&lang=en' };
    const url = buildSearchURL(engine, 'foo');
    expect(url).toBe('https://test.com/search?q=foo&lang=en');
  });

  it('handles empty query', () => {
    const engine = SEARCH_ENGINES[0];
    const url = buildSearchURL(engine, '');
    expect(url).not.toContain('{query}');
  });

  it('handles unicode queries', () => {
    const engine = { urlTemplate: 'https://example.com/?q={query}' };
    const url = buildSearchURL(engine, 'café ☕');
    expect(url).toContain('caf%C3%A9');
  });
});
