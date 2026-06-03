import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  buildDependencyGraph,
  exportGraphJSON,
  exportGraphDOT,
  exportGraphMermaid,
  saveGraph,
} from '../../src/test-runner/dependency-graph.js';
import type { DependencyGraph } from '../../src/test-runner/dependency-graph.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dep-graph-test-'));
}

function writeFile(dir: string, relPath: string, content: string): string {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Happy paths
// ---------------------------------------------------------------------------

nodeDescribe('buildDependencyGraph', () => {
  nodeIt('1. linear chain produces correct nodes and edges', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `import { c } from './c';\nexport const b = c;\n`);
      writeFile(dir, 'c.ts', `export const c = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      assert.equal(graph.version, 1);
      assert.equal(graph.nodes.length, 3);
      assert.equal(graph.edges.length, 2);

      const nodeA = graph.nodes.find((n) => n.id === 'a.ts');
      assert.ok(nodeA);
      assert.equal(nodeA.isEntryPoint, true);
      assert.equal(nodeA.depth, 0);

      const nodeC = graph.nodes.find((n) => n.id === 'c.ts');
      assert.ok(nodeC);
      assert.equal(nodeC.isLeaf, true);
      assert.equal(nodeC.depth, 2);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('2. branching graph has correct depth', () => {
    const dir = makeTmpDir();
    try {
      writeFile(
        dir,
        'entry.ts',
        `import { a } from './a';\nimport { b } from './b';\nconsole.log(a, b);\n`,
      );
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      writeFile(dir, 'b.ts', `import { c } from './c';\nexport const b = c;\n`);
      writeFile(dir, 'c.ts', `export const c = 2;\n`);

      const graph = buildDependencyGraph(['entry.ts'], { cwd: dir });
      const nodeA = graph.nodes.find((n) => n.id === 'a.ts');
      const nodeB = graph.nodes.find((n) => n.id === 'b.ts');
      const nodeC = graph.nodes.find((n) => n.id === 'c.ts');

      assert.equal(nodeA!.depth, 1);
      assert.equal(nodeB!.depth, 1);
      assert.equal(nodeC!.depth, 2);
      assert.equal(graph.summary.maxDepth, 2);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('3. forward and reverse edges both present', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `export const b = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const nodeA = graph.nodes.find((n) => n.id === 'a.ts');
      const nodeB = graph.nodes.find((n) => n.id === 'b.ts');

      assert.ok(nodeA!.imports.includes('b.ts'));
      assert.ok(nodeB!.importedBy.includes('a.ts'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('4. cycle detection flags inCycle on affected nodes', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nexport const a = b;\n`);
      writeFile(dir, 'b.ts', `import { a } from './a';\nexport const b = a;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const nodeA = graph.nodes.find((n) => n.id === 'a.ts');
      const nodeB = graph.nodes.find((n) => n.id === 'b.ts');

      assert.equal(nodeA!.inCycle, true);
      assert.equal(nodeB!.inCycle, true);
      assert.ok(graph.summary.cycleCount > 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('5. hub files identified (most importedBy)', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'utils.ts', `export const u = 1;\n`);
      writeFile(dir, 'a.ts', `import { u } from './utils';\nconsole.log(u);\n`);
      writeFile(dir, 'b.ts', `import { u } from './utils';\nconsole.log(u);\n`);
      writeFile(
        dir,
        'entry.ts',
        `import { u } from './utils';\nimport './a';\nimport './b';\nconsole.log(u);\n`,
      );

      const graph = buildDependencyGraph(['entry.ts'], { cwd: dir });
      assert.ok(graph.summary.hubFiles.includes('utils.ts'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('6. leaf files identified (no imports)', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `export const b = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const nodeB = graph.nodes.find((n) => n.id === 'b.ts');
      assert.equal(nodeB!.isLeaf, true);
      assert.equal(graph.summary.leafCount, 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('7. exportGraphJSON produces valid JSON', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });

      const json = exportGraphJSON(graph);
      const parsed = JSON.parse(json) as DependencyGraph;
      assert.equal(parsed.version, 1);

      const prettyJson = exportGraphJSON(graph, true);
      assert.ok(prettyJson.includes('\n'));
      const parsedPretty = JSON.parse(prettyJson) as DependencyGraph;
      assert.equal(parsedPretty.version, 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('8. exportGraphDOT produces valid DOT syntax', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `export const b = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const dot = exportGraphDOT(graph);

      assert.ok(dot.startsWith('digraph dependencies {'));
      assert.ok(dot.includes('rankdir=LR;'));
      assert.ok(dot.includes('"a.ts" -> "b.ts"'));
      assert.ok(dot.endsWith('}'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('9. exportGraphMermaid produces valid Mermaid syntax', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `export const b = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const mermaid = exportGraphMermaid(graph);

      assert.ok(mermaid.startsWith('graph LR'));
      assert.ok(mermaid.includes('-->'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('10. saveGraph writes to disk', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      const outPath = path.join(dir, 'output', 'graph.json');

      saveGraph(['a.ts'], outPath, { cwd: dir, pretty: true });

      assert.ok(fs.existsSync(outPath));
      const content = fs.readFileSync(outPath, 'utf8');
      const parsed = JSON.parse(content) as DependencyGraph;
      assert.equal(parsed.version, 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('11. summary stats are accurate', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `export const b = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      assert.equal(graph.summary.totalFiles, 2);
      assert.equal(graph.summary.totalEdges, 1);
      assert.equal(graph.summary.maxDepth, 1);
      assert.equal(graph.summary.leafCount, 1);
      assert.equal(graph.summary.cycleCount, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('12. dynamic imports detected as type dynamic', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `const mod = import('./b');\nconsole.log(mod);\n`);
      writeFile(dir, 'b.ts', `export const b = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const dynamicEdge = graph.edges.find((e) => e.type === 'dynamic');
      assert.ok(dynamicEdge);
      assert.equal(dynamicEdge.from, 'a.ts');
      assert.equal(dynamicEdge.to, 'b.ts');
    } finally {
      cleanup(dir);
    }
  });

  // -------------------------------------------------------------------------
  // Sad paths / edge cases
  // -------------------------------------------------------------------------

  nodeIt('13. empty entry files produces empty graph', () => {
    const graph = buildDependencyGraph([]);
    assert.equal(graph.nodes.length, 0);
    assert.equal(graph.edges.length, 0);
    assert.equal(graph.summary.totalFiles, 0);
  });

  nodeIt('14. single file no imports produces one node, isLeaf true', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      assert.equal(graph.nodes.length, 1);
      assert.equal(graph.edges.length, 0);
      assert.equal(graph.nodes[0]!.isLeaf, true);
      assert.equal(graph.nodes[0]!.isEntryPoint, true);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('15. non-existent file handled gracefully', () => {
    const dir = makeTmpDir();
    try {
      const graph = buildDependencyGraph(['nonexistent.ts'], { cwd: dir });
      // Should have one node (visited but unreadable)
      assert.ok(graph.nodes.length <= 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('16. relative paths used by default', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      assert.equal(graph.nodes[0]!.id, 'a.ts');
      assert.ok(!path.isAbsolute(graph.nodes[0]!.id));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('17. exclude patterns filter files', () => {
    const dir = makeTmpDir();
    try {
      writeFile(
        dir,
        'a.ts',
        `import { v } from './vendor/lib';\nconsole.log(v);\n`,
      );
      writeFile(dir, 'vendor/lib.ts', `export const v = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], {
        cwd: dir,
        exclude: ['vendor'],
      });
      // vendor/lib.ts should be excluded from nodes
      const vendorNode = graph.nodes.find((n) => n.id.includes('vendor'));
      assert.equal(vendorNode, undefined);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('18. EXPORT_DEPENDENCY_GRAPH env var disables graph building', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      const original = process.env['EXPORT_DEPENDENCY_GRAPH'];
      process.env['EXPORT_DEPENDENCY_GRAPH'] = '0';
      try {
        const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
        assert.equal(graph.nodes.length, 0);
      } finally {
        if (original === undefined) {
          delete process.env['EXPORT_DEPENDENCY_GRAPH'];
        } else {
          process.env['EXPORT_DEPENDENCY_GRAPH'] = original;
        }
      }
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('19. saveGraph with format auto-detection from extension', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `export const b = 1;\n`);

      // .dot extension
      const dotPath = path.join(dir, 'output', 'graph.dot');
      saveGraph(['a.ts'], dotPath, { cwd: dir });
      const dotContent = fs.readFileSync(dotPath, 'utf8');
      assert.ok(dotContent.startsWith('digraph dependencies {'));

      // .mmd extension
      const mmdPath = path.join(dir, 'output', 'graph.mmd');
      saveGraph(['a.ts'], mmdPath, { cwd: dir });
      const mmdContent = fs.readFileSync(mmdPath, 'utf8');
      assert.ok(mmdContent.startsWith('graph LR'));

      // .json extension
      const jsonPath = path.join(dir, 'output', 'graph.json');
      saveGraph(['a.ts'], jsonPath, { cwd: dir });
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      JSON.parse(jsonContent); // Should not throw
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('20. graph version field is 1', () => {
    const graph = buildDependencyGraph([]);
    assert.equal(graph.version, 1);
  });

  nodeIt('includeMetadata adds loc and exportCount', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\nexport function b() {}\n`);
      const graph = buildDependencyGraph(['a.ts'], {
        cwd: dir,
        includeMetadata: true,
      });
      const node = graph.nodes[0]!;
      assert.ok(node.metadata);
      assert.equal(node.metadata.loc, 3);
      assert.equal(node.metadata.exportCount, 2);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('transitive import count computed correctly', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `import { c } from './c';\nexport const b = c;\n`);
      writeFile(dir, 'c.ts', `export const c = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const nodeA = graph.nodes.find((n) => n.id === 'a.ts');
      assert.equal(nodeA!.transitiveImportCount, 2);
      assert.equal(nodeA!.directImportCount, 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('EXPORT_DEPENDENCY_GRAPH=false also disables', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      const original = process.env['EXPORT_DEPENDENCY_GRAPH'];
      process.env['EXPORT_DEPENDENCY_GRAPH'] = 'false';
      try {
        const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
        assert.equal(graph.nodes.length, 0);
      } finally {
        if (original === undefined) {
          delete process.env['EXPORT_DEPENDENCY_GRAPH'];
        } else {
          process.env['EXPORT_DEPENDENCY_GRAPH'] = original;
        }
      }
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('saveGraph with explicit format overrides extension', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `import { b } from './b';\nconsole.log(b);\n`);
      writeFile(dir, 'b.ts', `export const b = 1;\n`);

      // Save as DOT but with .txt extension
      const outPath = path.join(dir, 'output', 'graph.txt');
      saveGraph(['a.ts'], outPath, { cwd: dir, format: 'dot' });
      const content = fs.readFileSync(outPath, 'utf8');
      assert.ok(content.startsWith('digraph dependencies {'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('exportGraphDOT with no edges produces empty graph', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const dot = exportGraphDOT(graph);
      assert.ok(dot.includes('digraph dependencies {'));
      assert.ok(dot.includes('}'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('exportGraphMermaid with no edges produces header only', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'a.ts', `export const a = 1;\n`);
      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      const mermaid = exportGraphMermaid(graph);
      assert.equal(mermaid, 'graph LR');
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('averageImports is computed correctly', () => {
    const dir = makeTmpDir();
    try {
      writeFile(
        dir,
        'a.ts',
        `import { b } from './b';\nimport { c } from './c';\nconsole.log(b, c);\n`,
      );
      writeFile(dir, 'b.ts', `export const b = 1;\n`);
      writeFile(dir, 'c.ts', `export const c = 1;\n`);

      const graph = buildDependencyGraph(['a.ts'], { cwd: dir });
      // a has 2 imports, b has 0, c has 0 => average = 2/3 ≈ 0.67
      assert.equal(graph.summary.averageImports, 0.67);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('re-exports create edges', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'index.ts', `export { a } from './a';\n`);
      writeFile(dir, 'a.ts', `export const a = 1;\n`);

      const graph = buildDependencyGraph(['index.ts'], { cwd: dir });
      assert.equal(graph.edges.length, 1);
      assert.equal(graph.edges[0]!.from, 'index.ts');
      assert.equal(graph.edges[0]!.to, 'a.ts');
    } finally {
      cleanup(dir);
    }
  });
});
