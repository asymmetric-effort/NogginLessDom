import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultConfig, mergeConfig } from '../../src/coverage/config.js';
import { loadNycConfig } from '../../src/coverage/nyc-config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('ignoreClassMethods config', () => {
  it('should accept ignoreClassMethods in CoverageConfig', () => {
    const config = mergeConfig({
      ignoreClassMethods: ['render', 'componentDidMount'],
    });
    assert.deepEqual(config.ignoreClassMethods, [
      'render',
      'componentDidMount',
    ]);
  });

  it('should default ignoreClassMethods to empty array', () => {
    const config = getDefaultConfig();
    assert.deepEqual(config.ignoreClassMethods, []);
  });

  it('should default ignoreClassMethods to empty array in mergeConfig', () => {
    const config = mergeConfig({});
    assert.deepEqual(config.ignoreClassMethods, []);
  });
});

describe('loadNycConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyc-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return empty object when no config found', () => {
    // Write a package.json without nyc key so the directory is valid but has no nyc config
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test' }),
    );
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result, {});
  });

  it('should read .nycrc.json', () => {
    const nycConfig = {
      include: ['src/**/*.ts'],
      exclude: ['test/**'],
      reporter: ['html', 'text'],
      'report-dir': './my-coverage',
      all: true,
    };
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify(nycConfig),
    );
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.include, ['src/**/*.ts']);
    assert.deepEqual(result.exclude, ['test/**']);
    assert.deepEqual(result.reporter, ['html', 'text']);
    assert.equal(result.reportsDirectory, './my-coverage');
    assert.equal(result.all, true);
  });

  it('should read nyc key from package.json', () => {
    const pkg = {
      name: 'test-pkg',
      nyc: {
        include: ['lib/**/*.js'],
        'skip-full': true,
        'check-coverage': true,
        branches: 80,
        lines: 90,
      },
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg));
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.include, ['lib/**/*.js']);
    assert.equal(result.skipFull, true);
  });

  it('should read .nycrc (JSON format)', () => {
    const nycConfig = {
      reporter: ['lcov'],
      all: false,
    };
    fs.writeFileSync(path.join(tmpDir, '.nycrc'), JSON.stringify(nycConfig));
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.reporter, ['lcov']);
    assert.equal(result.all, false);
  });

  it('should prefer .nycrc.json over package.json nyc key', () => {
    const nycConfig = { reporter: ['html'] };
    const pkg = { name: 'test', nyc: { reporter: ['text'] } };
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify(nycConfig),
    );
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg));
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.reporter, ['html']);
  });

  it('should map extension field', () => {
    const nycConfig = { extension: ['.ts', '.tsx'] };
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify(nycConfig),
    );
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.extension, ['.ts', '.tsx']);
  });
});
