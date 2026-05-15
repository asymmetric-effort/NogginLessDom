#!/usr/bin/env bun
/**
 * Simple JSON linter — validates JSON files using JSON.parse.
 * Zero dependencies. Exits non-zero if any file has invalid JSON.
 */
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
let errors = 0;

for (const file of files) {
  try {
    JSON.parse(readFileSync(file, 'utf-8'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${file}: ${msg}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n${errors} JSON file(s) have errors.`);
  process.exit(1);
}
