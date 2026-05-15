# Release Process

This guide covers how NogginLessDom releases are created, versioned, tagged,
and published.

## Semantic Versioning

NogginLessDom follows [Semantic Versioning 2.0.0](https://semver.org/). The
current version is stored in a plain text file named `VERSION` at the project
root. This file contains a single line with the version number (e.g., `0.0.1`).

Version format: `MAJOR.MINOR.PATCH`

- **MAJOR** -- Incremented for backwards-incompatible API changes.
- **MINOR** -- Incremented for new features that are backwards-compatible.
- **PATCH** -- Incremented for backwards-compatible bug fixes.

## Release Targets

The `Makefile` provides three release targets:

### `make release` (Patch Release)

Bumps the patch version. Use for bug fixes and minor improvements that do not
change the public API.

```bash
make release
# 0.0.1 -> 0.0.2
```

### `make release/minor` (Minor Release)

Bumps the minor version and resets the patch version to 0. Use for new features
that are backwards-compatible.

```bash
make release/minor
# 0.0.2 -> 0.1.0
```

### `make release/major` (Major Release)

Bumps the major version and resets both minor and patch to 0. Use for breaking
API changes.

```bash
make release/major
# 0.1.0 -> 1.0.0
```

## What Each Release Target Does

All three targets perform the same sequence of steps:

1. **Read** the current version from the `VERSION` file.
2. **Bump** the appropriate version component.
3. **Write** the new version to the `VERSION` file.
4. **Update** the `version` field in `package.json` to match.
5. **Stage** both `VERSION` and `package.json`.
6. **Commit** with the message `chore: release vX.Y.Z`.
7. **Tag** the commit with `vX.Y.Z`.

The release target does **not** push to the remote or publish to npm. Those
steps are done manually after verifying the release.

## Publishing to npm

After a release commit and tag have been created:

```bash
# Push the commit and tag to the remote
git push origin main --tags

# Publish to npm
npm publish --access public
```

The `npm publish` command uses the `files` field in `package.json` to determine
what is included in the tarball:

- `build/` -- Compiled JavaScript, type declarations, and source maps.
- `LICENSE.txt` -- MIT license.
- `README.md` -- Package readme.

Source code, tests, documentation, and configuration files are excluded from the
published package.

### Scoped Package

NogginLessDom is published under the `@asymmetric-effort` scope. The
`--access public` flag is required for the first publish of a scoped package.
Subsequent publishes do not require it (but including it is harmless).

## Pre-Release Checklist

Before creating a release, verify each of these items:

### Code Quality

- [ ] All tests pass: `make test`
- [ ] All linters pass: `make lint`
- [ ] Build succeeds: `make build`
- [ ] Test coverage is >= 98%
- [ ] Type checking passes: `bun run typecheck`

### Documentation

- [ ] API documentation is up to date for any changed APIs.
- [ ] CHANGELOG (if maintained) is updated.
- [ ] README.md accurately reflects the current state of the project.

### Dependencies

- [ ] `dependencies` in `package.json` is empty (`{}`).
- [ ] No new dev dependencies have been added without review.
- [ ] Existing dev dependencies are up to date.

### Security

- [ ] No known vulnerabilities in dev dependencies.
- [ ] No use of `eval()`, `Function()`, or dynamic code execution.
- [ ] No secrets or credentials in the codebase.

### Version

- [ ] The version bump is appropriate for the changes (patch/minor/major).
- [ ] The `VERSION` file matches `package.json` version.

## Post-Release Steps

After publishing:

1. **Verify the published package** by installing it in a fresh project:

   ```bash
   mkdir /tmp/test-install && cd /tmp/test-install
   bun init -y
   bun add @asymmetric-effort/nogginlessdom
   bun -e "import { describe, expect } from '@asymmetric-effort/nogginlessdom'; console.log('OK')"
   ```

2. **Create a GitHub release** (optional but recommended) linking to the tag
   with release notes summarizing the changes.

3. **Announce the release** in any relevant channels.

## Hotfix Process

If a critical bug is found after release:

1. Create a branch from the release tag: `git checkout -b hotfix/description vX.Y.Z`
2. Fix the bug and add tests.
3. Run the full pre-release checklist.
4. Use `make release` to bump the patch version.
5. Push and publish.
