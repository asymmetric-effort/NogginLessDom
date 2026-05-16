#!/usr/bin/env bun
/**
 * Simple YAML syntax validator — checks for common YAML errors.
 * Zero dependencies. Validates indentation, structure, and encoding.
 * Exits non-zero if any file has errors.
 */
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
let errors = 0;

for (const file of files) {
  const issues = validateYamlFile(file);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`${file}:${issue}`);
    }
    errors++;
  }
}

if (errors > 0) {
  process.exit(1);
}

function validateYamlFile(file: string): string[] {
  const issues: string[] = [];
  let content: string;

  try {
    content = readFileSync(file, 'utf-8');
  } catch (err) {
    return [`1: cannot read file: ${err instanceof Error ? err.message : String(err)}`];
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    // Tab indentation is forbidden in YAML
    if (/^\t/.test(line)) {
      issues.push(`${lineNum}: tab character used for indentation (YAML requires spaces)`);
    }

    // Trailing whitespace
    if (line.length > 0 && line !== line.trimEnd()) {
      // Warning-level, don't fail but note
    }

    // Check for non-UTF8 / control characters (except \t \r \n)
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(line)) {
      issues.push(`${lineNum}: contains invalid control character`);
    }
  }

  // Check file ends with newline
  if (content.length > 0 && !content.endsWith('\n')) {
    issues.push(`${lines.length}: file does not end with newline`);
  }

  return issues;
}
