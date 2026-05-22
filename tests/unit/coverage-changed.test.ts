import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getChangedFiles } from '../../src/coverage/changed.js';
import { mergeConfig } from '../../src/coverage/config.js';

describe('getChangedFiles (Issue #54)', () => {
  it('returns an array of strings', () => {
    const files = getChangedFiles();
    assert.ok(Array.isArray(files));
    for (const f of files) {
      assert.equal(typeof f, 'string');
    }
  });

  it('returns an array when given a branch name', () => {
    // Even if the branch doesn't exist, it should not throw — returns []
    const files = getChangedFiles('nonexistent-branch-abc123');
    assert.ok(Array.isArray(files));
  });

  it('does not include empty strings', () => {
    const files = getChangedFiles();
    for (const f of files) {
      assert.ok(f.length > 0, 'file path should not be empty');
    }
  });
});

describe('CoverageConfig changed field (Issue #54)', () => {
  it('accepts changed: true', () => {
    const config = mergeConfig({ changed: true });
    assert.equal(config.changed, true);
  });

  it('accepts changed: string (branch name)', () => {
    const config = mergeConfig({ changed: 'main' });
    assert.equal(config.changed, 'main');
  });

  it('defaults changed to undefined', () => {
    const config = mergeConfig({});
    assert.equal(config.changed, undefined);
  });
});

describe('CoverageConfig customProviderModule field (Issue #67)', () => {
  it('accepts customProviderModule string', () => {
    const config = mergeConfig({
      customProviderModule: './my-custom-provider.js',
    });
    assert.equal(config.customProviderModule, './my-custom-provider.js');
  });

  it('defaults customProviderModule to undefined', () => {
    const config = mergeConfig({});
    assert.equal(config.customProviderModule, undefined);
  });
});
