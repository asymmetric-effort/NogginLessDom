# Contributing to NogginLessDom

Thank you for your interest in contributing to NogginLessDom! This document
provides guidelines and standards for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Fork and Branch Workflow

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:

   ```bash
   git clone git@github.com:<your-username>/NogginLessDom.git
   cd NogginLessDom
   ```

3. **Add the upstream remote**:

   ```bash
   git remote add upstream git@github.com:asymmetric-effort/NogginLessDom.git
   ```

4. **Install dependencies**:

   ```bash
   bun install
   ```

5. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

6. Make your changes, write tests, and verify everything passes.
7. **Push** to your fork and open a Pull Request against `main`.

### Development Prerequisites

- [Bun](https://bun.sh/) (latest stable version)
- [Go](https://go.dev/) 1.22+ (for supporting tooling)
- [Docker](https://www.docker.com/) (for containerized builds)
- GNU Make

## Commit Conventions

Write clear, descriptive commit messages following these conventions:

- **Use the imperative mood**: "Add feature" not "Added feature" or "Adds
  feature".
- **Keep the subject line under 72 characters.**
- **Separate subject from body with a blank line** if a body is needed.
- **Reference issues** where applicable: `Fixes #123` or `Closes #456`.
- **Use conventional prefixes** when appropriate:
  - `feat:` -- A new feature
  - `fix:` -- A bug fix
  - `docs:` -- Documentation changes only
  - `test:` -- Adding or updating tests
  - `refactor:` -- Code change that neither fixes a bug nor adds a feature
  - `chore:` -- Build process, tooling, or dependency changes
  - `ci:` -- CI/CD configuration changes

Example:

```text
feat: add querySelector support for attribute selectors

Implement CSS attribute selector matching in querySelector and
querySelectorAll. Supports [attr], [attr=value], [attr~=value],
[attr|=value], [attr^=value], [attr$=value], and [attr*=value].

Closes #42
```

## Pull Request Process

1. **Ensure all tests pass**: `make test`
2. **Ensure all linters pass**: `make lint`
3. **Ensure build succeeds**: `make build`
4. **Update documentation** if your change affects public APIs.
5. **Add tests** for any new functionality (both happy and error paths).
6. **Keep PRs focused** -- one feature or fix per PR.
7. **Write a clear PR description** explaining:
   - What the change does and why it is needed.
   - How it was tested.
   - Any breaking changes or migration steps.
8. **Request review** from at least one maintainer.
9. **Address review feedback** promptly; push new commits rather than
   force-pushing amended ones so reviewers can see incremental changes.

### PR Checklist

Before submitting your PR, verify:

- [ ] All existing tests pass.
- [ ] New tests are written for new functionality.
- [ ] Test coverage remains >= 98%.
- [ ] Code passes `make lint` with no warnings or errors.
- [ ] Documentation is updated for any API changes.
- [ ] No third-party runtime dependencies have been added.
- [ ] Commit messages follow the conventions above.

## Coding Standards

### TypeScript

- TypeScript is the primary language for all package source code.
- Use strict TypeScript (`strict: true` in tsconfig).
- Prefer explicit type annotations over type inference for public APIs.
- Use interfaces for object shapes; use type aliases for unions/intersections.
- Write JSDoc comments for all exported functions, classes, and interfaces.
- Avoid `any`; use `unknown` when the type is truly not known.

### Go

- Go is used for supporting build and release tooling.
- Follow standard Go conventions (`gofmt`, `go vet`).
- Keep Go tooling minimal and focused.

### General

- **No third-party runtime dependencies.** This is a hard rule. The zero
  dependency guarantee is a core project value. If you believe an exception is
  warranted, open an issue for discussion **before** writing code.
- Dev dependencies for linting, building, and testing are acceptable but must
  be **MIT or MIT-compatible licensed**.
- Follow existing code patterns and project structure.
- Prefer explicit over implicit behavior.

## Testing Requirements

All contributions must maintain **>= 98% test coverage** across:

- **Unit tests** (`tests/unit/`) -- Test individual functions and classes in
  isolation.
- **Integration tests** (`tests/integration/`) -- Test module interactions.
- **End-to-end tests** (`tests/e2e/`) -- Test complete workflows.

Run the full test suite with:

```bash
make test
```

Write tests that cover:

- Happy path (expected behavior).
- Error/edge cases (invalid inputs, boundary conditions).
- Concurrency scenarios where applicable.

## Reporting Issues

- Use [GitHub Issues](https://github.com/asymmetric-effort/NogginLessDom/issues)
  for bug reports and feature requests.
- For **security vulnerabilities**, see [SECURITY.md](SECURITY.md) -- do not
  use public issues.
- Include reproduction steps, expected behavior, and actual behavior for bug
  reports.
- Check existing issues before creating a new one.

## License

By contributing to NogginLessDom, you agree that your contributions will be
licensed under the [MIT License](LICENSE.txt).
