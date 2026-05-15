# Configuration

NogginLessDom is designed to work with minimal configuration. Most settings are
managed through Bun's configuration file (`bunfig.toml`) and standard
TypeScript configuration.

## Test File Patterns

By default, Bun discovers test files matching these patterns:

- `**/*.test.ts`
- `**/*.test.tsx`
- `**/*.spec.ts`
- `**/*.spec.tsx`

Files in `node_modules/` are excluded. You can override the test file discovery
by passing explicit paths:

```bash
# Run tests in a specific directory
bun test tests/unit

# Run a specific test file
bun test tests/unit/assertions/expect.test.ts
```

## bunfig.toml

The primary configuration file for test behavior is `bunfig.toml` at the
project root. NogginLessDom's default configuration:

```toml
[test]
coverage = true
coverageThreshold = { line = 98, function = 98, statement = 98 }
```

### Available Test Options

```toml
[test]

# Enable code coverage collection
coverage = true

# Coverage thresholds (test run fails if below these values)
coverageThreshold = { line = 98, function = 98, statement = 98 }

# Timeout for individual tests (in milliseconds)
# timeout = 5000

# Root directory for test discovery
# root = "tests"

# Preload scripts (run before tests)
# preload = ["./tests/setup.ts"]

# Bail after N failures (0 = do not bail)
# bail = 0

# Rerun tests on file changes
# watch = false
```

### Coverage Options

| Option              | Type     | Default | Description                          |
| ------------------- | -------- | ------- | ------------------------------------ |
| `coverage`          | `bool`   | `false` | Enable code coverage collection      |
| `coverageThreshold` | `object` | --      | Minimum thresholds for pass/fail     |

Coverage threshold fields:

| Field       | Description                                |
| ----------- | ------------------------------------------ |
| `line`      | Minimum percentage of lines covered        |
| `function`  | Minimum percentage of functions covered    |
| `statement` | Minimum percentage of statements covered   |

If any threshold is not met, the test run fails with a non-zero exit code.

### Test Filtering

From the command line, you can filter which tests run:

```bash
# Run only tests matching a name pattern
bun test --grep "should handle"

# Run only tests in a specific file
bun test path/to/file.test.ts

# Skip tests marked with { skip: true }
# (these are skipped by default; the flag is in the test options)
```

## Test Setup Files

If you need to run setup code before all tests (e.g., configuring a global DOM
document, registering custom matchers), create a preload file and reference it
in `bunfig.toml`:

```toml
[test]
preload = ["./tests/setup.ts"]
```

Example `tests/setup.ts`:

```typescript
import { Document } from '@asymmetric-effort/nogginlessdom';

// Create a global document available to all tests
globalThis.testDocument = new Document();
```

## DOM Configuration

The DOM simulation does not require configuration for basic use. Simply import
and instantiate:

```typescript
import { Document } from '@asymmetric-effort/nogginlessdom';

const doc = new Document();
```

### Configuring a Shared Document

For test suites that need a pre-populated DOM, create the document in a
`beforeAll` or `beforeEach` hook:

```typescript
import { describe, beforeEach, Document } from '@asymmetric-effort/nogginlessdom';

describe('Component Tests', () => {
  let doc: Document;

  beforeEach(() => {
    doc = new Document();
    const root = doc.createElement('div');
    root.id = 'root';
    doc.appendChild(root);
  });

  // tests use `doc` here...
});
```

### innerHTML for Complex Structures

To set up complex DOM structures quickly, use `innerHTML`:

```typescript
const container = doc.createElement('div');
container.innerHTML = `
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>
  <main>
    <h1>Welcome</h1>
  </main>
`;
doc.appendChild(container);
```

## Custom Reporters

Bun supports custom test reporters. To use a custom reporter with
NogginLessDom tests, pass the `--reporter` flag:

```bash
# Use the default reporter
bun test

# Use the JUnit reporter (for CI)
bun test --reporter junit

# Use a custom reporter module
bun test --reporter ./reporters/custom.ts
```

Custom reporter modules should export a default function that receives test
events. Consult the
[Bun test reporter documentation](https://bun.sh/docs/cli/test) for the full
API.

## Environment Variables

| Variable         | Description                                         |
| ---------------- | --------------------------------------------------- |
| `NODE_ENV`       | Set to `test` during test runs (Bun default)        |
| `BUN_DEBUG`      | Enable Bun debug output                             |
| `CI`             | Set in CI environments; can affect reporter output   |

## TypeScript Configuration

See the [Installation guide](installation.md) for TypeScript configuration
details. The key settings for NogginLessDom compatibility are:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```
