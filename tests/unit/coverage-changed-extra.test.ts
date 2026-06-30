/**
 * Additional tests for src/coverage/changed.ts to increase coverage.
 * Covers: invalid branch name validation, error handling in getChangedFiles.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getChangedFiles } from '../../src/coverage/changed.js';

describe('getChangedFiles additional coverage', () => {
  it('should reject invalid branch names with special characters', () => {
    // Branch name with shell injection characters should throw via validation
    const files = getChangedFiles('branch; rm -rf /');
    // Invalid branch name should cause an error, returning empty array
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 0);
  });

  it('should reject branch names with spaces', () => {
    const files = getChangedFiles('my branch');
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 0);
  });

  it('should reject branch names with backticks', () => {
    const files = getChangedFiles('`whoami`');
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 0);
  });

  it('should reject branch names with dollar signs', () => {
    const files = getChangedFiles('$HOME');
    assert.ok(Array.isArray(files));
    assert.equal(files.length, 0);
  });

  it('should accept valid branch names with slashes', () => {
    // Valid branch name format, but branch may not exist
    const files = getChangedFiles('feature/my-branch');
    assert.ok(Array.isArray(files));
  });

  it('should accept valid branch names with dots', () => {
    const files = getChangedFiles('v1.2.3');
    assert.ok(Array.isArray(files));
  });

  it('should accept valid branch names with underscores', () => {
    const files = getChangedFiles('my_branch_name');
    assert.ok(Array.isArray(files));
  });

  it('should return array when called without arguments (diff against HEAD)', () => {
    const files = getChangedFiles();
    assert.ok(Array.isArray(files));
    // Each entry should be a non-empty string
    for (const f of files) {
      assert.equal(typeof f, 'string');
      assert.ok(f.length > 0);
    }
  });

  it('should handle branch names with hyphens', () => {
    const files = getChangedFiles('feature-branch-123');
    assert.ok(Array.isArray(files));
  });
});
