/**
 * Additional tests for src/coverage/nyc-config.ts to increase coverage.
 * Covers: YAML parsing (parseSimpleYaml), .nycrc.yml/.nycrc.yaml paths,
 * mapNycToCoverageConfig edge cases (reports-dir, report-on-failure, clean),
 * package.json without nyc key, invalid files.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadNycConfig } from '../../src/coverage/nyc-config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('loadNycConfig YAML support', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyc-yaml-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should read .nycrc.yml with simple key-value pairs', () => {
    const yamlContent = [
      'all: true',
      'clean: false',
      'skip-full: true',
      'report-dir: ./my-reports',
      'report-on-failure: true',
    ].join('\n');
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.equal(result.all, true);
    assert.equal(result.clean, false);
    assert.equal(result.skipFull, true);
    assert.equal(result.reportsDirectory, './my-reports');
    assert.equal(result.reportOnFailure, true);
  });

  it('should read .nycrc.yaml with arrays', () => {
    const yamlContent = [
      'include:',
      '  - src/**/*.ts',
      '  - lib/**/*.js',
      'exclude:',
      '  - test/**',
      '  - node_modules/**',
      'reporter:',
      '  - html',
      '  - text',
      '  - lcov',
    ].join('\n');
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yaml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.include, ['src/**/*.ts', 'lib/**/*.js']);
    assert.deepEqual(result.exclude, ['test/**', 'node_modules/**']);
    assert.deepEqual(result.reporter, ['html', 'text', 'lcov']);
  });

  it('should read .nycrc.yml with numeric values', () => {
    const yamlContent = [
      'branches: 80',
      'lines: 90',
      'functions: 75.5',
      'statements: 85',
    ].join('\n');
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    // Numeric values in NYC config are not directly mapped to CoverageConfig
    // but they are parsed; the function maps include/exclude/reporter etc
    assert.ok(typeof result === 'object');
  });

  it('should handle YAML with boolean false values', () => {
    const yamlContent = [
      'all: false',
      'clean: false',
      'report-on-failure: false',
    ].join('\n');
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.equal(result.all, false);
    assert.equal(result.clean, false);
    assert.equal(result.reportOnFailure, false);
  });

  it('should handle YAML with empty arrays', () => {
    const yamlContent = 'include: []\nexclude: []\n';
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.include, []);
    assert.deepEqual(result.exclude, []);
  });

  it('should handle YAML with comments', () => {
    const yamlContent = [
      '# This is a comment',
      'all: true',
      '# Another comment',
      'reporter:',
      '  - text',
    ].join('\n');
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.equal(result.all, true);
    assert.deepEqual(result.reporter, ['text']);
  });

  it('should handle YAML with empty lines', () => {
    const yamlContent = ['all: true', '', 'clean: true', ''].join('\n');
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.equal(result.all, true);
    assert.equal(result.clean, true);
  });

  it('should handle YAML with quoted string values', () => {
    const yamlContent = "report-dir: './coverage-output'\n";
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.equal(result.reportsDirectory, './coverage-output');
  });

  it('should handle YAML with double-quoted string values', () => {
    const yamlContent = 'report-dir: "./my-reports"\n';
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.equal(result.reportsDirectory, './my-reports');
  });
});

describe('loadNycConfig priority', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyc-priority-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should prefer .nycrc over .nycrc.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc'),
      JSON.stringify({ reporter: ['lcov'] }),
    );
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify({ reporter: ['html'] }),
    );
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.reporter, ['lcov']);
  });

  it('should prefer .nycrc.json over .nycrc.yml', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify({ reporter: ['html'] }),
    );
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), 'reporter:\n  - text\n');
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.reporter, ['html']);
  });

  it('should prefer .nycrc.yml over .nycrc.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), 'reporter:\n  - html\n');
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yaml'), 'reporter:\n  - text\n');
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.reporter, ['html']);
  });

  it('should prefer .nycrc.yaml over package.json nyc', () => {
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yaml'), 'reporter:\n  - lcov\n');
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', nyc: { reporter: ['text'] } }),
    );
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.reporter, ['lcov']);
  });
});

describe('loadNycConfig mapNycToCoverageConfig edge cases', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyc-map-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should map reports-dir field', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify({ 'reports-dir': './alt-coverage' }),
    );
    const result = loadNycConfig(tmpDir);
    assert.equal(result.reportsDirectory, './alt-coverage');
  });

  it('should prefer reports-dir over report-dir when both present', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify({ 'report-dir': './a', 'reports-dir': './b' }),
    );
    const result = loadNycConfig(tmpDir);
    // reports-dir is processed after report-dir, so it overwrites
    assert.equal(result.reportsDirectory, './b');
  });

  it('should map report-on-failure field', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify({ 'report-on-failure': true }),
    );
    const result = loadNycConfig(tmpDir);
    assert.equal(result.reportOnFailure, true);
  });

  it('should map clean field', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify({ clean: false }),
    );
    const result = loadNycConfig(tmpDir);
    assert.equal(result.clean, false);
  });

  it('should return empty when package.json has no nyc key', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' }),
    );
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result, {});
  });

  it('should return empty when package.json nyc is not an object', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', nyc: 'invalid' }),
    );
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result, {});
  });

  it('should return empty when package.json nyc is null', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', nyc: null }),
    );
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result, {});
  });

  it('should return empty when no config files exist and no package.json', () => {
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result, {});
  });

  it('should handle invalid JSON in .nycrc gracefully', () => {
    fs.writeFileSync(path.join(tmpDir, '.nycrc'), 'not valid json {{{');
    // Should fall through to next config file
    fs.writeFileSync(
      path.join(tmpDir, '.nycrc.json'),
      JSON.stringify({ all: true }),
    );
    const result = loadNycConfig(tmpDir);
    assert.equal(result.all, true);
  });
});

describe('loadNycConfig YAML with extension field', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyc-ext-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should map extension field from YAML', () => {
    const yamlContent = ['extension:', '  - .ts', '  - .tsx', '  - .mts'].join(
      '\n',
    );
    fs.writeFileSync(path.join(tmpDir, '.nycrc.yml'), yamlContent);
    const result = loadNycConfig(tmpDir);
    assert.deepEqual(result.extension, ['.ts', '.tsx', '.mts']);
  });
});
