# Installation

This guide covers installing NogginLessDom, verifying the installation, and
configuring TypeScript support.

## Installing with Bun

Bun is the recommended package manager and runtime:

```bash
bun add -d @asymmetric-effort/nogginlessdom
```

The `-d` flag installs it as a dev dependency, which is appropriate since
testing frameworks are not needed at runtime in your application.

## Installing with npm

```bash
npm install --save-dev @asymmetric-effort/nogginlessdom
```

## Installing with yarn

```bash
yarn add -D @asymmetric-effort/nogginlessdom
```

## Installing with pnpm

```bash
pnpm add -D @asymmetric-effort/nogginlessdom
```

## Peer Dependencies

NogginLessDom has **no peer dependencies** and **no runtime dependencies**. The
only thing installed is the package itself. There is no transitive dependency
tree to audit, lock, or worry about.

```json
{
  "dependencies": {}
}
```

This is a core design principle. See the [Architecture](../architecture.md)
document for the reasoning behind this decision.

## Requirements

- **Node.js** >= 20.0.0
- **Bun** (recommended) or any Node.js-compatible runtime

## Verifying the Installation

After installing, verify that the package is importable:

```bash
bun -e "import { describe, it, expect } from '@asymmetric-effort/nogginlessdom'; console.log('NogginLessDom installed successfully')"
```

Or with Node.js:

```bash
node -e "import('@asymmetric-effort/nogginlessdom').then(m => console.log('OK:', Object.keys(m).length, 'exports'))"
```

You should see confirmation that the package loaded and its exports are
accessible.

## TypeScript Setup

NogginLessDom is written in TypeScript and ships with type declarations
(`*.d.ts` files). No additional `@types/` packages are needed.

### Basic Imports

```typescript
import {
  describe,
  it,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  Document,
  Element,
  Node,
  TextNode,
  Event,
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
} from '@asymmetric-effort/nogginlessdom';
```

Import only what you need:

```typescript
// Just the test runner and assertions
import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

// Just the DOM simulation
import { Document, Element, Event } from '@asymmetric-effort/nogginlessdom';

// Just mocking utilities
import { fn, spyOn, vi } from '@asymmetric-effort/nogginlessdom';

// Coverage tools
import { startCoverage, stopCoverage } from '@asymmetric-effort/nogginlessdom';

// Dependency analysis
import { detectCircularImports, buildDependencyGraph } from '@asymmetric-effort/nogginlessdom';
```

### TypeScript Configuration

NogginLessDom targets ESNext and uses ESM modules. Your `tsconfig.json` should
be compatible with these settings. A minimal configuration:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  }
}
```

If you are using Bun, add `bun-types` to your `types` array for full runtime
type support:

```json
{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}
```

## What Gets Installed

The published package contains:

| Path               | Contents                                     |
| ------------------ | -------------------------------------------- |
| `build/index.js`   | Bundled JavaScript (ESM, Node target)        |
| `build/index.d.ts` | TypeScript type declarations                 |
| `build/*.map`      | Source maps for debugging and IDE navigation |
| `LICENSE.txt`      | MIT license                                  |
| `README.md`        | Package readme                               |

Source code, tests, documentation, and build configuration are **not** included
in the published package. The install footprint is minimal.

## Updating

```bash
# Bun
bun update @asymmetric-effort/nogginlessdom

# npm
npm update @asymmetric-effort/nogginlessdom

# yarn
yarn upgrade @asymmetric-effort/nogginlessdom

# pnpm
pnpm update @asymmetric-effort/nogginlessdom
```

## Uninstalling

```bash
# Bun
bun remove @asymmetric-effort/nogginlessdom

# npm
npm uninstall @asymmetric-effort/nogginlessdom

# yarn
yarn remove @asymmetric-effort/nogginlessdom

# pnpm
pnpm remove @asymmetric-effort/nogginlessdom
```
