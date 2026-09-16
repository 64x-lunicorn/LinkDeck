// Pure release helpers: version arithmetic and CHANGELOG.md editing.
// No I/O here, so every rule is covered by scripts/release.test.mjs.

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\]/;
const UNRELEASED_HEADING = /^## \[Unreleased\]\s*$/;

/** Parses "X.Y.Z" into numbers. Chrome manifests accept no pre-release suffix. */
export function parseVersion(version) {
  const match = SEMVER.exec(version);
  if (!match) throw new Error(`"${version}" is not a plain X.Y.Z version`);
  return match.slice(1).map(Number);
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/** Returns the version after `current` for a bump of major, minor, patch or an explicit X.Y.Z. */
export function nextVersion(current, bump) {
  const [major, minor, patch] = parseVersion(current);
  let next;
  if (bump === 'major') next = `${major + 1}.0.0`;
  else if (bump === 'minor') next = `${major}.${minor + 1}.0`;
  else if (bump === 'patch') next = `${major}.${minor}.${patch + 1}`;
  else if (SEMVER.test(bump)) next = bump;
  else throw new Error(`Unknown bump "${bump}": use major, minor, patch or X.Y.Z`);

  if (compareVersions(next, current) <= 0) {
    throw new Error(`Next version ${next} must be greater than ${current}`);
  }
  return next;
}

const CONVENTIONAL = /^(\w+)(\([^)]*\))?(!)?: (.+)$/;

function parseCommit({ subject, body = '' }) {
  const match = CONVENTIONAL.exec(subject);
  if (!match) return { type: null, breaking: /BREAKING CHANGE:/.test(body), description: subject };
  return {
    type: match[1],
    scope: match[2]?.slice(1, -1) ?? null,
    breaking: Boolean(match[3]) || /BREAKING CHANGE:/.test(body),
    description: match[4],
  };
}

/** Semantic Versioning from Conventional Commits: breaking → major, feat → minor, anything else → patch. */
export function suggestBump(commits) {
  const parsed = commits.map(parseCommit);
  if (parsed.some(c => c.breaking)) return 'major';
  if (parsed.some(c => c.type === 'feat')) return 'minor';
  return 'patch';
}

// Commit types that never change what a user installs.
const INTERNAL_TYPES = new Set(['build', 'chore', 'ci', 'docs', 'style', 'test']);

/**
 * Drafts Keep a Changelog entries from commits. Internal commit types are left
 * out; subjects that are not Conventional Commits land under Changed so a
 * human decides where they belong.
 */
export function draftEntries(commits) {
  const groups = { Added: [], Changed: [], Fixed: [] };
  for (const commit of commits) {
    const { type, breaking, description } = parseCommit(commit);
    if (INTERNAL_TYPES.has(type) && !breaking) continue;
    const text = description.charAt(0).toUpperCase() + description.slice(1);
    const line = breaking ? `- **Breaking:** ${text}` : `- ${text}`;
    if (type === 'feat') groups.Added.push(line);
    else if (type === 'fix') groups.Fixed.push(line);
    else groups.Changed.push(line);
  }
  return Object.entries(groups)
    .filter(([, lines]) => lines.length > 0)
    .map(([heading, lines]) => `### ${heading}\n${lines.join('\n')}`)
    .join('\n\n');
}

function splitSections(changelog) {
  const lines = changelog.split('\n');
  const starts = [];
  lines.forEach((line, i) => {
    if (line.startsWith('## [')) starts.push(i);
  });
  return { lines, starts };
}

function sectionBody(lines, starts, index) {
  const from = starts[index] + 1;
  const to = index + 1 < starts.length ? starts[index + 1] : lines.length;
  return lines.slice(from, to).join('\n').trim();
}

/** The trimmed body of the "## [Unreleased]" section, or "" when there is none. */
export function unreleasedBody(changelog) {
  const { lines, starts } = splitSections(changelog);
  const index = starts.findIndex(i => UNRELEASED_HEADING.test(lines[i]));
  return index === -1 ? '' : sectionBody(lines, starts, index);
}

/** The trimmed body of the release section for `version`, or null when it is missing or empty. */
export function releaseNotes(changelog, version) {
  const { lines, starts } = splitSections(changelog);
  const index = starts.findIndex(i => RELEASE_HEADING.exec(lines[i])?.[1] === version);
  if (index === -1) return null;
  return sectionBody(lines, starts, index) || null;
}

/**
 * Turns the Unreleased section into a release section for `version` and opens
 * a fresh, empty Unreleased section above it.
 */
export function addRelease(changelog, version, date, body) {
  if (releaseNotes(changelog, version) !== null) {
    throw new Error(`CHANGELOG.md already has a section for ${version}`);
  }
  const { lines, starts } = splitSections(changelog);
  const unreleased = starts.findIndex(i => UNRELEASED_HEADING.test(lines[i]));
  const release = [`## [Unreleased]`, '', `## [${version}] – ${date}`, '', body.trim(), ''];

  if (unreleased !== -1) {
    const from = starts[unreleased];
    const to = unreleased + 1 < starts.length ? starts[unreleased + 1] : lines.length;
    lines.splice(from, to - from, ...release);
  } else if (starts.length > 0) {
    lines.splice(starts[0], 0, ...release);
  } else {
    lines.push('', ...release);
  }
  return lines.join('\n');
}

/**
 * The one version shared by package.json, package-lock.json and the extension
 * manifest. Throws when they disagree, naming every file.
 */
export function sharedVersion({ packageJson, packageLock, manifest }) {
  const versions = {
    'package.json': packageJson.version,
    'package-lock.json': packageLock.version,
    'package-lock.json (packages[""])': packageLock.packages?.['']?.version,
    'public/manifest.json': manifest.version,
  };
  const distinct = new Set(Object.values(versions));
  if (distinct.size !== 1) {
    const listing = Object.entries(versions).map(([file, v]) => `  ${file}: ${v}`).join('\n');
    throw new Error(`Versions disagree:\n${listing}`);
  }
  const [version] = distinct;
  parseVersion(version);
  return version;
}
