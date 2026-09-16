# Contributing to LinkDeck

Thanks for your interest in contributing! Here's how to get started.

## Before you start

- Search [existing issues](https://github.com/64x-lunicorn/LinkDeck/issues) before opening a new one, and discuss larger changes in an issue before starting a pull request.
- Read the [project overview](README.md) and [CLAUDE.md](CLAUDE.md).
- Keep discussions respectful, constructive and focused on the work.
- For vulnerabilities, follow [SECURITY.md](SECURITY.md) rather than opening a public issue.

## Development setup

```bash
# Node.js 24
git clone https://github.com/64x-lunicorn/LinkDeck.git
cd LinkDeck
git checkout -b my-feature main
npm install
```

## Checks

Before pushing, run the whole gate in one command:

```bash
npm run ci
```

It runs every check CI runs: Lint, Test, Build, Security audit. On a pull request, CI also runs Workflow lint and Secret scan and ends in `CI gate`, the only required status check. [docs/ci-cd.md](docs/ci-cd.md) describes the gate and the rules on `main`.

## Releases

Maintainers cut releases with `npm run release` and a release pull request; [docs/releasing.md](docs/releasing.md) describes versioning, the changelog and what the merge triggers.

## Code style

- ESLint, default recommended config — run `npm run lint`.
- No external YAML library — `src/parser.js` is hand-written on purpose.
- CSS uses custom properties (design tokens) — avoid hardcoded colors.

## Commit message example

- `fix: search clears on Escape`

## Submitting a pull request

1. Keep the change focused and avoid unrelated formatting or refactors.
2. Explain the problem and the solution, and link the issue.
3. Add or update tests for changed behaviour, and update the affected documentation.
4. Write commits as Conventional Commits in English imperative mood.
5. List the checks you ran and any known limitations.

Only contribute material you have the right to submit. Contributions are made under the existing [GNU General Public License v3.0](LICENSE).
