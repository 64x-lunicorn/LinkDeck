#!/usr/bin/env node
// Release command line. See docs/releasing.md.
//
//   node scripts/release.mjs prepare [major|minor|patch|X.Y.Z]
//       Bumps the version everywhere, writes the CHANGELOG section and commits
//       it on a new release/vX.Y.Z branch. Without an argument the bump is
//       derived from the Conventional Commits since the last release.
//   node scripts/release.mjs version
//       Prints the shared version; fails when the files disagree.
//   node scripts/release.mjs notes <X.Y.Z>
//       Prints the CHANGELOG section for a version; fails when it is missing.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addRelease,
  draftEntries,
  nextVersion,
  releaseNotes,
  sharedVersion,
  suggestBump,
  unreleasedBody,
} from './release-lib.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = {
  packageJson: 'package.json',
  packageLock: 'package-lock.json',
  manifest: 'public/manifest.json',
  changelog: 'CHANGELOG.md',
};

const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const writeJson = (file, data) => writeFileSync(resolve(ROOT, file), `${JSON.stringify(data, null, 2)}\n`);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

function readVersionFiles() {
  return {
    packageJson: readJson(FILES.packageJson),
    packageLock: readJson(FILES.packageLock),
    manifest: readJson(FILES.manifest),
  };
}

/** The last release: the newest vX.Y.Z tag, else the last commit that added a release heading to CHANGELOG.md. */
function lastReleaseRef() {
  try {
    return git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*.[0-9]*.[0-9]*');
  } catch {
    const commit = git('log', '-1', '--format=%H', '-G', '^## \\[[0-9]', '--', FILES.changelog);
    if (!commit) throw new Error('No release tag and no release section in CHANGELOG.md to start from');
    return commit;
  }
}

function commitsSince(ref) {
  const raw = git('log', '--no-merges', '--format=%s%x1f%b%x1e', `${ref}..HEAD`);
  return raw
    .split('\x1e')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const [subject, body = ''] = entry.split('\x1f');
      return { subject: subject.trim(), body };
    });
}

function assertReadyToRelease() {
  if (git('status', '--porcelain')) throw new Error('Working tree is not clean');
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main') throw new Error('Run prepare on main');
  git('fetch', '--quiet', 'origin', 'main');
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) {
    throw new Error('Local main differs from origin/main: pull first');
  }
}

function prepare(bumpArg) {
  assertReadyToRelease();

  const files = readVersionFiles();
  const current = sharedVersion(files);
  const since = lastReleaseRef();
  const commits = commitsSince(since);
  if (commits.length === 0) throw new Error(`No commits since ${since}`);

  const bump = bumpArg ?? suggestBump(commits);
  const version = nextVersion(current, bump);
  const changelog = read(FILES.changelog);
  const body = unreleasedBody(changelog) || draftEntries(commits);
  if (!body) throw new Error('Nothing user-facing to release: Unreleased is empty and no commit qualifies');

  const date = new Date().toISOString().slice(0, 10);
  const branch = `release/v${version}`;
  git('switch', '--quiet', '-c', branch);

  files.packageJson.version = version;
  files.packageLock.version = version;
  files.packageLock.packages[''].version = version;
  files.manifest.version = version;
  writeJson(FILES.packageJson, files.packageJson);
  writeJson(FILES.packageLock, files.packageLock);
  writeJson(FILES.manifest, files.manifest);
  writeFileSync(resolve(ROOT, FILES.changelog), addRelease(changelog, version, date, body));

  git('add', ...Object.values(FILES));
  git('commit', '--quiet', '-m', `chore(release): v${version}`);

  console.log(`Prepared v${version} (${bump}, ${commits.length} commits since ${since.slice(0, 12)}) on ${branch}.

Next:
  1. Review the CHANGELOG.md section; amend the commit if it needs editing.
  2. npm run ci
  3. git push -u origin ${branch} && gh pr create --fill
  4. Squash-merge once CI gate is green. The Release workflow tags v${version} and publishes it.`);
}

const [command, arg] = process.argv.slice(2);
try {
  if (command === 'prepare') {
    prepare(arg);
  } else if (command === 'version') {
    console.log(sharedVersion(readVersionFiles()));
  } else if (command === 'notes') {
    if (!arg) throw new Error('Usage: release.mjs notes <X.Y.Z>');
    const notes = releaseNotes(read(FILES.changelog), arg);
    if (notes === null) throw new Error(`CHANGELOG.md has no section for ${arg}`);
    console.log(notes);
  } else {
    throw new Error('Usage: release.mjs <prepare [bump] | version | notes <X.Y.Z>>');
  }
} catch (error) {
  console.error(`release: ${error.message}`);
  process.exit(1);
}
