# Developer Guide

This section contains documentation for contributors to NogginLessDom. Whether
you are fixing a bug, adding a feature, or improving documentation, start here.

## Guides

### [Environment Setup](setup.md)

Prerequisites, cloning the repository, installing dependencies, IDE
configuration, and an overview of the project directory structure. Start here
if this is your first time working on the project.

### [Testing](testing.md)

How tests are organized (unit, integration, e2e), how to run them, coverage
requirements (>= 98%), writing effective tests, and naming conventions.

### [Building](building.md)

The build pipeline from TypeScript source to publishable artifacts. Covers
`make build`, output artifacts (JS, `.d.ts`, source maps), clean builds, and
troubleshooting.

### [Releasing](releasing.md)

The release process: semantic versioning via the `VERSION` file, `make release`
targets, what each target does, publishing to npm, and the pre-release
checklist.

## Key Principles for Contributors

1. **Zero runtime dependencies.** This is the project's defining constraint.
   Never add a package to `dependencies` in `package.json`. If you think an
   exception is warranted, open an issue for discussion before writing code.

2. **Dev dependencies are acceptable** but must be MIT or MIT-compatible
   licensed. Keep them minimal.

3. **Test everything.** Coverage must remain at or above 98%. Every public API
   function needs happy-path and error-path tests.

4. **Document everything.** If you add or change a public API, update the
   corresponding API reference in `docs/api/`.

5. **Follow existing patterns.** Look at how existing modules are structured
   before creating new ones. Consistency matters.

## Quick Reference

| Task                  | Command                |
| --------------------- | ---------------------- |
| Install dependencies  | `bun install`          |
| Run all tests         | `make test`            |
| Run linters           | `make lint`            |
| Build                 | `make build`           |
| Clean build artifacts | `make clean`           |
| Type check only       | `bun run typecheck`    |
| Release (patch)       | `make release`         |
| Release (minor)       | `make release/minor`   |
| Release (major)       | `make release/major`   |

## Related Documents

- [CONTRIBUTING.md](../../CONTRIBUTING.md) -- Contribution guidelines, commit
  conventions, and PR process.
- [SECURITY.md](../../SECURITY.md) -- Security policy and vulnerability
  reporting.
- [Architecture](../architecture.md) -- System design and module structure.
