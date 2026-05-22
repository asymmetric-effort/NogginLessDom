---
description: Work through open GitHub issues by label. Implements fixes using TDD, validates, commits, pushes, verifies CI, closes issues, and releases. Use when asked to resolve issues, fix tickets, or work through a backlog.
allowed-tools: Bash(*) Read Edit Write Glob Grep Agent
---

# Resolve GitHub Issues

Work through open GitHub issues matching a label filter. For each issue: implement the fix using TDD, validate, commit, push, verify CI. After all issues are resolved, bump the patch version and release.

## Input

The argument is the label to filter by (e.g. "high priority", "medium priority", "bug"). If no argument provided, default to "high priority".

Label: $ARGUMENTS

## Workflow

### 1. List Issues

```bash
gh issue list --repo asymmetric-effort/NogginLessDom --state open --label "$LABEL" --json number,title --jq '.[] | "#\(.number): \(.title)"'
```

If no issues match, report "No open issues with label: $LABEL" and stop.

### 2. Ensure Clean Working Tree

Run `git status -s`. If not clean, stop and ask the user to resolve uncommitted changes.

### 3. Process Each Issue Sequentially

For each issue (smallest/simplest first):

#### a. Read the issue

```bash
gh issue view $NUMBER --repo asymmetric-effort/NogginLessDom --json title,body
```

#### b. Implement with TDD

Launch an agent with:
- Clear description of what to implement (from the issue body)
- TDD requirement: write tests FIRST in `tests/unit/<feature>.test.ts`, then implement
- Constraints: no `any` types, explicit return types, zero third-party deps
- Verification: `make lint`, `bun test tests/unit tests/integration tests/e2e`, `make build`
- Do NOT commit

#### c. Validate the agent's output

Run locally:

```bash
bun node_modules/.bin/prettier --write 'src/**/*.ts' 'tests/**/*.ts'
make lint
bun test tests/unit tests/integration tests/e2e
make build
```

Fix any lint, test, or build failures before proceeding.

#### d. Commit and push

```bash
git add -A
git commit --no-verify -m "feat: <description>

<details>. N new tests. Closes #NUMBER

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin main
```

#### e. Verify CI

Watch the CI run. If it fails, fix and push again.

### 4. Bump Version and Release

After ALL issues in the batch are resolved:

```bash
CURRENT=$(cat VERSION)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
NEW="$MAJOR.$MINOR.$PATCH"
echo "$NEW" > VERSION
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" package.json
make lint && make test && make build
git add VERSION package.json
git commit --no-verify -m "chore: release v$NEW"
git tag -a "v$NEW" -m "v$NEW"
git push origin main --tags
```

### 5. Verify Release

Watch the tag CI run and verify npm publish:

```bash
npm view @asymmetric-effort/nogginlessdom version
```

Report summary: issues resolved, new version, test count.

## Hard Rules

- **Always `make lint` before commit.** Never push code that fails lint.
- **>=98% test coverage.** Never merge code that drops coverage.
- **TDD: write tests first, then implement.**
- **Zero runtime dependencies.** Dev deps must be MIT-compatible.
- **0 npm vulnerabilities.**
- **No competitor references** (vitest, jsdom) in code or docs.
