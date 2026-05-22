# NogginLessDom

## Hard Requirements

- **Zero runtime dependencies.** Never add a package to `dependencies` in `package.json`.
- **>=98% test coverage** (ideally 100%) across unit, integration, and e2e tests with full PDV coverage. This is a hard requirement — never merge code that drops coverage below 98%.
- **All dev dependencies must be MIT or MIT-compatible licensed.**
- **Run `make lint` before every commit/push.** Never push code that fails lint.
- **Run `make test` before every commit/push.** Never push code with failing tests.
- **TDD: write tests first, then implement.** All new features and bug fixes must have tests written before implementation.
- **No competitor references.** Do not mention vitest, jsdom, or any other testing framework in source code, documentation, or site content.
- **0 npm vulnerabilities.** Run `npm audit` and ensure zero vulnerabilities before releasing.

## Project Structure

- `src/` — TypeScript source (test runner, assertions, DOM, mocking, coverage)
- `tests/unit/` — Unit tests
- `tests/integration/` — Integration tests
- `tests/e2e/` — End-to-end tests
- `e2e/` — Playwright post-deployment verification tests
- `site/` — GitHub Pages website (SpecifyJS SPA)
- `docs/` — Documentation (source of truth for site content)

## Build & CI

- `make lint` — markdownlint, eslint, yamllint, jsonlint, prettier
- `make test` — unit, integration, e2e tests
- `make build` — TypeScript compilation to build/
- CI pipeline: lint → test → build-lib → e2e → (publish | deploy+PDV)

## Key Conventions

- Use `bun` as the runtime, not `npm` or `node` directly
- Use `bun node_modules/.bin/<tool>` to invoke dev tool binaries
- Node.js >=20.0.0 required
- Default branch is `main`
