# Releasing

A release is an ordinary pull request. Merging it is the decision to ship; everything after the merge is automated by [`.github/workflows/release.yml`](../.github/workflows/release.yml). The reasoning is in [ADR 0001](adr/0001-release-on-version-bump-merge.md).

## Versioning

[Semantic Versioning](https://semver.org/) on plain `X.Y.Z` — Chrome manifests accept no pre-release suffix.

| Bump | When |
| :--- | :--- |
| major | A config, storage key or behaviour change an existing user must act on (`feat!:`, `BREAKING CHANGE:`) |
| minor | A new user-facing capability (`feat:`) |
| patch | Fixes, security fixes and visible polish (`fix:` and everything else) |

The version lives in three files that must agree: `package.json`, `package-lock.json` and `public/manifest.json`. A test in `scripts/release.test.mjs` fails the CI gate when they disagree or when `CHANGELOG.md` has no section for the current version.

## Changelog

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and is written for people who install the extension. Notable changes can be collected under `## [Unreleased]` in the pull request that makes them. At release time that section becomes the release; when it is empty, `npm run release` drafts one from the Conventional Commits since the last release, leaving out `build`, `chore`, `ci`, `docs`, `style` and `test`. The draft is a starting point: edit it before pushing.

The section for a version is also the body of its GitHub release.

## Cutting a release

```bash
git switch main && git pull
npm run release
```

`npm run release` takes an optional bump: `major`, `minor`, `patch` or an explicit `X.Y.Z`. Without one it suggests the bump from the commits. It refuses to run on anything but a clean `main` that matches `origin/main`, then:

1. raises the version in the three files,
2. turns `## [Unreleased]` (or the draft) into `## [X.Y.Z] – YYYY-MM-DD`,
3. commits `chore(release): vX.Y.Z` on a new `release/vX.Y.Z` branch.

Then review the changelog section, amend if needed, run `npm run ci`, push and open the pull request. Squash-merge it once `CI gate` is green.

## What the merge triggers

The Release workflow runs on every push to `main` that touches `public/manifest.json`, and does nothing when the tag for the current version already exists.

| Job | Does |
| :--- | :--- |
| Plan | Reads the shared version, requires its changelog section, checks whether `vX.Y.Z` exists |
| Build | Lint, test, audit and build on the merge commit; packages `linkdeck-vX.Y.Z.zip` with a SHA-256 file and a build provenance attestation |
| GitHub release | Creates tag `vX.Y.Z` on the merge commit and the release with the changelog section and both files |
| Chrome Web Store | Uploads and publishes the ZIP — only once the store is configured, and only after approval in the `chrome-web-store` environment |

Verify a downloaded ZIP came from this workflow:

```bash
gh attestation verify linkdeck-vX.Y.Z.zip --repo 64x-lunicorn/LinkDeck
```

## When a run fails

Every job is safe to repeat. Fix the cause, then re-run the failed jobs from the Actions tab, or start the workflow by hand with **Run workflow** on `main`. If the fix needs a code change, merge it as usual; the next run on `main` releases the same version as long as its tag does not exist yet.

Tags matching `v*` cannot be moved or deleted (repository ruleset "Release tags"). A broken release is never re-tagged: ship a new patch version.

## Chrome Web Store

The store job stays skipped until it is configured. The first submission of a new item happens by hand in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), including the listing and privacy fields; the API can only update an existing item. Then:

1. In Google Cloud, enable the Chrome Web Store API and create an OAuth client, and obtain a refresh token for the `https://www.googleapis.com/auth/chromewebstore` scope, following [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api).
2. In the `chrome-web-store` environment, add the secrets `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET` and `CWS_REFRESH_TOKEN`.
3. Add the repository variables `CWS_PUBLISHER_ID` and `CWS_EXTENSION_ID`.

From the next release on, the job waits for approval in the environment, uploads the ZIP, waits for processing and submits it for review with `DEFAULT_PUBLISH`.
