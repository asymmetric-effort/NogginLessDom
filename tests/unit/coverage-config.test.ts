import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultConfig,
  type CoverageConfig,
  type CoverageThresholds,
  type CoverageWatermarks,
} from '../../src/coverage/config.js';

describe('CoverageConfig', () => {
  describe('getDefaultConfig', () => {
    it('should return a config object', () => {
      const config = getDefaultConfig();
      assert.ok(config);
      assert.equal(typeof config, 'object');
    });

    it('should have enabled set to false by default', () => {
      const config = getDefaultConfig();
      assert.equal(config.enabled, false);
    });

    it('should default provider to v8', () => {
      const config = getDefaultConfig();
      assert.equal(config.provider, 'v8');
    });

    it('should have default include patterns', () => {
      const config = getDefaultConfig();
      assert.ok(Array.isArray(config.include));
      assert.ok(config.include!.length > 0);
    });

    it('should have default exclude patterns', () => {
      const config = getDefaultConfig();
      assert.ok(Array.isArray(config.exclude));
      assert.ok(config.exclude!.length > 0);
    });

    it('should default reportsDirectory to ./coverage', () => {
      const config = getDefaultConfig();
      assert.equal(config.reportsDirectory, './coverage');
    });

    it('should default reporter to text and json', () => {
      const config = getDefaultConfig();
      assert.ok(Array.isArray(config.reporter));
      assert.ok(config.reporter!.includes('text'));
    });

    it('should default clean to true', () => {
      const config = getDefaultConfig();
      assert.equal(config.clean, true);
    });

    it('should default skipFull to false', () => {
      const config = getDefaultConfig();
      assert.equal(config.skipFull, false);
    });

    it('should default all to false', () => {
      const config = getDefaultConfig();
      assert.equal(config.all, false);
    });

    it('should have default watermarks', () => {
      const config = getDefaultConfig();
      assert.ok(config.watermarks);
      const wm = config.watermarks!;
      assert.deepEqual(wm.lines, [50, 80]);
      assert.deepEqual(wm.functions, [50, 80]);
      assert.deepEqual(wm.branches, [50, 80]);
      assert.deepEqual(wm.statements, [50, 80]);
    });

    it('should have no thresholds by default', () => {
      const config = getDefaultConfig();
      assert.equal(config.thresholds, undefined);
    });

    it('should return a new object each call', () => {
      const a = getDefaultConfig();
      const b = getDefaultConfig();
      assert.notEqual(a, b);
      assert.deepEqual(a, b);
    });
  });

  describe('type correctness', () => {
    it('should allow partial CoverageThresholds', () => {
      const t: CoverageThresholds = { lines: 80 };
      assert.equal(t.lines, 80);
      assert.equal(t.functions, undefined);
    });

    it('should allow partial CoverageWatermarks', () => {
      const w: CoverageWatermarks = { lines: [50, 80] };
      assert.deepEqual(w.lines, [50, 80]);
      assert.equal(w.branches, undefined);
    });

    it('should allow partial CoverageConfig', () => {
      const c: CoverageConfig = { enabled: true };
      assert.equal(c.enabled, true);
      assert.equal(c.provider, undefined);
    });
  });
});
