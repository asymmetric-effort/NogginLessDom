# Development Environment Setup

This guide covers everything needed to set up a development environment for
working on NogginLessDom.

## Prerequisites

Install the following before you begin:

### Bun (latest stable)

Bun is the primary runtime and package manager. Install it from
[bun.sh](https://bun.sh/):

```bash
curl -fsSL https://bun.sh/install | bash
```

Verify:

```bash
bun --version
```

### Go 1.22+

Go is used for supporting build and release tooling. Install it from
[go.dev](https://go.dev/dl/):

```bash
# macOS (Homebrew)
brew install go

# Linux
wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

Verify:

```bash
go version
```

### Docker

Docker is used for containerized builds and clean-room testing. Install from
[docker.com](https://docs.docker.com/get-docker/).

Verify:

```bash
docker --version
```

### GNU Make

Make drives the build pipeline. It is pre-installed on most Linux and macOS
systems. On Windows, use WSL or install via Chocolatey:

```bash
# Verify
make --version
```

### Git

Git is required for version control. Install from
[git-scm.com](https://git-scm.com/).

## Cloning and Installing

```bash
# Clone the repository
git clone git@github.com:asymmetric-effort/NogginLessDom.git
cd NogginLessDom

# Install dependencies
bun install
```

## Verifying the Setup

Run the linter and test suite to confirm everything is working:

```bash
make lint && make test
```

If both commands pass without errors, your environment is ready.

## IDE Setup

### VS Code

Recommended extensions:

- **ESLint** (`dbaeumer.vscode-eslint`) -- Inline linting for TypeScript.
- **Prettier** (`esbenp.prettier-vscode`) -- Code formatting on save.
- **EditorConfig** (`EditorConfig.EditorConfig`) -- Consistent formatting from
  `.editorconfig`.
- **Bun** (`nicolo-ribaudo.vscode-bun`) -- Bun runtime support.

Recommended `settings.json` additions for this workspace:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### JetBrains (WebStorm / IntelliJ)

- Enable ESLint under **Settings > Languages & Frameworks > JavaScript > Code
  Quality Tools > ESLint**. Select "Automatic ESLint configuration."
- Enable Prettier under **Settings > Languages & Frameworks > JavaScript >
  Prettier**. Check "On save."
- The project's `.editorconfig` is automatically respected.

### Vim / Neovim

If using `coc.nvim` or `nvim-lspconfig`, configure the TypeScript language
server to use the project's `tsconfig.json`. Add ESLint via `coc-eslint` or
`eslint-lsp`.

## Project Structure

```text
NogginLessDom/
  src/                     # TypeScript source code
    index.ts               # Package entry point; re-exports all modules
    test-runner/           # Test runner wrapping node:test
      index.ts
    assertions/            # Assertion library wrapping node:assert
    dom/                   # Built-in DOM simulation
    mocking/               # Mock functions, spies, and timer mocking
  tests/                   # Test suites
    unit/                  # Unit tests (isolated function/class tests)
    integration/           # Integration tests (module interaction tests)
    e2e/                   # End-to-end tests (full workflow tests)
  build/                   # Compiled output (gitignored)
  docs/                    # Documentation
    api/                   # API reference for each module
    developer/             # Developer/contributor guides
    user/                  # End-user guides
  Makefile                 # Build, test, lint, release targets
  package.json             # Package manifest (zero runtime deps)
  tsconfig.json            # TypeScript compiler configuration
  bunfig.toml              # Bun runtime and test configuration
  VERSION                  # Current version (semver)
  CONTRIBUTING.md          # Contribution guidelines
  SECURITY.md              # Security policy
  LICENSE.txt              # MIT license
```

### Key Files

| File              | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `src/index.ts`    | Entry point. Exports all public APIs.               |
| `Makefile`        | All build, test, lint, and release automation.      |
| `package.json`    | npm package manifest. `dependencies` must be `{}`.  |
| `tsconfig.json`   | Strict TypeScript config targeting ESNext.          |
| `bunfig.toml`     | Bun test config with 98% coverage thresholds.       |
| `VERSION`         | Plain text file containing the current semver.      |

## Workflow Summary

A typical development cycle:

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes in `src/`.
3. Write or update tests in `tests/`.
4. Run `make lint` to check for style issues.
5. Run `make test` to verify all tests pass.
6. Run `make build` to verify the build succeeds.
7. Push and open a pull request.
