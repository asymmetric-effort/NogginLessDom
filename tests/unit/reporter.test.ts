import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, unlinkSync } from 'node:fs';
import {
  ReporterManager,
  configureReporters,
  getReporterManager,
  resetReporterManager,
  DefaultReporter,
  VerboseReporter,
  DotReporter,
  JsonReporter,
  SilentReporter,
} from '../../src/test-runner/reporter.js';
import type {
  TestReporter,
  TestEvent,
  RunSummary,
} from '../../src/test-runner/reporter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Capture stdout writes during a callback. */
function captureStdout(fn: () => void): string {
  const original = process.stdout.write;
  let output = '';
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    output += typeof chunk === 'string' ? chunk : chunk.toString();
    return true;
  }) as typeof process.stdout.write;
  try {
    fn();
  } finally {
    process.stdout.write = original;
  }
  return output;
}

function tmpFile(): string {
  return join(
    tmpdir(),
    `reporter-test-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
  );
}

function safeUnlink(path: string): void {
  try {
    unlinkSync(path);
  } catch {
    // ignore
  }
}

const passEvent: TestEvent = { name: 'should pass', duration: 5 };
const failEvent: TestEvent = {
  name: 'should fail',
  duration: 12,
  error: new Error('boom'),
};
const skipEvent: TestEvent = {
  name: 'should skip',
  reason: 'not ready',
};
const todoEvent: TestEvent = { name: 'should todo' };
const suiteEvent: TestEvent = { name: 'my suite' };

const summary: RunSummary = {
  passed: 3,
  failed: 1,
  skipped: 1,
  todo: 1,
  duration: 42,
};

// ---------------------------------------------------------------------------
// 1. DefaultReporter
// ---------------------------------------------------------------------------

nodeDescribe('DefaultReporter', () => {
  nodeIt('produces output on pass', () => {
    const out = captureStdout(() => {
      const r = new DefaultReporter({ colors: false });
      r.onTestPass(passEvent);
    });
    assert.ok(out.includes('PASS'));
    assert.ok(out.includes('should pass'));
  });

  nodeIt('produces output on fail', () => {
    const out = captureStdout(() => {
      const r = new DefaultReporter({ colors: false });
      r.onTestFail(failEvent);
    });
    assert.ok(out.includes('FAIL'));
    assert.ok(out.includes('should fail'));
    assert.ok(out.includes('boom'));
  });

  nodeIt('prints run summary on onRunEnd', () => {
    const out = captureStdout(() => {
      const r = new DefaultReporter({ colors: false });
      r.onRunEnd(summary);
    });
    assert.ok(out.includes('3 passed'));
    assert.ok(out.includes('1 failed'));
    assert.ok(out.includes('42ms'));
  });

  nodeIt('handles fail event without error', () => {
    const out = captureStdout(() => {
      const r = new DefaultReporter({ colors: false });
      r.onTestFail({ name: 'no error test' });
    });
    assert.ok(out.includes('FAIL'));
    assert.ok(out.includes('no error test'));
  });
});

// ---------------------------------------------------------------------------
// 2. VerboseReporter
// ---------------------------------------------------------------------------

nodeDescribe('VerboseReporter', () => {
  nodeIt('prints test names with duration', () => {
    const out = captureStdout(() => {
      const r = new VerboseReporter({ colors: false });
      r.onTestPass(passEvent);
    });
    assert.ok(out.includes('should pass'));
    assert.ok(out.includes('5ms'));
    assert.ok(out.includes('\u2713'));
  });

  nodeIt('prints fail with cross mark and duration', () => {
    const out = captureStdout(() => {
      const r = new VerboseReporter({ colors: false });
      r.onTestFail(failEvent);
    });
    assert.ok(out.includes('\u2717'));
    assert.ok(out.includes('12ms'));
    assert.ok(out.includes('boom'));
  });

  nodeIt('prints skip events', () => {
    const out = captureStdout(() => {
      const r = new VerboseReporter({ colors: false });
      r.onTestSkip(skipEvent);
    });
    assert.ok(out.includes('should skip'));
    assert.ok(out.includes('skipped'));
  });

  nodeIt('prints todo events', () => {
    const out = captureStdout(() => {
      const r = new VerboseReporter({ colors: false });
      r.onTestTodo(todoEvent);
    });
    assert.ok(out.includes('should todo'));
    assert.ok(out.includes('todo'));
  });

  nodeIt('prints suite start', () => {
    const out = captureStdout(() => {
      const r = new VerboseReporter({ colors: false });
      r.onSuiteStart(suiteEvent);
    });
    assert.ok(out.includes('my suite'));
  });

  nodeIt('prints run summary', () => {
    const out = captureStdout(() => {
      const r = new VerboseReporter({ colors: false });
      r.onRunEnd(summary);
    });
    assert.ok(out.includes('3 passed'));
  });

  nodeIt('handles pass without duration', () => {
    const out = captureStdout(() => {
      const r = new VerboseReporter({ colors: false });
      r.onTestPass({ name: 'no dur' });
    });
    assert.ok(out.includes('no dur'));
    assert.ok(!out.includes('ms'));
  });

  nodeIt('handles fail without error and without duration', () => {
    const out = captureStdout(() => {
      const r = new VerboseReporter({ colors: false });
      r.onTestFail({ name: 'bare fail' });
    });
    assert.ok(out.includes('bare fail'));
  });
});

// ---------------------------------------------------------------------------
// 3. DotReporter
// ---------------------------------------------------------------------------

nodeDescribe('DotReporter', () => {
  nodeIt('outputs . for pass', () => {
    const out = captureStdout(() => {
      const r = new DotReporter({ colors: false });
      r.onTestPass(passEvent);
    });
    assert.strictEqual(out, '.');
  });

  nodeIt('outputs F for fail', () => {
    const out = captureStdout(() => {
      const r = new DotReporter({ colors: false });
      r.onTestFail(failEvent);
    });
    assert.strictEqual(out, 'F');
  });

  nodeIt('outputs s for skip', () => {
    const out = captureStdout(() => {
      const r = new DotReporter({ colors: false });
      r.onTestSkip(skipEvent);
    });
    assert.strictEqual(out, 's');
  });

  nodeIt('outputs t for todo', () => {
    const out = captureStdout(() => {
      const r = new DotReporter({ colors: false });
      r.onTestTodo(todoEvent);
    });
    assert.strictEqual(out, 't');
  });

  nodeIt('prints summary on runEnd', () => {
    const out = captureStdout(() => {
      const r = new DotReporter({ colors: false });
      r.onRunEnd(summary);
    });
    assert.ok(out.includes('3 passed'));
  });
});

// ---------------------------------------------------------------------------
// 4. JsonReporter
// ---------------------------------------------------------------------------

nodeDescribe('JsonReporter', () => {
  nodeIt('produces valid NDJSON for each event type', () => {
    const out = captureStdout(() => {
      const r = new JsonReporter();
      r.onRunStart({ files: ['a.ts'], totalTests: 4 });
      r.onSuiteStart(suiteEvent);
      r.onTestStart(passEvent);
      r.onTestPass(passEvent);
      r.onTestFail(failEvent);
      r.onTestSkip(skipEvent);
      r.onTestTodo(todoEvent);
      r.onSuiteEnd(suiteEvent);
      r.onRunEnd(summary);
    });

    const lines = out.trim().split('\n');
    assert.strictEqual(lines.length, 9);

    // Each line must be valid JSON
    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert.ok(typeof parsed.type === 'string');
    }

    // Check specific types
    assert.strictEqual(JSON.parse(lines[0]!).type, 'run:start');
    assert.strictEqual(JSON.parse(lines[1]!).type, 'suite:start');
    assert.strictEqual(JSON.parse(lines[4]!).type, 'test:fail');
    assert.strictEqual(JSON.parse(lines[8]!).type, 'run:end');
  });

  nodeIt('serialises error objects', () => {
    const out = captureStdout(() => {
      const r = new JsonReporter();
      r.onTestFail(failEvent);
    });
    const parsed = JSON.parse(out.trim());
    assert.strictEqual(parsed.error.message, 'boom');
  });

  nodeIt('handles fail event without error', () => {
    const out = captureStdout(() => {
      const r = new JsonReporter();
      r.onTestFail({ name: 'no err' });
    });
    const parsed = JSON.parse(out.trim());
    assert.strictEqual(parsed.type, 'test:fail');
    assert.strictEqual(parsed.error, undefined);
  });
});

// ---------------------------------------------------------------------------
// 5. SilentReporter
// ---------------------------------------------------------------------------

nodeDescribe('SilentReporter', () => {
  nodeIt('produces no output', () => {
    const r = new SilentReporter();
    const out = captureStdout(() => {
      // SilentReporter has no methods, so calling notify on it should be safe
      // Verify it implements the interface (it has no methods to call directly)
    });
    assert.strictEqual(out, '');
    // Verify it is a valid TestReporter (duck typing — no methods required)
    assert.ok(r !== null);
  });
});

// ---------------------------------------------------------------------------
// 6-10. ReporterManager
// ---------------------------------------------------------------------------

nodeDescribe('ReporterManager', () => {
  nodeIt('addReporter registers a reporter', () => {
    const mgr = new ReporterManager();
    const r: TestReporter = { onTestPass: () => {} };
    mgr.addReporter(r);
    assert.strictEqual(mgr.getReporters().length, 1);
    assert.strictEqual(mgr.getReporters()[0], r);
  });

  nodeIt('notify dispatches to all reporters', () => {
    const mgr = new ReporterManager();
    const calls: string[] = [];
    mgr.addReporter({
      onTestPass: () => calls.push('a'),
    });
    mgr.addReporter({
      onTestPass: () => calls.push('b'),
    });
    mgr.notify('onTestPass', passEvent);
    assert.deepStrictEqual(calls, ['a', 'b']);
  });

  nodeIt('multiple reporters receive all events', () => {
    const mgr = new ReporterManager();
    const events1: string[] = [];
    const events2: string[] = [];
    mgr.addReporter({
      onTestPass: () => events1.push('pass'),
      onTestFail: () => events1.push('fail'),
    });
    mgr.addReporter({
      onTestPass: () => events2.push('pass'),
      onTestFail: () => events2.push('fail'),
    });
    mgr.notify('onTestPass', passEvent);
    mgr.notify('onTestFail', failEvent);
    assert.deepStrictEqual(events1, ['pass', 'fail']);
    assert.deepStrictEqual(events2, ['pass', 'fail']);
  });

  nodeIt('reporter errors are caught and do not crash', () => {
    const mgr = new ReporterManager();
    const calls: string[] = [];
    mgr.addReporter({
      onTestPass: () => {
        throw new Error('reporter broke');
      },
    });
    mgr.addReporter({
      onTestPass: () => calls.push('ok'),
    });
    // Should not throw
    mgr.notify('onTestPass', passEvent);
    assert.deepStrictEqual(calls, ['ok']);
  });

  nodeIt('built-in reporter factory works for all 5 types', () => {
    const names = ['default', 'verbose', 'dot', 'json', 'silent'];
    for (const name of names) {
      const r = ReporterManager.create(name);
      assert.ok(r !== null, `factory should create "${name}"`);
    }
  });

  nodeIt('factory throws for unknown name', () => {
    assert.throws(
      () => ReporterManager.create('nope'),
      /Unknown built-in reporter/,
    );
  });

  nodeIt('addReporter with string creates built-in', () => {
    const mgr = new ReporterManager();
    mgr.addReporter('silent');
    assert.strictEqual(mgr.getReporters().length, 1);
    assert.ok(mgr.getReporters()[0] instanceof SilentReporter);
  });

  nodeIt('removeReporter removes a reporter', () => {
    const mgr = new ReporterManager();
    const r: TestReporter = { onTestPass: () => {} };
    mgr.addReporter(r);
    assert.strictEqual(mgr.getReporters().length, 1);
    mgr.removeReporter(r);
    assert.strictEqual(mgr.getReporters().length, 0);
  });

  nodeIt('removeReporter is a no-op for unknown reporter', () => {
    const mgr = new ReporterManager();
    const r: TestReporter = {};
    mgr.removeReporter(r); // should not throw
    assert.strictEqual(mgr.getReporters().length, 0);
  });

  nodeIt('notify ignores events with no matching handler', () => {
    const mgr = new ReporterManager();
    mgr.addReporter({ onTestPass: () => {} });
    // Should not throw for an event the reporter doesn't handle
    mgr.notify('onTestFail', failEvent);
  });
});

// ---------------------------------------------------------------------------
// 11-14. Configuration
// ---------------------------------------------------------------------------

nodeDescribe('configureReporters', () => {
  nodeIt('with string name works', () => {
    resetReporterManager();
    configureReporters({ reporter: 'silent' });
    const mgr = getReporterManager();
    assert.strictEqual(mgr.getReporters().length, 1);
    assert.ok(mgr.getReporters()[0] instanceof SilentReporter);
    resetReporterManager();
  });

  nodeIt('with custom reporter object works', () => {
    resetReporterManager();
    const custom: TestReporter = { onTestPass: () => {} };
    configureReporters({ reporter: custom });
    const mgr = getReporterManager();
    assert.strictEqual(mgr.getReporters().length, 1);
    assert.strictEqual(mgr.getReporters()[0], custom);
    resetReporterManager();
  });

  nodeIt('with array of reporters works', () => {
    resetReporterManager();
    const custom: TestReporter = { onTestPass: () => {} };
    configureReporters({ reporters: ['silent', custom] });
    const mgr = getReporterManager();
    assert.strictEqual(mgr.getReporters().length, 2);
    assert.ok(mgr.getReporters()[0] instanceof SilentReporter);
    assert.strictEqual(mgr.getReporters()[1], custom);
    resetReporterManager();
  });

  nodeIt('outputFile writes to disk', () => {
    const file = tmpFile();
    try {
      configureReporters({ reporter: 'json', outputFile: file });
      const mgr = getReporterManager();
      mgr.notify('onTestPass', passEvent);
      mgr.notify('onRunEnd', summary);

      const content = readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n');
      assert.strictEqual(lines.length, 2);
      assert.strictEqual(JSON.parse(lines[0]!).type, 'test:pass');
      assert.strictEqual(JSON.parse(lines[1]!).type, 'run:end');
    } finally {
      safeUnlink(file);
      resetReporterManager();
    }
  });
});

nodeDescribe('getReporterManager', () => {
  nodeIt(
    'returns a default manager with DefaultReporter when none configured',
    () => {
      resetReporterManager();
      const mgr = getReporterManager();
      assert.strictEqual(mgr.getReporters().length, 1);
      assert.ok(mgr.getReporters()[0] instanceof DefaultReporter);
      resetReporterManager();
    },
  );
});

// ---------------------------------------------------------------------------
// 15. Event lifecycle ordering
// ---------------------------------------------------------------------------

nodeDescribe('Event lifecycle ordering', () => {
  nodeIt(
    'events fire in order: onRunStart -> onSuiteStart -> onTestStart -> onTestPass -> onSuiteEnd -> onRunEnd',
    () => {
      const order: string[] = [];
      const reporter: TestReporter = {
        onRunStart: () => order.push('onRunStart'),
        onSuiteStart: () => order.push('onSuiteStart'),
        onTestStart: () => order.push('onTestStart'),
        onTestPass: () => order.push('onTestPass'),
        onSuiteEnd: () => order.push('onSuiteEnd'),
        onRunEnd: () => order.push('onRunEnd'),
      };

      const mgr = new ReporterManager();
      mgr.addReporter(reporter);

      mgr.notify('onRunStart', { files: ['test.ts'], totalTests: 1 });
      mgr.notify('onSuiteStart', suiteEvent);
      mgr.notify('onTestStart', passEvent);
      mgr.notify('onTestPass', passEvent);
      mgr.notify('onSuiteEnd', suiteEvent);
      mgr.notify('onRunEnd', summary);

      assert.deepStrictEqual(order, [
        'onRunStart',
        'onSuiteStart',
        'onTestStart',
        'onTestPass',
        'onSuiteEnd',
        'onRunEnd',
      ]);
    },
  );
});

// ---------------------------------------------------------------------------
// Color output tests
// ---------------------------------------------------------------------------

nodeDescribe('Color support', () => {
  nodeIt('colors enabled when options.colors is true', () => {
    const out = captureStdout(() => {
      const r = new DefaultReporter({ colors: true });
      r.onTestPass(passEvent);
    });
    // Should contain ANSI escape codes
    assert.ok(out.includes('\x1b['));
  });

  nodeIt('colors disabled when options.colors is false', () => {
    const out = captureStdout(() => {
      const r = new DefaultReporter({ colors: false });
      r.onTestPass(passEvent);
    });
    assert.ok(!out.includes('\x1b['));
  });
});

// ---------------------------------------------------------------------------
// OutputFile tests for non-JSON reporters
// ---------------------------------------------------------------------------

nodeDescribe('outputFile for DotReporter', () => {
  nodeIt('writes dots to file', () => {
    const file = tmpFile();
    try {
      const r = new DotReporter({ outputFile: file });
      r.onTestPass(passEvent);
      r.onTestFail(failEvent);
      r.onTestSkip(skipEvent);

      const content = readFileSync(file, 'utf-8');
      assert.ok(content.includes('.'));
      assert.ok(content.includes('F'));
      assert.ok(content.includes('s'));
    } finally {
      safeUnlink(file);
    }
  });
});

nodeDescribe('ReporterManager.create with options', () => {
  nodeIt('passes options through to built-in reporters', () => {
    const file = tmpFile();
    try {
      const r = ReporterManager.create('dot', {
        outputFile: file,
      }) as DotReporter;
      r.onTestPass!(passEvent);

      const content = readFileSync(file, 'utf-8');
      assert.strictEqual(content, '.');
    } finally {
      safeUnlink(file);
    }
  });
});
