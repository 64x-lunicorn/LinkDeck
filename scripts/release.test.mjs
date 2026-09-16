import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  addRelease,
  draftEntries,
  nextVersion,
  parseVersion,
  releaseNotes,
  sharedVersion,
  suggestBump,
  unreleasedBody,
} from './release-lib.mjs';

/* ── Versions ────────────────────────────────────────────────── */

describe('parseVersion', () => {
  it('parses X.Y.Z', () => {
    expect(parseVersion('2.10.3')).toEqual([2, 10, 3]);
  });

  it('rejects pre-release suffixes Chrome cannot load', () => {
    expect(() => parseVersion('2.1.0-beta.1')).toThrow('not a plain X.Y.Z');
  });
});

describe('nextVersion', () => {
  it('bumps major, minor and patch', () => {
    expect(nextVersion('2.1.4', 'major')).toBe('3.0.0');
    expect(nextVersion('2.1.4', 'minor')).toBe('2.2.0');
    expect(nextVersion('2.1.4', 'patch')).toBe('2.1.5');
  });

  it('accepts an explicit greater version', () => {
    expect(nextVersion('2.1.4', '2.3.0')).toBe('2.3.0');
  });

  it('refuses an explicit version that is not greater', () => {
    expect(() => nextVersion('2.1.4', '2.1.4')).toThrow('must be greater');
    expect(() => nextVersion('2.1.4', '2.0.9')).toThrow('must be greater');
  });

  it('refuses an unknown bump', () => {
    expect(() => nextVersion('2.1.4', 'huge')).toThrow('Unknown bump');
  });
});

/* ── Commits ─────────────────────────────────────────────────── */

describe('suggestBump', () => {
  it('is major for a breaking marker or footer', () => {
    expect(suggestBump([{ subject: 'feat!: drop legacy config' }])).toBe('major');
    expect(suggestBump([{ subject: 'fix: parser', body: 'BREAKING CHANGE: new schema' }])).toBe('major');
  });

  it('is minor when a feature landed', () => {
    expect(suggestBump([{ subject: 'fix: a' }, { subject: 'feat(search): b' }])).toBe('minor');
  });

  it('is patch otherwise', () => {
    expect(suggestBump([{ subject: 'fix: a' }, { subject: 'Rename a file (#47)' }])).toBe('patch');
  });
});

describe('draftEntries', () => {
  it('groups features, fixes and other changes, leaving internal commits out', () => {
    const draft = draftEntries([
      { subject: 'feat(search): add Brave preset (#60)' },
      { subject: 'fix: search clears on Escape' },
      { subject: 'chore(deps-dev): bump vite from 8.2.1 to 8.2.2 (#40)' },
      { subject: 'ci: pin actions' },
      { subject: 'Give the extension a real icon (#46)' },
      { subject: 'refactor!: rename storage key' },
    ]);
    expect(draft).toBe(
      '### Added\n- Add Brave preset (#60)\n\n' +
      '### Changed\n- Give the extension a real icon (#46)\n- **Breaking:** Rename storage key\n\n' +
      '### Fixed\n- Search clears on Escape',
    );
  });

  it('is empty when only internal commits landed', () => {
    expect(draftEntries([{ subject: 'docs: typo' }, { subject: 'test: more cases' }])).toBe('');
  });
});

/* ── CHANGELOG.md ────────────────────────────────────────────── */

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

### Fixed
- Something

## [2.1.0] – 2026-04-14

### Added
- Spotlight

## [2.0.0] – 2026-03-30

### Added
- Groups
`;

describe('unreleasedBody', () => {
  it('returns the Unreleased section body', () => {
    expect(unreleasedBody(CHANGELOG)).toBe('### Fixed\n- Something');
  });

  it('is empty without an Unreleased section', () => {
    expect(unreleasedBody('# Changelog\n\n## [1.0.0] – x\n- a\n')).toBe('');
  });
});

describe('releaseNotes', () => {
  it('returns the body of a release section', () => {
    expect(releaseNotes(CHANGELOG, '2.1.0')).toBe('### Added\n- Spotlight');
    expect(releaseNotes(CHANGELOG, '2.0.0')).toBe('### Added\n- Groups');
  });

  it('is null for a missing version', () => {
    expect(releaseNotes(CHANGELOG, '9.9.9')).toBeNull();
  });
});

describe('addRelease', () => {
  it('turns Unreleased into the release and opens a new empty Unreleased', () => {
    const result = addRelease(CHANGELOG, '2.1.1', '2026-09-16', '### Fixed\n- Something');
    expect(result).toContain('## [Unreleased]\n\n## [2.1.1] – 2026-09-16\n\n### Fixed\n- Something\n\n## [2.1.0]');
    expect(unreleasedBody(result)).toBe('');
    expect(releaseNotes(result, '2.1.1')).toBe('### Fixed\n- Something');
    expect(releaseNotes(result, '2.1.0')).toBe('### Added\n- Spotlight');
  });

  it('inserts above the newest release when there is no Unreleased section', () => {
    const without = CHANGELOG.replace('## [Unreleased]\n\n### Fixed\n- Something\n\n', '');
    const result = addRelease(without, '2.1.1', '2026-09-16', '### Fixed\n- X');
    expect(result).toContain('Intro.\n\n## [Unreleased]\n\n## [2.1.1] – 2026-09-16\n\n### Fixed\n- X\n\n## [2.1.0]');
  });

  it('refuses a version that already has a section', () => {
    expect(() => addRelease(CHANGELOG, '2.1.0', '2026-09-16', '- x')).toThrow('already has a section');
  });
});

describe('sharedVersion', () => {
  const files = version => ({
    packageJson: { version },
    packageLock: { version, packages: { '': { version } } },
    manifest: { version },
  });

  it('returns the version all files agree on', () => {
    expect(sharedVersion(files('2.1.0'))).toBe('2.1.0');
  });

  it('names every file when they disagree', () => {
    const mixed = files('2.1.0');
    mixed.manifest.version = '2.2.0';
    expect(() => sharedVersion(mixed)).toThrow(/public\/manifest\.json: 2\.2\.0/);
  });
});

/* ── This repository ─────────────────────────────────────────── */

describe('repository release state', () => {
  const root = resolve(import.meta.dirname, '..');
  const json = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  const version = sharedVersion({
    packageJson: json('package.json'),
    packageLock: json('package-lock.json'),
    manifest: json('public/manifest.json'),
  });

  it('documents the current version in CHANGELOG.md', () => {
    expect(releaseNotes(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'), version)).not.toBeNull();
  });
});
