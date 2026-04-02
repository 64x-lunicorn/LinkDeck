# Contributing to LinkDeck

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/64x-lunicorn/LinkDeck.git
cd LinkDeck
npm install
```

## Scripts

| Command             | Description              |
| ------------------- | ------------------------ |
| `npm run dev`       | Vite dev server          |
| `npm run build`     | Production build → dist/ |
| `npm run lint`      | ESLint                   |
| `npm test`          | Run tests (vitest)       |
| `npm run test:watch`| Tests in watch mode      |

## Workflow

1. Fork the repo and create a feature branch from `main`.
2. Make your changes.
3. Run `npm run lint && npm test` — both must pass.
4. Commit with a clear message (e.g. `fix: search clears on Escape`).
5. Open a Pull Request against `main`.

## Code Style

- ESLint with the default recommended config — run `npm run lint`.
- No external YAML library — the parser is hand-written on purpose.
- CSS uses custom properties (design tokens) — avoid hardcoded colors.

## Reporting Issues

Open a [GitHub Issue](https://github.com/64x-lunicorn/LinkDeck/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Chrome version

## License

By contributing you agree that your contributions will be licensed under the [GPLv3](LICENSE).
