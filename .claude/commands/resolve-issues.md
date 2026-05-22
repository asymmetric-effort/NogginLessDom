# Resolve GitHub Issues

Work through open GitHub issues matching a label filter. For each issue: implement the fix using TDD, validate, commit, push, verify CI. After all issues are resolved, bump the patch version and release.

## Input

The argument is the label to filter by (e.g. "high priority", "medium priority", "bug"). If no argument, default to "high priority".

## Workflow

### 1. List Issues

```
gh issue list --repo asymmetric-effort/NogginLessDom --state open --label "$LABEL" --json number,title --jq '.[] | "#\(.number): \(.title)"'
```

If no issues match, report "No open issues with label: $LABEL" and stop.

### 2. Ensure Clean Working Tree

```
git status -s
```

If not clean, stop and ask the user to resolve uncommitted changes.

### 3. Process Each Issue Sequentially

For each issue (smallest/simplest first):

#### a. Read the issue
```
gh issue view $NUMBER --repo asymmetric-effort/NogginLessDom --json title,body
```

#### b. Implement with TDD
Launch an agent with:
- Clear description of what to implement (from the issue body)
- TDD requirement: write tests FIRST, then implement
- Test file naming: `tests/unit/<feature>.test.ts`
- Constraints: no `any` types, explicit return types, zero third-party deps
- Verification steps: `make lint`, `bun test tests/unit tests/integration tests/e2e`, `make build`
- Do NOT commit

#### c. Validate the agent's output
Run locally:
```
make lint
bun test tests/unit tests/integration tests/e2e
make build
```

If lint fails on formatting, run `bun node_modules/.bin/prettier --write 'src/**/*.ts' 'tests/**/*.ts'`.
If lint fails on unused imports or `any` types, fix them.
If tests fail, investigate and fix.
If build fails (TypeScript errors), fix them.

Re-run validation until all three pass.

#### d. Commit and push
```
git add -A
git commit --no-verify -m "feat: <description>

<details of what was implemented>. N new tests. Closes #NUMBER

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin main
```

#### e. Verify CI passes
```
gh run list --repo asymmetric-effort/NogginLessDom --limit 1 --workflow ci.yml
gh run watch $RUN_ID --exit-status
```

If CI fails, investigate, fix, and push again.

#### f. Close the issue (if not auto-closed by commit message)
```
gh issue close $NUMBER --repo asymmetric-effort/NogginLessDom --comment "Resolved in $COMMIT_SHA"
```

### 4. Bump Version and Release

After ALL issues in the batch are resolved:

```
# Bump patch version
CURRENT=$(cat VERSION)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
NEW="$MAJOR.$MINOR.$PATCH"
echo "$NEW" > VERSION
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" package.json

# Validate one final time
make lint && make test && make build

# Commit, tag, push
git add VERSION package.json
git commit --no-verify -m "chore: release v$NEW

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git tag -a "v$NEW" -m "v$NEW"
git push origin main --tags
```

### 5. Verify Release

Watch the tag CI run (includes npm publish):
```
gh run watch $TAG_RUN_ID --exit-status
```

Verify npm:
```
npm view @asymmetric-effort/nogginlessdom version
```

Report final summary: how many issues resolved, new version number, test count.

## Hard Rules (from CLAUDE.md)

- **Always run `make lint` before committing.** Never push code that fails lint.
- **>=98% test coverage.** Never merge code that drops coverage.
- **TDD: write tests first, then implement.**
- **Zero runtime dependencies.** Dev deps must be MIT-compatible.
- **0 npm vulnerabilities.**
- **No competitor references** (vitest, jsdom) in code or docs.
