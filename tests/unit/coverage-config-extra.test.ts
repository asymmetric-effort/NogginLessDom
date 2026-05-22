import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultConfig, mergeConfig } from '../../src/coverage/config.js';

describe('CoverageConfig extra options', () => {
  describe('getDefaultConfig defaults', () => {
    it('should default cleanOnRerun to true', () => {
      const config = getDefaultConfig();
      assert.equal(config.cleanOnRerun, true);
    });

    it('should default allowExternal to false', () => {
      const config = getDefaultConfig();
      assert.equal(config.allowExternal, false);
    });

    it('should default extension to [.ts, .js, .tsx, .jsx]', () => {
      const config = getDefaultConfig();
      assert.deepEqual(config.extension, ['.ts', '.js', '.tsx', '.jsx']);
    });

    it('should default reportOnFailure to false', () => {
      const config = getDefaultConfig();
      assert.equal(config.reportOnFailure, false);
    });

    it('should default processingConcurrency to 1', () => {
      const config = getDefaultConfig();
      assert.equal(config.processingConcurrency, 1);
    });
  });

  describe('mergeConfig preserves new options', () => {
    it('should preserve cleanOnRerun when set to false', () => {
      const result = mergeConfig({ cleanOnRerun: false });
      assert.equal(result.cleanOnRerun, false);
    });

    it('should use default cleanOnRerun when not provided', () => {
      const result = mergeConfig({});
      assert.equal(result.cleanOnRerun, true);
    });

    it('should preserve allowExternal when set to true', () => {
      const result = mergeConfig({ allowExternal: true });
      assert.equal(result.allowExternal, true);
    });

    it('should use default allowExternal when not provided', () => {
      const result = mergeConfig({});
      assert.equal(result.allowExternal, false);
    });

    it('should preserve custom extension list', () => {
      const result = mergeConfig({ extension: ['.vue', '.svelte'] });
      assert.deepEqual(result.extension, ['.vue', '.svelte']);
    });

    it('should use default extension when not provided', () => {
      const result = mergeConfig({});
      assert.deepEqual(result.extension, ['.ts', '.js', '.tsx', '.jsx']);
    });

    it('should preserve reportOnFailure when set to true', () => {
      const result = mergeConfig({ reportOnFailure: true });
      assert.equal(result.reportOnFailure, true);
    });

    it('should use default reportOnFailure when not provided', () => {
      const result = mergeConfig({});
      assert.equal(result.reportOnFailure, false);
    });

    it('should preserve processingConcurrency when set', () => {
      const result = mergeConfig({ processingConcurrency: 4 });
      assert.equal(result.processingConcurrency, 4);
    });

    it('should use default processingConcurrency when not provided', () => {
      const result = mergeConfig({});
      assert.equal(result.processingConcurrency, 1);
    });
  });
});
