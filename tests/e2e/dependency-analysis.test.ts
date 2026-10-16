import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  detectCircularImports,
  formatCycleReport,
  buildForwardGraph,
  analyzeImportDepth,
  detectUnusedImports,
  formatUnusedImportReport,
  buildDependencyGraph,
  exportGraphJSON,
  exportGraphDOT,
  exportGraphMermaid,
} from '../../src/index.js';

const SRC_DIR = path.resolve(import.meta.dirname, '../../src');

describe('e2e: dependency analysis', () => {
  describe('circular import detection', () => {
    it('should analyze project source files for cycles', () => {
      const entryFiles = [path.join(SRC_DIR, 'index.ts')];
      const cycles = detectCircularImports(entryFiles, { cwd: SRC_DIR });

      // Result should be an array (may or may not have cycles)
      assert.ok(Array.isArray(cycles));

      // Each cycle should have the expected shape
      for (const cycle of cycles) {
        assert.ok(Array.isArray(cycle.cycle));
        assert.ok(cycle.cycle.length >= 2);
        assert.ok(cycle.files instanceof Set);
      }
    });

    it('should format cycle report as readable string', () => {
      const report = formatCycleReport([]);
      assert.equal(typeof report, 'string');
      assert.ok(report.includes('No circular'));
    });

    it('should format non-empty cycle report', () => {
      const cycles = [
        { cycle: ['a.ts', 'b.ts', 'a.ts'], files: new Set(['a.ts', 'b.ts']) },
      ];
      const report = formatCycleReport(cycles);
      assert.ok(report.includes('a.ts'));
      assert.ok(report.includes('b.ts'));
    });
  });

  describe('forward graph construction', () => {
    it('should build forward graph from source files', () => {
      const entryFiles = [path.join(SRC_DIR, 'coverage', 'config.ts')];
      const graph = buildForwardGraph(entryFiles, { cwd: SRC_DIR });

      assert.ok(graph instanceof Map);
      // config.ts has no imports, so graph has at least the entry
      assert.ok(graph.size >= 1);
    });
  });

  describe('import depth analysis', () => {
    it('should analyze depth of project files', () => {
      const entryFiles = [path.join(SRC_DIR, 'coverage', 'config.ts')];
      const result = analyzeImportDepth(entryFiles, { cwd: SRC_DIR });

      assert.equal(typeof result.maxDepth, 'number');
      assert.equal(typeof result.averageDepth, 'number');
      assert.ok(Array.isArray(result.entries));
      assert.ok(Array.isArray(result.filesExceedingThreshold));
      assert.ok(result.maxDepth >= 0);
      assert.ok(result.averageDepth >= 0);
    });

    it('should return empty result for no files', () => {
      const result = analyzeImportDepth([]);
      assert.equal(result.maxDepth, 0);
      assert.equal(result.averageDepth, 0);
      assert.deepEqual(result.entries, []);
    });
  });

  describe('unused import detection', () => {
    it('should analyze files for unused imports', () => {
      const entryFiles = [path.join(SRC_DIR, 'coverage', 'config.ts')];
      const unused = detectUnusedImports(entryFiles, { cwd: SRC_DIR });

      assert.ok(Array.isArray(unused));
    });

    it('should format unused import report', () => {
      const report = formatUnusedImportReport([]);
      assert.equal(typeof report, 'string');
    });
  });

  describe('dependency graph export', () => {
    it('should build dependency graph and export as JSON', () => {
      const entryFiles = [path.join(SRC_DIR, 'coverage', 'config.ts')];
      const graph = buildDependencyGraph(entryFiles, { cwd: SRC_DIR });

      assert.ok(graph.nodes);
      assert.ok(graph.edges);
      assert.ok(graph.summary);

      const json = exportGraphJSON(graph);
      assert.equal(typeof json, 'string');
      const parsed = JSON.parse(json);
      assert.ok(parsed.nodes);
      assert.ok(parsed.edges);
    });

    it('should export dependency graph as DOT format', () => {
      const entryFiles = [path.join(SRC_DIR, 'coverage', 'config.ts')];
      const graph = buildDependencyGraph(entryFiles, { cwd: SRC_DIR });

      const dot = exportGraphDOT(graph);
      assert.equal(typeof dot, 'string');
      assert.ok(dot.includes('digraph'));
    });

    it('should export dependency graph as Mermaid format', () => {
      const entryFiles = [path.join(SRC_DIR, 'coverage', 'config.ts')];
      const graph = buildDependencyGraph(entryFiles, { cwd: SRC_DIR });

      const mermaid = exportGraphMermaid(graph);
      assert.equal(typeof mermaid, 'string');
      assert.ok(mermaid.includes('graph'));
    });

    it('should include summary metadata in graph', () => {
      const entryFiles = [path.join(SRC_DIR, 'coverage', 'config.ts')];
      const graph = buildDependencyGraph(entryFiles, { cwd: SRC_DIR });

      assert.equal(typeof graph.summary.totalFiles, 'number');
      assert.equal(typeof graph.summary.totalEdges, 'number');
      assert.ok(graph.summary.totalFiles >= 1);
    });
  });
});
