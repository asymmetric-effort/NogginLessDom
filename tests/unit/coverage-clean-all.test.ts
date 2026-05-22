import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanReportsDirectory,
  collectUncoveredFiles,
} from '../../src/coverage/index.js';
import type { ResolvedCoverageConfig } from '../../src/coverage/config.js';
import { mergeConfig } from '../../src/coverage/config.js';
import { createCoverageMap } from '../../src/coverage/coverage-map.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function makeConfig(
  overrides: Partial<ResolvedCoverageConfig> = {},
): ResolvedCoverageConfig {
  return mergeConfig(overrides);
}

describe('Coverage clean option', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-clean-test-'));
  });

  it('should remove the reports directory when clean is true', () => {
    const reportsDir = path.join(tmpDir, 'coverage');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, 'report.json'), '{}');

    const config = makeConfig({ clean: true, reportsDirectory: reportsDir });
    cleanReportsDirectory(config);

    assert.equal(fs.existsSync(reportsDir), false);
  });

  it('should not throw when reports directory does not exist and clean is true', () => {
    const reportsDir = path.join(tmpDir, 'nonexistent');
    const config = makeConfig({ clean: true, reportsDirectory: reportsDir });

    assert.doesNotThrow(() => {
      cleanReportsDirectory(config);
    });
  });

  it('should not remove the reports directory when clean is false', () => {
    const reportsDir = path.join(tmpDir, 'coverage');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, 'report.json'), '{}');

    const config = makeConfig({ clean: false, reportsDirectory: reportsDir });
    cleanReportsDirectory(config);

    assert.equal(fs.existsSync(reportsDir), true);
    assert.equal(fs.existsSync(path.join(reportsDir, 'report.json')), true);
  });

  it('should default clean to true', () => {
    const config = makeConfig({});
    assert.equal(config.clean, true);
  });
});

describe('Coverage all option', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-all-test-'));
  });

  it('should include uncovered files when all is true', () => {
    // Create some source files in the temp directory
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'covered.ts'),
      'export function covered() { return 1; }\n',
    );
    fs.writeFileSync(
      path.join(srcDir, 'uncovered.ts'),
      'export function uncovered() { return 2; }\n',
    );

    // Create a coverage map with only the "covered" file
    const existingMap = createCoverageMap();
    existingMap.addFileCoverage({
      path: path.join(srcDir, 'covered.ts'),
      statementMap: {
        '0': {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 40 },
        },
      },
      fnMap: {
        '0': {
          name: 'covered',
          decl: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 40 },
          },
          loc: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 40 },
          },
          line: 1,
        },
      },
      branchMap: {},
      s: { '0': 5 },
      f: { '0': 5 },
      b: {},
    });

    const config = makeConfig({
      all: true,
      include: ['**/*.ts'],
      exclude: [],
    });

    collectUncoveredFiles(existingMap, config, srcDir);

    const files = existingMap.files();
    assert.equal(files.length, 2);

    // The uncovered file should have zero-count entries
    const uncoveredPath = path.join(srcDir, 'uncovered.ts');
    const uncoveredFc = existingMap.fileCoverageFor(uncoveredPath);
    assert.ok(uncoveredFc);
    assert.equal(uncoveredFc.path, uncoveredPath);

    // All statement counts should be 0
    for (const key of Object.keys(uncoveredFc.s)) {
      assert.equal(uncoveredFc.s[key], 0);
    }

    // All function counts should be 0
    for (const key of Object.keys(uncoveredFc.f)) {
      assert.equal(uncoveredFc.f[key], 0);
    }
  });

  it('should not include files that are already in the coverage map', () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'already-covered.ts'),
      'export const x = 1;\n',
    );

    const existingMap = createCoverageMap();
    const coveredPath = path.join(srcDir, 'already-covered.ts');
    existingMap.addFileCoverage({
      path: coveredPath,
      statementMap: {
        '0': {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 20 },
        },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 3 },
      f: {},
      b: {},
    });

    const config = makeConfig({
      all: true,
      include: ['**/*.ts'],
      exclude: [],
    });

    collectUncoveredFiles(existingMap, config, srcDir);

    const files = existingMap.files();
    assert.equal(files.length, 1);

    // The existing coverage data should be preserved
    const fc = existingMap.fileCoverageFor(coveredPath);
    assert.equal(fc.s['0'], 3);
  });

  it('should not include files when all is false', () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'uncovered.ts'),
      'export const x = 1;\n',
    );

    const existingMap = createCoverageMap();
    const config = makeConfig({
      all: false,
      include: ['**/*.ts'],
      exclude: [],
    });

    collectUncoveredFiles(existingMap, config, srcDir);

    const files = existingMap.files();
    assert.equal(files.length, 0);
  });

  it('should respect exclude patterns', () => {
    const srcDir = path.join(tmpDir, 'src');
    const testDir = path.join(srcDir, 'tests');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'source.ts'), 'export const x = 1;\n');
    fs.writeFileSync(
      path.join(testDir, 'source.test.ts'),
      'import { x } from "../source";\n',
    );

    const existingMap = createCoverageMap();
    const config = makeConfig({
      all: true,
      include: ['**/*.ts'],
      exclude: ['**/tests/**', '**/*.test.*'],
    });

    collectUncoveredFiles(existingMap, config, srcDir);

    const files = existingMap.files();
    assert.equal(files.length, 1);
    assert.ok(files[0]!.endsWith('source.ts'));
  });

  it('should default all to false', () => {
    const config = makeConfig({});
    assert.equal(config.all, false);
  });

  it('should create zero-count FileCoverage with a single whole-file statement', () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    const content = 'line1\nline2\nline3\n';
    fs.writeFileSync(path.join(srcDir, 'file.ts'), content);

    const existingMap = createCoverageMap();
    const config = makeConfig({
      all: true,
      include: ['**/*.ts'],
      exclude: [],
    });

    collectUncoveredFiles(existingMap, config, srcDir);

    const filePath = path.join(srcDir, 'file.ts');
    const fc = existingMap.fileCoverageFor(filePath);
    assert.ok(fc);

    // Should have at least one statement with count 0
    const stmtKeys = Object.keys(fc.s);
    assert.ok(stmtKeys.length > 0);
    assert.equal(fc.s[stmtKeys[0]!], 0);

    // Should have zero functions and branches
    assert.equal(Object.keys(fc.f).length, 0);
    assert.equal(Object.keys(fc.b).length, 0);
  });
});
