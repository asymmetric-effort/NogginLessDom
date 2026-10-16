# CLI Reference

NogginLessDom provides a CLI entry point for running tests and performing
dependency analysis directly from the command line.

## Installation

After installing the package, the `nogginlessdom` command is available via
`npx` or as a direct binary if installed globally:

```bash
npx nogginlessdom [options] [subcommand] [files...]
```

## Options

| Flag | Short | Description |
| --- | --- | --- |
| `--help` | `-h` | Show help message and exit |
| `--watch` | `-w` | Watch files and re-run tests on changes |
| `--reporter <name>` | `-r` | Set test reporter (`default`, `verbose`, `dot`, `json`, `silent`) |
| `--coverage` | | Enable code coverage collection |
| `--filter <pattern>` | `-f` | Filter tests by name pattern (regex) |
| `--bail` | `-b` | Stop on first test failure |

## Subcommands

### `cycles`

Detect circular imports in the given files or directories.

```bash
nogginlessdom cycles src/
```

Exits with code 1 if cycles are found.

### `depth`

Analyze import depth of the given files.

```bash
nogginlessdom depth src/
```

Reports max depth, average depth, and files exceeding the threshold.

### `unused`

Detect unused imports in the given files.

```bash
nogginlessdom unused src/
```

Exits with code 1 if unused imports are found.

### `graph`

Build and export a dependency graph.

```bash
nogginlessdom graph src/ --format dot -o deps.dot
```

| Flag | Description |
| --- | --- |
| `--format <fmt>` | Output format: `json` (default), `dot`, or `mermaid` |
| `--output <path>` / `-o` | Save output to file instead of stdout |

## Examples

```bash
# Run all tests
nogginlessdom

# Run tests in watch mode with verbose reporter
nogginlessdom --watch --reporter verbose

# Run with coverage and stop on first failure
nogginlessdom --coverage --bail

# Run only tests matching a pattern
nogginlessdom --filter "authentication"

# Detect circular imports in src/
nogginlessdom cycles src/

# Export dependency graph as Mermaid
nogginlessdom graph src/ --format mermaid -o graph.md
```

## Exit Codes

| Code | Meaning |
| --- | --- |
| 0 | Success (no issues found) |
| 1 | Failure (test failures, cycles found, unused imports found, or runtime error) |
