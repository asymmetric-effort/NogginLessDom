# Testing Guide

This guide covers how tests are organized in NogginLessDom, how to run them,
coverage requirements, and best practices for writing effective tests.

## Test Structure

Tests are organized into three directories under `tests/`:

```text
tests/
  unit/           # Isolated tests for individual functions and classes
  integration/    # Tests for interactions between modules
  e2e/            # End-to-end workflow tests
```

### Unit Tests (`tests/unit/`)

Unit tests verify individual functions, methods, and classes in isolation. Each
source module should have a corresponding test file or directory:

```text
tests/unit/
  test-runner/
    describe.test.ts
    it.test.ts
    lifecycle.test.ts
  assertions/
    expect.test.ts
    matchers.test.ts
    not.test.ts
    async.test.ts
  dom/
    document.test.ts
    element.test.ts
    node.test.ts
    event.test.ts
    selectors.test.ts
  mocking/
    fn.test.ts
    spyOn.test.ts
    timers.test.ts
```

Unit tests should:

- Test one behavior per test case.
- Not depend on other modules (mock dependencies if needed).
- Be fast (no I/O, no timers, no network).

### Integration Tests (`tests/integration/`)

Integration tests verify that modules work correctly together. For example,
testing that the assertion module works properly with the test runner, or that
DOM elements created by `Document` are correctly queried.

```text
tests/integration/
  runner-with-assertions.test.ts
  dom-with-assertions.test.ts
  mocking-with-runner.test.ts
```

### End-to-End Tests (`tests/e2e/`)

End-to-end tests verify complete user workflows. They simulate how a real user
would use the library: importing it, writing tests, and running them.

```text
tests/e2e/
  full-test-suite.test.ts
  dom-testing-workflow.test.ts
  migration-compatibility.test.ts
```

## Running Tests

### Run All Tests

```bash
make test
```

This runs unit, integration, and e2e tests in sequence. All three suites must
pass for the build to be considered green.

### Run a Specific Suite

```bash
# Unit tests only
bun test tests/unit

# Integration tests only
bun test tests/integration

# E2E tests only
bun test tests/e2e
```

### Run a Specific Test File

```bash
bun test tests/unit/assertions/expect.test.ts
```

### Run Tests Matching a Pattern

```bash
bun test --grep "should handle null values"
```

### Run Tests with Coverage

Coverage is enabled by default in `bunfig.toml`. To see coverage output:

```bash
bun test --coverage
```

## Coverage Requirements

NogginLessDom enforces strict coverage thresholds. These are configured in
`bunfig.toml`:

```toml
[test]
coverage = true
coverageThreshold = { line = 98, function = 98, statement = 98 }
```

All three metrics -- line coverage, function coverage, and statement coverage --
must be at or above **98%**. The CI pipeline will fail if coverage drops below
these thresholds.

### Why 98%?

A high coverage threshold:

- Ensures every code path is exercised, catching edge cases early.
- Forces contributors to write error-path tests, not just happy-path tests.
- Catches dead code -- if code cannot be reached by tests, it likely should not
  exist.

The remaining 2% provides room for genuinely untestable code (defensive error
handling, platform-specific branches).

## Writing Tests

### Test Naming Conventions

Use descriptive names that explain the expected behavior:

```typescript
// Good: describes behavior
it('should return null when element is not found', () => { /* ... */ });
it('should throw TypeError for non-string selectors', () => { /* ... */ });
it('should preserve attribute order after serialization', () => { /* ... */ });

// Bad: too vague
it('works', () => { /* ... */ });
it('test getElementById', () => { /* ... */ });
it('error case', () => { /* ... */ });
```

### Happy Path Tests

Test the expected behavior with valid inputs:

```typescript
describe('getElementById', () => {
  it('should find an element by its id', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.id = 'target';
    doc.appendChild(div);

    const result = doc.getElementById('target');
    expect(result).toBe(div);
  });
});
```

### Error Path Tests

Test behavior with invalid, missing, or boundary-condition inputs:

```typescript
describe('getElementById', () => {
  it('should return null when no element has the given id', () => {
    const doc = new Document();
    expect(doc.getElementById('nonexistent')).toBeNull();
  });

  it('should return null for empty string id', () => {
    const doc = new Document();
    expect(doc.getElementById('')).toBeNull();
  });
});
```

### Testing Async Code

Use `async`/`await` in your test functions:

```typescript
it('should resolve with user data', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Alice');
});

it('should reject for invalid user id', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('invalid id');
});
```

### Testing Events

```typescript
it('should fire click handlers', () => {
  const doc = new Document();
  const button = doc.createElement('button');
  const handler = fn();

  button.addEventListener('click', handler);
  button.dispatchEvent(new Event('click'));

  expect(handler.mock.calls).toHaveLength(1);
});
```

### Testing with Mocks

```typescript
it('should call the logger on error', () => {
  const logger = { error: fn() };
  const service = new Service(logger);

  service.processInvalid(null);

  expect(logger.error.mock.calls).toHaveLength(1);
  expect(logger.error.mock.calls[0][0]).toMatch(/invalid/i);
});
```

## Best Practices

1. **One assertion concept per test.** A test can have multiple `expect` calls,
   but they should all verify the same logical behavior.

2. **Arrange-Act-Assert.** Structure each test in three phases: set up the
   state, perform the action, check the result.

3. **Do not test implementation details.** Test observable behavior (return
   values, side effects, state changes), not internal method calls or private
   state.

4. **Clean up after yourself.** Use `afterEach` to restore mocks, fake timers,
   and any global state changes.

5. **Avoid test interdependence.** Each test should be independent and
   self-contained. Do not rely on the execution order of other tests.

6. **Keep tests fast.** Unit tests should complete in milliseconds. Avoid I/O,
   network calls, and real timers in unit tests.
