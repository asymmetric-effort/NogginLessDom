/**
 * Dist validation tests — imports from build/ output, NOT from src/.
 *
 * Uses node:test as the test runner and dynamic import() to load the
 * compiled ESM bundle so we validate the actual published artifact.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(__dirname, '..', '..', 'build');

// Dynamic import of the build output
const mod = await import('../../build/index.js');

// ---------------------------------------------------------------------------
// 1. Public export existence & type checks
// ---------------------------------------------------------------------------

describe('dist: public exports exist and have correct types', () => {
  // -- Test runner ----------------------------------------------------------
  const testRunnerExports = [
    'describe',
    'it',
    'test',
    'beforeEach',
    'afterEach',
    'beforeAll',
    'afterAll',
    'onTestFailed',
    'onTestFinished',
  ] as const;

  for (const name of testRunnerExports) {
    it(`exports "${name}" as a function`, () => {
      assert.equal(
        typeof mod[name],
        'function',
        `${name} should be a function`,
      );
    });
  }

  // -- Assertions -----------------------------------------------------------
  it('exports "expect" as a function', () => {
    assert.equal(typeof mod.expect, 'function');
  });

  // -- DOM core -------------------------------------------------------------
  const domConstructors = [
    'Document',
    'Element',
    'Node',
    'TextNode',
    'Comment',
    'DocumentFragment',
    'Event',
    'CustomEvent',
    'MouseEvent',
    'KeyboardEvent',
  ] as const;

  for (const name of domConstructors) {
    it(`exports "${name}" as a constructor`, () => {
      assert.equal(
        typeof mod[name],
        'function',
        `${name} should be a constructor`,
      );
    });
  }

  // -- HTML elements --------------------------------------------------------
  const htmlElements = [
    'HTMLInputElement',
    'HTMLButtonElement',
    'HTMLFormElement',
    'HTMLSelectElement',
    'HTMLDialogElement',
    'HTMLCanvasElement',
    'HTMLTemplateElement',
  ] as const;

  for (const name of htmlElements) {
    it(`exports "${name}" as a constructor`, () => {
      assert.equal(
        typeof mod[name],
        'function',
        `${name} should be a constructor`,
      );
    });
  }

  // -- Collections ----------------------------------------------------------
  const collections = [
    'NodeList',
    'HTMLCollection',
    'DOMTokenList',
    'CSSStyleDeclaration',
  ] as const;

  for (const name of collections) {
    it(`exports "${name}" as a constructor`, () => {
      assert.equal(
        typeof mod[name],
        'function',
        `${name} should be a constructor`,
      );
    });
  }

  // -- Mocking --------------------------------------------------------------
  const mockingFunctions = [
    'fn',
    'spyOn',
    'useFakeTimers',
    'useRealTimers',
  ] as const;

  for (const name of mockingFunctions) {
    it(`exports "${name}" as a function`, () => {
      assert.equal(
        typeof mod[name],
        'function',
        `${name} should be a function`,
      );
    });
  }

  it('exports "mock" as a function or object', () => {
    assert.ok(
      typeof mod.mock === 'function' || typeof mod.mock === 'object',
      'mock should be a function or object',
    );
    assert.notEqual(mod.mock, null, 'mock should not be null');
  });

  it('exports "vi" as an object', () => {
    assert.equal(typeof mod.vi, 'object');
    assert.notEqual(mod.vi, null);
  });

  // -- Coverage -------------------------------------------------------------
  const coverageFunctions = [
    'startCoverage',
    'stopCoverage',
    'takeCoverage',
    'reportCoverage',
    'checkCoverageThresholds',
  ] as const;

  for (const name of coverageFunctions) {
    it(`exports "${name}" as a function`, () => {
      assert.equal(
        typeof mod[name],
        'function',
        `${name} should be a function`,
      );
    });
  }

  // -- Window ---------------------------------------------------------------
  it('exports "createWindow" as a function', () => {
    assert.equal(typeof mod.createWindow, 'function');
  });

  const windowConstructors = [
    'Window',
    'Storage',
    'Location',
    'History',
  ] as const;

  for (const name of windowConstructors) {
    it(`exports "${name}" as a constructor`, () => {
      assert.equal(
        typeof mod[name],
        'function',
        `${name} should be a constructor`,
      );
    });
  }

  // -- Web APIs -------------------------------------------------------------
  const webApiConstructors = [
    'FormData',
    'Headers',
    'AbortController',
    'AbortSignal',
    'DOMParser',
    'XMLSerializer',
    'DataTransfer',
    'Range',
    'Selection',
  ] as const;

  for (const name of webApiConstructors) {
    it(`exports "${name}" as a constructor`, () => {
      assert.equal(
        typeof mod[name],
        'function',
        `${name} should be a constructor`,
      );
    });
  }

  // -- Utilities ------------------------------------------------------------
  it('exports "atob" as a function', () => {
    assert.equal(typeof mod.atob, 'function');
  });

  it('exports "btoa" as a function', () => {
    assert.equal(typeof mod.btoa, 'function');
  });
});

// ---------------------------------------------------------------------------
// 2. Representative functional tests against build output
// ---------------------------------------------------------------------------

describe('dist: functional tests against build output', () => {
  it('DOM: create document, elements, appendChild, querySelector', () => {
    const doc = new mod.Document();
    const div = doc.createElement('div');
    div.setAttribute('id', 'root');
    const span = doc.createElement('span');
    span.textContent = 'hello';
    div.appendChild(span);
    doc.appendChild(div);

    const found = doc.querySelector('#root');
    assert.notEqual(found, null);
    assert.equal(found.tagName, 'DIV');
    assert.equal(found.children.length, 1);
    assert.equal(found.children[0].textContent, 'hello');
  });

  it('Mocking: fn(), call it, check mock.calls', () => {
    const mockFn = mod.fn();
    mockFn('a', 'b');
    mockFn('c');

    assert.equal(mockFn.mock.calls.length, 2);
    assert.deepEqual(mockFn.mock.calls[0], ['a', 'b']);
    assert.deepEqual(mockFn.mock.calls[1], ['c']);
  });

  it('Assertions: expect(1+1).toBe(2)', () => {
    mod.expect(1 + 1).toBe(2);
  });

  it('Window: createWindow returns window with document', () => {
    const window = mod.createWindow();
    assert.notEqual(window, null);
    assert.notEqual(window.document, null);
    assert.notEqual(window.document, undefined);
  });
});

// ---------------------------------------------------------------------------
// 3. Type declaration validation
// ---------------------------------------------------------------------------

describe('dist: type declarations exist', () => {
  it('build/index.d.ts exists and is non-empty', () => {
    const dtsPath = resolve(buildDir, 'index.d.ts');
    assert.ok(existsSync(dtsPath), 'build/index.d.ts should exist');
    const stat = statSync(dtsPath);
    assert.ok(stat.size > 0, 'build/index.d.ts should be non-empty');
  });

  it('build/dom/index.d.ts exists', () => {
    const dtsPath = resolve(buildDir, 'dom', 'index.d.ts');
    assert.ok(existsSync(dtsPath), 'build/dom/index.d.ts should exist');
  });

  it('build/test-runner/index.d.ts exists', () => {
    const dtsPath = resolve(buildDir, 'test-runner', 'index.d.ts');
    assert.ok(existsSync(dtsPath), 'build/test-runner/index.d.ts should exist');
  });

  it('build/assertions/index.d.ts exists', () => {
    const dtsPath = resolve(buildDir, 'assertions', 'index.d.ts');
    assert.ok(existsSync(dtsPath), 'build/assertions/index.d.ts should exist');
  });

  it('build/mocking/index.d.ts exists', () => {
    const dtsPath = resolve(buildDir, 'mocking', 'index.d.ts');
    assert.ok(existsSync(dtsPath), 'build/mocking/index.d.ts should exist');
  });
});
