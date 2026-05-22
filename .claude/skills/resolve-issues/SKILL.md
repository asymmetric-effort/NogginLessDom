---
description: Work through open GitHub issues by label using git worktrees and pull requests. Implements fixes using TDD, validates, creates PRs, and releases. Use when asked to resolve issues, fix tickets, or work through a backlog.
allowed-tools: Bash(*) Read Edit Write Glob Grep Agent
context: fork
---

# Resolve GitHub Issues

Work through open GitHub issues matching a label filter. For each issue: create a worktree branch, implement using TDD, validate, push, create a PR. After all PRs are merged, bump the patch version and release.

## Input

The argument is the label to filter by (e.g. "high priority", "medium priority", "bug"). If no argument provided, default to "high priority".

Label: $ARGUMENTS

## Workflow

### 1. List Issues

```bash
gh issue list --repo asymmetric-effort/NogginLessDom --state open --label "$LABEL" --json number,title --jq '.[] | "#\(.number): \(.title)"'
```

If no issues match, report "No open issues with label: $LABEL" and stop.

### 2. Ensure Clean Main Branch

```bash
cd ~/git/NogginLessDom
git checkout main
git pull origin main
git status -s
```

If not clean, stop and ask the user to resolve uncommitted changes.

### 3. Process Each Issue

For each issue (smallest/simplest first):

#### a. Create worktree branch

```bash
BRANCH="fix/issue-$NUMBER"
git worktree add "../NogginLessDom-$NUMBER" -b "$BRANCH" main
cd "../NogginLessDom-$NUMBER"
```

#### b. Read the issue

```bash
gh issue view $NUMBER --repo asymmetric-effort/NogginLessDom --json title,body
```

#### c. Implement with TDD

Launch an agent (use `isolation: "worktree"` if available, otherwise work in the worktree directory) with:
- Clear description of what to implement (from the issue body)
- TDD requirement: write tests FIRST in `tests/unit/<feature>.test.ts`, then implement
- Constraints: no `any` types, explicit return types, zero third-party deps
- Working directory: the worktree path
- Verification: `make lint`, `bun test tests/unit tests/integration tests/e2e`, `make build`
- Do NOT commit

#### d. Validate the agent's output

Run in the worktree:

```bash
bun install --frozen-lockfile
bun node_modules/.bin/prettier --write 'src/**/*.ts' 'tests/**/*.ts'
make lint
bun test tests/unit tests/integration tests/e2e
make build
```

Fix any lint, test, or build failures before proceeding.

#### e. Commit and push branch

```bash
git add -A
git commit --no-verify -m "feat: <description>

<details>. N new tests. Closes #NUMBER

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin "$BRANCH"
```

#### f. Create Pull Request

```bash
gh pr create --repo asymmetric-effort/NogginLessDom \
  --title "feat: <short description> (#$NUMBER)" \
  --body "$(cat <<EOF
## Summary
- <bullet points of what was implemented>

## Tests
- N new tests in \`tests/unit/<file>.test.ts\`

## Closes
- Closes #$NUMBER

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)" --base main --head "$BRANCH"
```

#### g. Wait for CI on the PR

```bash
gh pr checks $PR_NUMBER --repo asymmetric-effort/NogginLessDom --watch
```

If CI fails, fix in the worktree, commit, push. CI re-runs automatically.

#### h. Merge the PR (if CI passes)

```bash
gh pr merge $PR_NUMBER --repo asymmetric-effort/NogginLessDom --merge --delete-branch
```

#### i. Cleanup worktree

```bash
cd ~/git/NogginLessDom
git worktree remove "../NogginLessDom-$NUMBER"
git pull origin main
```

### 4. Bump Version and Release

After ALL issues in the batch are merged:

```bash
cd ~/git/NogginLessDom
git checkout main
git pull origin main

CURRENT=$(cat VERSION)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
NEW="$MAJOR.$MINOR.$PATCH"
echo "$NEW" > VERSION
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" package.json

make lint && make test && make build

git add VERSION package.json
git commit --no-verify -m "chore: release v$NEW

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git tag -a "v$NEW" -m "v$NEW"
git push origin main --tags
```

### 5. Verify Release

Watch the tag CI run (includes npm publish via OIDC):

```bash
gh run watch $TAG_RUN_ID --repo asymmetric-effort/NogginLessDom --exit-status
npm view @asymmetric-effort/nogginlessdom version
```

Report summary: issues resolved, PRs merged, new version, test count.

## Hard Rules (from CLAUDE.md)

- **Always `make lint` before commit.** Never push code that fails lint.
- **>=98% test coverage.** Never merge code that drops coverage.
- **TDD: write tests first, then implement.**
- **Zero runtime dependencies.** Dev deps must be MIT-compatible.
- **0 npm vulnerabilities.**
- **No competitor references** (vitest, jsdom) in code or docs.
- **Use worktree branches** — never push directly to main.
- **Create PRs** — all changes go through pull requests.
