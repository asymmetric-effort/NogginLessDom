# Build Process

This guide covers the NogginLessDom build pipeline, from TypeScript source to
publishable artifacts.

## Overview

The build process compiles TypeScript source in `src/` into JavaScript, type
declarations, and source maps in `build/`. The pipeline uses Bun for JavaScript
bundling and the TypeScript compiler (`tsc`) for declaration generation.

```text
src/**/*.ts  -->  bun build  -->  build/*.js
             -->  tsc        -->  build/*.d.ts + *.d.ts.map + *.js.map
```

## Building

### Full Build

```bash
make build
```

This runs a clean build:

1. **Clean.** Removes the `build/` directory and any stale Docker artifacts.
2. **Bundle.** Runs `bun build src/index.ts --outdir build --target node` to
   produce the JavaScript output. Bun bundles all internal imports into a single
   file targeting the Node.js runtime.
3. **Declarations.** Runs `tsc --emitDeclarationOnly` to generate `.d.ts` type
   declaration files and declaration source maps.

### Clean Only

```bash
make clean
```

Removes the `build/` directory and recreates it empty. Also removes any Docker
containers and images related to the project.

## Output Artifacts

After a successful build, the `build/` directory contains:

| File                | Description                                    |
| ------------------- | ---------------------------------------------- |
| `index.js`          | Bundled JavaScript (ESM format, Node target)   |
| `index.d.ts`        | TypeScript type declarations                   |
| `index.d.ts.map`    | Declaration source map (for IDE navigation)    |
| `index.js.map`      | JavaScript source map (for debugging)          |

Additional declaration files are generated for each sub-module:

| File                        | Description                          |
| --------------------------- | ------------------------------------ |
| `test-runner/index.d.ts`    | Test runner type declarations        |
| `assertions/index.d.ts`     | Assertions type declarations         |
| `dom/index.d.ts`            | DOM simulation type declarations     |
| `mocking/index.d.ts`        | Mocking utilities type declarations  |

## Build Configuration

### TypeScript Configuration (`tsconfig.json`)

Key compiler options:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "build",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true
  }
}
```

Notable settings:

- **`strict: true`** -- Enables all strict type-checking options.
- **`noUncheckedIndexedAccess: true`** -- Adds `undefined` to index signatures,
  catching potential runtime errors at compile time.
- **`moduleResolution: "bundler"`** -- Uses Bun-compatible module resolution.
- **`isolatedModules: true`** -- Ensures each file can be independently
  transpiled.

### Package Exports (`package.json`)

The built package uses ESM exports:

```json
{
  "type": "module",
  "main": "build/index.js",
  "types": "build/index.d.ts",
  "exports": {
    ".": {
      "import": "./build/index.js",
      "types": "./build/index.d.ts"
    }
  },
  "files": [
    "build/",
    "LICENSE.txt",
    "README.md"
  ]
}
```

The `files` array controls what is included in the published npm package. Only
the `build/` directory, license, and readme are published -- source code, tests,
docs, and configuration files are excluded.

## Build Prerequisites

Before running `make build`, ensure:

1. **Bun is installed** -- The bundler.
2. **TypeScript is installed** -- Should be present after `bun install` (it is a
   dev dependency).
3. **`bun install` has been run** -- Dev dependencies must be installed.

## Troubleshooting

### "Cannot find module" errors during build

This usually means `bun install` has not been run, or a new import was added
without updating the export map. Run `bun install` and try again.

### Type declaration errors

If `tsc --emitDeclarationOnly` fails, run `bun run typecheck` for more
detailed error output. Common causes:

- Missing type annotations on exported functions.
- Implicit `any` types (forbidden by `strict: true`).
- Circular type references.

### Stale build artifacts

If the build output seems wrong or outdated, run `make clean` before
`make build` to ensure a fresh build.

### Docker-related errors during clean

The `make clean` target removes Docker containers and images matching the
project name. If Docker is not running, you may see warnings -- these are
harmless and do not affect the build.

## Verifying the Build

After building, verify the output:

```bash
# Check that the entry point exists
ls -la build/index.js

# Check that type declarations exist
ls -la build/index.d.ts

# Verify the package can be imported
bun -e "import { describe, expect, Document } from './build/index.js'; console.log('OK')"
```
