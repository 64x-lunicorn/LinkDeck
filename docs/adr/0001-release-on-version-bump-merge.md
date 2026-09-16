# 0001 — Release on the merge of a version bump

Status: accepted, 2026-09-16

## Context

LinkDeck had a tag-triggered release workflow that never ran: no tag and no GitHub release existed, and `package.json`, `public/manifest.json` and `CHANGELOG.md` stood at 2.1.0 for five months while fixes, including two security fixes, landed on `main`. A pushed `v*` tag was not checked against the manifest version, nor required to point at a commit on `main`, and the workflow built with a different Node version and fewer checks than the CI gate.

`main` requires a squash-merged pull request, signed commits and the `CI gate` status check. A pull request or commit created with the workflow's `GITHUB_TOKEN` triggers no workflow, so it never gets `CI gate` and cannot merge without a separate bot credential.

## Decision

A release is a `chore(release): vX.Y.Z` pull request prepared locally by `npm run release`, which raises the version in all three files and writes the changelog section. Merging it is the release decision. A workflow on `main` then creates the tag and the GitHub release from the merge commit, and publishes to the Chrome Web Store behind a protected environment.

The version is derived from Conventional Commits under Semantic Versioning, and the release notes are the `CHANGELOG.md` section, curated in the pull request.

## Consequences

- No bot credential is needed: the release pull request is pushed by a person, gets `CI gate` and signed commits like any other.
- A tag can only point at a reviewed commit on `main`, and the ZIP always carries the version the manifest declares.
- A test in the gate keeps the three version files and the changelog in agreement.
- Releasing takes one local command, one pull request and a merge; nothing happens on a schedule.
- Tags `v*` are immutable by ruleset, so a bad release is followed by a new patch version.

## Alternatives

- **release-please** keeps a release pull request open automatically. Rejected for now: its pull requests need a GitHub App or personal access token to trigger `CI gate`, adding a long-lived credential to a single-maintainer repository.
- **Pushing tags by hand** (the previous workflow). Rejected: nothing tied the tag to `main`, the manifest version or the changelog, and it was never used.
