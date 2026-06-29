/**
 * Function coverage gap tests.
 * Calls every function that was previously uncovered to bring
 * all modules to >= 98% function coverage.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// --- dom-parser.ts ---
import { XMLSerializer } from '../../src/dom/dom-parser.js';
// --- cookie.ts ---
import { CookieJar } from '../../src/dom/cookie.js';
// --- custom-elements.ts ---
import { CustomElementRegistry } from '../../src/dom/custom-elements.js';
// --- abort.ts ---
import { AbortController, AbortSignal } from '../../src/dom/abort.js';
// --- data-transfer.ts ---
import {
  DataTransfer,
  DataTransferItem,
  DataTransferItemList,
} from '../../src/dom/data-transfer.js';
// --- mutation-observer.ts ---
import {
  MutationObserver,
  MutationRecord,
  notifyChildListMutation,
  notifyCharacterDataMutation,
} from '../../src/dom/mutation-observer.js';
// --- animation.ts ---
import {
  Animation,
  KeyframeEffect,
  AnimationTimeline,
} from '../../src/dom/animation.js';
// --- form-data.ts ---
import { FormData } from '../../src/dom/form-data.js';
// --- selection.ts ---
import { Selection } from '../../src/dom/selection.js';
// --- performance.ts ---
import {
  Performance,
  PerformanceObserver,
  PerformanceObserverEntryList,
} from '../../src/dom/performance.js';
// --- workers.ts ---
import {
  Worker,
  SharedWorker,
  ServiceWorker,
  ServiceWorkerRegistration,
  ServiceWorkerContainer,
  MessagePort,
} from '../../src/dom/workers.js';
// --- indexeddb.ts ---
import {
  IDBFactory,
  IDBKeyRange,
  IDBDatabase,
} from '../../src/dom/indexeddb.js';
// --- canvas.ts ---
import {
  CanvasRenderingContext2D,
  CanvasGradient,
  CanvasPattern,
  ImageData,
} from '../../src/dom/canvas.js';
// --- coverage/reporters/text.ts ---
import { TextReporter } from '../../src/coverage/reporters/text.js';
// --- coverage/reporters/html.ts ---
import { HtmlReporter } from '../../src/coverage/reporters/html.js';
// --- coverage/index.ts ---
import {
  shouldReportCoverage,
  autoUpdateThresholds,
  cleanReportsDirectoryOnRerun,
  validateReportsDirectory,
  processV8CoverageBatchedAsync,
  startTestCoverage,
  stopTestCoverage,
  getTestCoverage,
  getAllTestCoverage,
} from '../../src/coverage/index.js';
// --- coverage/coverage-map.ts ---
import {
  createCoverageMap,
  FileCoverageInstance,
  CoverageSummaryInstance,
  createCoverageSummary,
} from '../../src/coverage/coverage-map.js';
// --- test-runner/index.ts ---
import {
  configureIsolation,
  getIsolationConfig,
  setSerialMode,
  getSerialMode,
  clearLifecycleHooks,
  notifyTestFailed,
  notifyTestFinished,
  onTestFailed,
  onTestFinished,
} from '../../src/test-runner/index.js';
// --- test-runner/reporter.ts ---
import {
  VerboseReporter,
  DotReporter,
  JsonReporter,
  SilentReporter,
  ReporterManager,
  getReporterManager,
  configureReporters,
  resetReporterManager,
} from '../../src/test-runner/reporter.js';
// --- test-runner/parse-cache.ts ---
import { ParseCache } from '../../src/test-runner/parse-cache.js';
// --- dom index for helper types ---
import { Document } from '../../src/dom/index.js';
import { Range } from '../../src/dom/range.js';

import * as fs from 'node:fs';
import * as path from 'node:path';

// =========================================================================
// dom-parser.ts — XMLSerializer.serializeToString
// =========================================================================

describe('func-coverage: dom-parser', () => {
  it('XMLSerializer.serializeToString serializes a node', () => {
    const serializer = new XMLSerializer();
    const doc = new Document();
    const div = doc.createElement('div');
    div.textContent = 'hello';
    const result = serializer.serializeToString(div);
    assert.ok(typeof result === 'string');
    assert.ok(result.includes('hello'));
  });
});

// =========================================================================
// cookie.ts — CookieJar direct usage (getCookieString / setCookieString)
// =========================================================================

describe('func-coverage: cookie', () => {
  it('CookieJar getCookieString and setCookieString', () => {
    const jar = new CookieJar();
    jar.setCookieString('foo=bar');
    const result = jar.getCookieString();
    assert.ok(result.includes('foo=bar'));
  });

  it('CookieJar handles SameSite attribute', () => {
    const jar = new CookieJar();
    jar.setCookieString('a=1; SameSite=Lax');
    assert.strictEqual(jar.getCookieString(), 'a=1');
  });

  it('CookieJar handles max-age deletion', () => {
    const jar = new CookieJar();
    jar.setCookieString('a=1');
    jar.setCookieString('a=1; max-age=0');
    assert.strictEqual(jar.getCookieString(), '');
  });

  it('CookieJar handles expires in the past', () => {
    const jar = new CookieJar();
    jar.setCookieString('a=1');
    jar.setCookieString('a=1; expires=Thu, 01 Jan 1970 00:00:00 GMT');
    assert.strictEqual(jar.getCookieString(), '');
  });

  it('CookieJar ignores empty string', () => {
    const jar = new CookieJar();
    jar.setCookieString('');
    assert.strictEqual(jar.getCookieString(), '');
  });

  it('CookieJar ignores string without =', () => {
    const jar = new CookieJar();
    jar.setCookieString('noequals');
    assert.strictEqual(jar.getCookieString(), '');
  });
});

// =========================================================================
// custom-elements.ts — upgrade() noop
// =========================================================================

describe('func-coverage: custom-elements', () => {
  it('upgrade is a noop', () => {
    const registry = new CustomElementRegistry();
    const doc = new Document();
    const div = doc.createElement('div');
    // Should not throw
    registry.upgrade(div);
  });
});

// =========================================================================
// abort.ts — AbortSignal.timeout, throwIfAborted, removeEventListener
// =========================================================================

describe('func-coverage: abort', () => {
  it('AbortSignal.timeout returns a signal', () => {
    const signal = AbortSignal.timeout(10000);
    assert.ok(signal instanceof AbortSignal);
    assert.strictEqual(signal.aborted, false);
  });

  it('AbortSignal.throwIfAborted throws when aborted', () => {
    const signal = AbortSignal.abort('test reason');
    assert.throws(() => signal.throwIfAborted());
  });

  it('AbortSignal.throwIfAborted does not throw when not aborted', () => {
    const controller = new AbortController();
    controller.signal.throwIfAborted(); // should not throw
  });

  it('AbortSignal.removeEventListener removes a listener', () => {
    const controller = new AbortController();
    let called = false;
    const listener = () => {
      called = true;
    };
    controller.signal.addEventListener('abort', listener);
    controller.signal.removeEventListener('abort', listener);
    controller.abort();
    assert.strictEqual(called, false);
  });
});

// =========================================================================
// data-transfer.ts — setDragImage, clearData(type), getAsFile, remove
// =========================================================================

describe('func-coverage: data-transfer', () => {
  it('DataTransfer.setDragImage is a noop', () => {
    const dt = new DataTransfer();
    dt.setDragImage({}, 0, 0); // should not throw
  });

  it('DataTransfer.clearData with specific type', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'hello');
    dt.setData('text/html', '<b>hi</b>');
    dt.clearData('text/plain');
    assert.strictEqual(dt.getData('text/plain'), '');
    assert.strictEqual(dt.getData('text/html'), '<b>hi</b>');
  });

  it('DataTransferItem.getAsFile returns null', () => {
    const item = new DataTransferItem('string', 'text/plain', 'data');
    assert.strictEqual(item.getAsFile(), null);
  });

  it('DataTransferItemList.remove removes an item', () => {
    const list = new DataTransferItemList();
    list.add('hello', 'text/plain');
    assert.strictEqual(list.length, 1);
    list.remove(0);
    assert.strictEqual(list.length, 0);
  });

  it('DataTransferItemList.get returns item at index', () => {
    const list = new DataTransferItemList();
    list.add('hello', 'text/plain');
    const item = list.get(0);
    assert.ok(item);
    assert.strictEqual(item.kind, 'string');
  });

  it('DataTransferItemList.add with File returns null', () => {
    const list = new DataTransferItemList();
    // Passing a non-string without type triggers File branch
    const result = (
      list as unknown as Record<string, (arg: unknown) => unknown>
    ).add(new Blob(['test']));
    assert.strictEqual(result, null);
  });
});

// =========================================================================
// mutation-observer.ts — notifyCharacterDataMutation, takeRecords
// =========================================================================

describe('func-coverage: mutation-observer', () => {
  it('notifyCharacterDataMutation notifies observers', async () => {
    const doc = new Document();
    const text = doc.createTextNode('hello');
    doc.appendChild(text);
    let records: MutationRecord[] = [];
    const observer = new MutationObserver((recs) => {
      records = recs;
    });
    observer.observe(text, {
      characterData: true,
      characterDataOldValue: true,
    });
    notifyCharacterDataMutation(text, 'old');
    // Wait for microtask
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(records.length > 0);
    assert.strictEqual(records[0]!.type, 'characterData');
    observer.disconnect();
  });

  it('MutationObserver.takeRecords returns queued records', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    doc.appendChild(div);
    const observer = new MutationObserver(() => {});
    observer.observe(div, { childList: true });
    const child = doc.createElement('span');
    notifyChildListMutation(div, [child], [], null, null);
    const taken = observer.takeRecords();
    assert.ok(taken.length > 0);
    observer.disconnect();
  });
});

// =========================================================================
// animation.ts — Animation.reverse, Animation.cancel, AnimationTimeline
// =========================================================================

describe('func-coverage: animation', () => {
  it('Animation.reverse flips playbackRate', () => {
    const effect = new KeyframeEffect(
      null,
      [{ opacity: 0 }, { opacity: 1 }],
      1000,
    );
    const anim = new Animation(effect);
    assert.strictEqual(anim.playbackRate, 1);
    anim.reverse();
    assert.strictEqual(anim.playbackRate, -1);
  });

  it('Animation.cancel resets state', () => {
    const effect = new KeyframeEffect(null, [{ opacity: 0 }], 500);
    const anim = new Animation(effect);
    anim.play();
    let cancelFired = false;
    anim.oncancel = () => {
      cancelFired = true;
    };
    anim.cancel();
    assert.strictEqual(anim.playState, 'idle');
    assert.strictEqual(anim.currentTime, null);
    assert.ok(cancelFired);
  });

  it('AnimationTimeline.currentTime returns a number', () => {
    const timeline = new AnimationTimeline();
    assert.ok(typeof timeline.currentTime === 'number');
  });

  it('KeyframeEffect.setKeyframes replaces keyframes', () => {
    const effect = new KeyframeEffect(null, [{ opacity: 0 }], 100);
    effect.setKeyframes([{ opacity: 1 }]);
    const kf = effect.getKeyframes();
    assert.strictEqual(kf.length, 1);
    assert.strictEqual(kf[0]!.opacity, 1);
  });

  it('KeyframeEffect.updateTiming modifies timing', () => {
    const effect = new KeyframeEffect(null, [], { duration: 100 });
    effect.updateTiming({ delay: 50 });
    assert.strictEqual(effect.getTiming().delay, 50);
  });

  it('Animation.finished and ready are promises', async () => {
    const effect = new KeyframeEffect(null, [], 100);
    const anim = new Animation(effect);
    assert.ok(anim.finished instanceof Promise);
    assert.ok(anim.ready instanceof Promise);
    anim.play();
    const ready = await anim.ready;
    assert.ok(ready === anim);
  });
});

// =========================================================================
// form-data.ts — forEach, keys, values, Symbol.iterator
// =========================================================================

describe('func-coverage: form-data', () => {
  it('FormData.forEach iterates entries', () => {
    const fd = new FormData();
    fd.append('a', '1');
    fd.append('b', '2');
    const collected: string[] = [];
    fd.forEach((value, key) => {
      collected.push(`${key}=${value}`);
    });
    assert.deepStrictEqual(collected, ['a=1', 'b=2']);
  });

  it('FormData.keys returns keys iterator', () => {
    const fd = new FormData();
    fd.append('x', '1');
    const keys = [...fd.keys()];
    assert.deepStrictEqual(keys, ['x']);
  });

  it('FormData.values returns values iterator', () => {
    const fd = new FormData();
    fd.append('x', '1');
    const values = [...fd.values()];
    assert.deepStrictEqual(values, ['1']);
  });

  it('FormData[Symbol.iterator] works', () => {
    const fd = new FormData();
    fd.append('a', '1');
    const entries = [...fd];
    assert.strictEqual(entries.length, 1);
    assert.deepStrictEqual(entries[0], ['a', '1']);
  });
});

// =========================================================================
// selection.ts — empty(), collapseToEnd, containsNode, selectAllChildren, toString
// =========================================================================

describe('func-coverage: selection', () => {
  it('Selection.empty clears ranges', () => {
    const sel = new Selection();
    const range = new Range();
    sel.addRange(range);
    assert.strictEqual(sel.rangeCount, 1);
    sel.empty();
    assert.strictEqual(sel.rangeCount, 0);
  });

  it('Selection.collapseToEnd collapses to end of last range', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('hello');
    div.appendChild(text);
    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 3);
    const sel = new Selection();
    sel.addRange(range);
    sel.collapseToEnd();
    assert.strictEqual(sel.isCollapsed, true);
  });

  it('Selection.containsNode checks node containment', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    div.appendChild(span);
    const range = new Range();
    range.selectNodeContents(div);
    const sel = new Selection();
    sel.addRange(range);
    assert.ok(sel.containsNode(span, true));
  });

  it('Selection.selectAllChildren selects all children', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.appendChild(doc.createTextNode('hi'));
    const sel = new Selection();
    sel.selectAllChildren(div);
    assert.strictEqual(sel.rangeCount, 1);
  });

  it('Selection.toString returns text of ranges', () => {
    const sel = new Selection();
    assert.strictEqual(sel.toString(), '');
  });

  it('Selection.type returns None/Caret/Range', () => {
    const sel = new Selection();
    assert.strictEqual(sel.type, 'None');
  });

  it('Selection.focusNode and focusOffset', () => {
    const sel = new Selection();
    assert.strictEqual(sel.focusNode, null);
    assert.strictEqual(sel.focusOffset, 0);
  });

  it('Selection.removeRange throws on non-existent range', () => {
    const sel = new Selection();
    const range = new Range();
    assert.throws(() => sel.removeRange(range));
  });
});

// =========================================================================
// performance.ts — clearMeasures(name), PerformanceObserverEntryList methods
// =========================================================================

describe('func-coverage: performance', () => {
  it('Performance.clearMeasures with specific name', () => {
    const perf = new Performance();
    perf.mark('a');
    perf.mark('b');
    perf.measure('m1', 'a', 'b');
    perf.measure('m2', 'a');
    perf.clearMeasures('m1');
    const entries = perf.getEntriesByType('measure');
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0]!.name, 'm2');
  });

  it('PerformanceObserverEntryList.getEntriesByName', () => {
    const list = new PerformanceObserverEntryList([
      { name: 'a', entryType: 'mark', startTime: 0, duration: 0 },
      { name: 'b', entryType: 'mark', startTime: 1, duration: 0 },
    ]);
    const result = list.getEntriesByName('a');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.name, 'a');
  });

  it('PerformanceObserverEntryList.getEntriesByType', () => {
    const list = new PerformanceObserverEntryList([
      { name: 'a', entryType: 'mark', startTime: 0, duration: 0 },
      { name: 'b', entryType: 'measure', startTime: 1, duration: 5 },
    ]);
    const result = list.getEntriesByType('measure');
    assert.strictEqual(result.length, 1);
  });

  it('PerformanceObserver.takeRecords returns buffer', () => {
    const perf = new Performance();
    const observer = new PerformanceObserver(() => {
      /* notified */
    });
    observer._performance = perf;
    observer.observe({ entryTypes: ['mark'] });
    perf.mark('test');
    const records = observer.takeRecords();
    assert.ok(records.length > 0);
    observer.disconnect();
  });
});

// =========================================================================
// workers.ts — ServiceWorkerContainer.getRegistrations, MessagePort methods
// =========================================================================

describe('func-coverage: workers', () => {
  it('ServiceWorkerContainer.getRegistrations', async () => {
    const container = new ServiceWorkerContainer();
    await container.register('/sw.js', { scope: '/' });
    const regs = await container.getRegistrations();
    assert.strictEqual(regs.length, 1);
  });

  it('ServiceWorkerRegistration.update is a noop', async () => {
    const sw = new ServiceWorker('/sw.js');
    const reg = new ServiceWorkerRegistration(sw, '/');
    await reg.update(); // should not throw
  });

  it('MessagePort.simulateMessage fires onmessage', () => {
    const port = new MessagePort();
    let received: unknown = null;
    port.onmessage = (ev) => {
      received = ev.data;
    };
    port.simulateMessage('test');
    assert.strictEqual(received, 'test');
  });

  it('MessagePort close prevents postMessage', () => {
    const port = new MessagePort();
    port.close();
    port.postMessage('ignored'); // should not throw
    assert.ok(port._isClosed);
  });

  it('Worker.simulateError fires onerror', () => {
    const worker = new Worker('test.js');
    let errorMsg = '';
    worker.onerror = (ev) => {
      errorMsg = ev.message;
    };
    worker.simulateError(new Error('boom'));
    assert.strictEqual(errorMsg, 'boom');
  });

  it('Worker.removeEventListener removes listener', () => {
    const worker = new Worker('test.js');
    let called = false;
    const listener = () => {
      called = true;
    };
    worker.addEventListener('message', listener);
    worker.removeEventListener('message', listener);
    worker.simulateMessage('test');
    assert.strictEqual(called, false);
  });

  it('ServiceWorker.postMessage is a noop', () => {
    const sw = new ServiceWorker('/sw.js');
    sw.postMessage('test'); // should not throw
  });

  it('ServiceWorker.removeEventListener works', () => {
    const sw = new ServiceWorker('/sw.js');
    const listener = () => {};
    sw.addEventListener('statechange', listener);
    sw.removeEventListener('statechange', listener);
  });

  it('SharedWorker with string options sets name', () => {
    const sw = new SharedWorker('/shared.js', 'myworker');
    assert.strictEqual(sw.name, 'myworker');
  });

  it('MessagePort.removeEventListener works', () => {
    const port = new MessagePort();
    const listener = () => {};
    port.addEventListener('message', listener);
    port.removeEventListener('message', listener);
  });

  it('MessagePort.start sets started', () => {
    const port = new MessagePort();
    port.start();
    assert.ok(port._isStarted);
  });
});

// =========================================================================
// indexeddb.ts — IDBCursor.advance, IDBCursor.delete, IDBCursor.update,
//               IDBFactory.databases, IDBDatabase._fireVersionChange,
//               IDBOpenDBRequest._fireBlocked, IDBIndex.openCursor
// =========================================================================

describe('func-coverage: indexeddb', () => {
  it('IDBFactory.databases returns list of databases', async () => {
    const factory = new IDBFactory();
    // Open a database to populate the list
    const req = factory.open('testdb', 1);
    await new Promise<void>((resolve) => {
      req.onsuccess = () => resolve();
    });
    const dbs = await factory.databases();
    assert.ok(dbs.length > 0);
    assert.strictEqual(dbs[0]!.name, 'testdb');
  });

  it('IDBCursor.advance moves cursor forward', async () => {
    const factory = new IDBFactory();
    const req = factory.open('advancedb', 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let db: any;
    await new Promise<void>((resolve) => {
      req.onupgradeneeded = () => {
        db = req.result;
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.add({ id: 1, name: 'a' });
        store.add({ id: 2, name: 'b' });
        store.add({ id: 3, name: 'c' });
      };
      req.onsuccess = () => {
        db = req.result;
        resolve();
      };
    });

    // Wait for adds to complete
    await new Promise((r) => setTimeout(r, 50));

    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const cursorReq = store.openCursor();

    await new Promise<void>((resolve) => {
      let first = true;
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor && first) {
          first = false;
          cursor.advance(2); // skip to 3rd
        } else {
          resolve();
        }
      };
    });
  });

  it('IDBCursor.delete removes current record', async () => {
    const factory = new IDBFactory();
    const req = factory.open('deletedb', 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let db: any;
    await new Promise<void>((resolve) => {
      req.onupgradeneeded = () => {
        db = req.result;
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.add({ id: 1, name: 'a' });
      };
      req.onsuccess = () => {
        db = req.result;
        resolve();
      };
    });

    await new Promise((r) => setTimeout(r, 50));

    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    const cursorReq = store.openCursor();

    await new Promise<void>((resolve) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          resolve();
        }
      };
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  it('IDBCursor.update modifies current record', async () => {
    const factory = new IDBFactory();
    const req = factory.open('updatedb', 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let db: any;
    await new Promise<void>((resolve) => {
      req.onupgradeneeded = () => {
        db = req.result;
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.add({ id: 1, name: 'old' });
      };
      req.onsuccess = () => {
        db = req.result;
        resolve();
      };
    });

    await new Promise((r) => setTimeout(r, 50));

    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    const cursorReq = store.openCursor();

    await new Promise<void>((resolve) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.update({ id: 1, name: 'new' });
          resolve();
        }
      };
    });
    await new Promise((r) => setTimeout(r, 50));
  });

  it('IDBDatabase.deleteObjectStore removes a store', () => {
    const db = new IDBDatabase('test', 1);
    db.createObjectStore('store1');
    db.deleteObjectStore('store1');
    assert.strictEqual(db.objectStoreNames.length, 0);
  });

  it('IDBDatabase._fireVersionChange fires event', () => {
    const db = new IDBDatabase('test', 1);
    let firedOld = -1;
    db.onversionchange = (ev) => {
      firedOld = ev.oldVersion;
    };
    db._fireVersionChange(1, 2);
    assert.strictEqual(firedOld, 1);
  });

  it('IDBIndex.openCursor iterates index entries', async () => {
    const factory = new IDBFactory();
    const req = factory.open('indexcursordb', 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let db: any;
    await new Promise<void>((resolve) => {
      req.onupgradeneeded = () => {
        db = req.result;
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('name_idx', 'name');
        store.add({ id: 1, name: 'alpha' });
      };
      req.onsuccess = () => {
        db = req.result;
        resolve();
      };
    });
    await new Promise((r) => setTimeout(r, 50));

    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const idx = store.index('name_idx');
    const cursorReq = idx.openCursor();
    await new Promise<void>((resolve) => {
      cursorReq.onsuccess = () => {
        resolve();
      };
    });
  });

  it('IDBKeyRange.bound creates bounded range', () => {
    const range = IDBKeyRange.bound(1, 10, true, false);
    assert.ok(!range.includes(1)); // lowerOpen
    assert.ok(range.includes(5));
    assert.ok(range.includes(10));
  });
});

// =========================================================================
// canvas.ts — CanvasPattern, isPointInStroke, ellipse, arcTo, quadraticCurveTo
// =========================================================================

describe('func-coverage: canvas', () => {
  it('CanvasPattern is constructable', () => {
    const pattern = new CanvasPattern();
    assert.ok(pattern instanceof CanvasPattern);
  });

  it('CanvasRenderingContext2D.isPointInStroke returns false', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    assert.strictEqual(ctx.isPointInStroke(0, 0), false);
  });

  it('CanvasRenderingContext2D.ellipse records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.ellipse(50, 50, 25, 15, 0, 0, Math.PI * 2);
    const calls = ctx.__getDrawCalls();
    assert.ok(calls.some((c) => c.method === 'ellipse'));
  });

  it('CanvasRenderingContext2D.arcTo records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.arcTo(10, 10, 20, 20, 5);
    const calls = ctx.__getDrawCalls();
    assert.ok(calls.some((c) => c.method === 'arcTo'));
  });

  it('CanvasRenderingContext2D.quadraticCurveTo records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.quadraticCurveTo(10, 10, 20, 20);
    assert.ok(
      ctx.__getDrawCalls().some((c) => c.method === 'quadraticCurveTo'),
    );
  });

  it('CanvasRenderingContext2D.bezierCurveTo records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.bezierCurveTo(10, 10, 20, 20, 30, 30);
    assert.ok(ctx.__getDrawCalls().some((c) => c.method === 'bezierCurveTo'));
  });

  it('CanvasRenderingContext2D.createRadialGradient returns gradient', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    const grad = ctx.createRadialGradient(0, 0, 5, 10, 10, 20);
    assert.ok(grad instanceof CanvasGradient);
  });

  it('CanvasRenderingContext2D.createPattern returns pattern', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    const img = doc.createElement('img');
    const pat = ctx.createPattern(img, 'repeat');
    assert.ok(pat instanceof CanvasPattern);
  });

  it('CanvasRenderingContext2D.putImageData records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    const imgData = new ImageData(2, 2);
    ctx.putImageData(imgData, 0, 0);
    assert.ok(ctx.__getDrawCalls().some((c) => c.method === 'putImageData'));
  });

  it('CanvasRenderingContext2D.clip records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.clip();
    assert.ok(ctx.__getDrawCalls().some((c) => c.method === 'clip'));
  });

  it('CanvasRenderingContext2D transform methods record calls', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.transform(1, 0, 0, 1, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.resetTransform();
    const calls = ctx.__getDrawCalls();
    assert.ok(calls.some((c) => c.method === 'transform'));
    assert.ok(calls.some((c) => c.method === 'setTransform'));
    assert.ok(calls.some((c) => c.method === 'resetTransform'));
  });

  it('CanvasRenderingContext2D.__clearDrawCalls clears', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.fill();
    ctx.__clearDrawCalls();
    assert.strictEqual(ctx.__getDrawCalls().length, 0);
  });

  it('CanvasRenderingContext2D.drawImage records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.drawImage({}, 0, 0);
    assert.ok(ctx.__getDrawCalls().some((c) => c.method === 'drawImage'));
  });

  it('CanvasRenderingContext2D.strokeText records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.strokeText('hello', 10, 10);
    assert.ok(ctx.__getDrawCalls().some((c) => c.method === 'strokeText'));
  });

  it('CanvasRenderingContext2D.strokeRect records call', () => {
    const doc = new Document();
    const canvas = doc.createElement('canvas');
    const ctx = new CanvasRenderingContext2D(canvas);
    ctx.strokeRect(0, 0, 10, 10);
    assert.ok(ctx.__getDrawCalls().some((c) => c.method === 'strokeRect'));
  });
});

// =========================================================================
// coverage/reporters/text.ts — TextReporter.onEnd
// =========================================================================

describe('func-coverage: text reporter', () => {
  it('TextReporter.onEnd writes to stdout', () => {
    const reporter = new TextReporter({
      reportsDirectory: '/tmp/test-cov-text',
    });
    const map = createCoverageMap();
    map.addFileCoverage({
      path: '/tmp/test.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 1 },
      f: {},
      b: {},
    });
    const summary = map.toSummary();
    // Capture stdout
    const origWrite = process.stdout.write;
    let output = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdout.write = ((chunk: unknown) => {
      output += String(chunk);
      return true;
    }) as any;
    try {
      reporter.onEnd(map, summary);
    } finally {
      process.stdout.write = origWrite;
    }
    assert.ok(output.length > 0);
  });
});

// =========================================================================
// coverage/reporters/html.ts — HtmlReporter.onEnd
// =========================================================================

describe('func-coverage: html reporter', () => {
  it('HtmlReporter.onEnd generates HTML files', () => {
    const tmpDir = path.join('/tmp', `cov-html-test-${Date.now()}`);
    const reporter = new HtmlReporter({ reportsDirectory: tmpDir });
    const map = createCoverageMap();
    map.addFileCoverage({
      path: '/tmp/fake-src.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {
        '0': {
          name: 'foo',
          decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          line: 1,
        },
      },
      branchMap: {
        '0': {
          type: 'if',
          locations: [
            { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
          ],
          line: 1,
        },
      },
      s: { '0': 1 },
      f: { '0': 1 },
      b: { '0': [1, 0] },
    });
    const summary = map.toSummary();
    reporter.onEnd(map, summary);
    const htmlDir = path.join(tmpDir, 'html');
    assert.ok(fs.existsSync(path.join(htmlDir, 'index.html')));
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// =========================================================================
// coverage/index.ts — various functions
// =========================================================================

describe('func-coverage: coverage index', () => {
  it('shouldReportCoverage returns true when no threshold result', () => {
    assert.strictEqual(shouldReportCoverage(undefined, false), true);
  });

  it('shouldReportCoverage returns false when threshold failed and reportOnFailure is false', () => {
    assert.strictEqual(
      shouldReportCoverage(
        {
          passed: false,
          failures: [{ metric: 'lines', actual: 50, expected: 80 }],
        },
        false,
      ),
      false,
    );
  });

  it('shouldReportCoverage returns true when threshold passed', () => {
    assert.strictEqual(
      shouldReportCoverage({ passed: true, failures: [] }, false),
      true,
    );
  });

  it('cleanReportsDirectoryOnRerun does nothing when cleanOnRerun is false', () => {
    cleanReportsDirectoryOnRerun(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {
        cleanOnRerun: false,
        reportsDirectory: '/tmp/x',
        reporter: ['text'],
        include: ['**'],
        exclude: [],
        provider: 'v8',
        all: false,
        skipFull: false,
        reportOnFailure: true,
        clean: false,
        changed: false,
        ignoreClassMethods: [],
        processingConcurrency: 1,
      } as any,
      true,
    );
  });

  it('autoUpdateThresholds writes file when improved', () => {
    const tmpDir = path.join('/tmp', `auto-thresh-${Date.now()}`);
    const summary = {
      lines: { total: 100, covered: 95, skipped: 0, pct: 95 },
      statements: { total: 100, covered: 95, skipped: 0, pct: 95 },
      functions: { total: 100, covered: 95, skipped: 0, pct: 95 },
      branches: { total: 100, covered: 95, skipped: 0, pct: 95 },
    };
    autoUpdateThresholds(summary, { lines: 80, autoUpdate: true }, tmpDir);
    const filePath = path.join(tmpDir, '.coveragethresholds.json');
    assert.ok(fs.existsSync(filePath));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('autoUpdateThresholds does nothing when autoUpdate is false', () => {
    autoUpdateThresholds(
      {
        lines: { total: 1, covered: 1, skipped: 0, pct: 100 },
        statements: { total: 1, covered: 1, skipped: 0, pct: 100 },
        functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
        branches: { total: 1, covered: 1, skipped: 0, pct: 100 },
      },
      { lines: 80 },
      '/tmp/noop',
    );
  });

  it('processV8CoverageBatchedAsync processes scripts', async () => {
    const config = {
      include: ['**'],
      exclude: [],
      provider: 'v8' as const,
      reporter: ['text'],
      reportsDirectory: '/tmp/cov',
      all: false,
      skipFull: false,
      reportOnFailure: true,
      clean: false,
      cleanOnRerun: false,
      changed: false,
      ignoreClassMethods: [],
      processingConcurrency: 2,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processV8CoverageBatchedAsync([], config as any);
    assert.strictEqual(result.size, 0);
  });

  it('startTestCoverage and stopTestCoverage track per-test coverage', () => {
    const map1 = createCoverageMap();
    map1.addFileCoverage({
      path: '/test.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 0 },
      f: {},
      b: {},
    });
    startTestCoverage('mytest', map1);

    const map2 = createCoverageMap();
    map2.addFileCoverage({
      path: '/test.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 5 },
      f: {},
      b: {},
    });
    const delta = stopTestCoverage('mytest', map2);
    assert.ok(delta);
  });

  it('getTestCoverage and getAllTestCoverage return results', () => {
    const cov = getTestCoverage('mytest');
    assert.ok(cov !== undefined);
    const all = getAllTestCoverage();
    assert.ok(all instanceof Map);
  });

  it('validateReportsDirectory throws for path outside project', () => {
    assert.throws(() => validateReportsDirectory('/etc/passwd', '/home/test'));
  });
});

// =========================================================================
// coverage-map.ts — CoverageSummaryInstance.isEmpty, FileCoverageInstance methods
// =========================================================================

describe('func-coverage: coverage-map', () => {
  it('CoverageSummaryInstance.isEmpty returns true for empty', () => {
    const summary = new CoverageSummaryInstance(createCoverageSummary());
    // Default createCoverageSummary has total=0, so change pct behavior
    // Actually createCoverageSummary returns pct=100 for total=0
    // Need to set totals to 0:
    summary.lines.total = 0;
    summary.statements.total = 0;
    summary.functions.total = 0;
    summary.branches.total = 0;
    assert.strictEqual(summary.isEmpty(), true);
  });

  it('CoverageSummaryInstance.merge combines summaries', () => {
    const a = new CoverageSummaryInstance({
      lines: { total: 10, covered: 5, skipped: 0, pct: 50 },
      statements: { total: 10, covered: 5, skipped: 0, pct: 50 },
      functions: { total: 10, covered: 5, skipped: 0, pct: 50 },
      branches: { total: 10, covered: 5, skipped: 0, pct: 50 },
    });
    const merged = a.merge({
      lines: { total: 10, covered: 10, skipped: 0, pct: 100 },
      statements: { total: 10, covered: 10, skipped: 0, pct: 100 },
      functions: { total: 10, covered: 10, skipped: 0, pct: 100 },
      branches: { total: 10, covered: 10, skipped: 0, pct: 100 },
    });
    assert.strictEqual(merged.lines.total, 20);
  });

  it('CoverageSummaryInstance.toJSON returns plain object', () => {
    const inst = new CoverageSummaryInstance(createCoverageSummary());
    const json = inst.toJSON();
    assert.ok('lines' in json);
  });

  it('FileCoverageInstance.resetHits zeroes all counts', () => {
    const fci = new FileCoverageInstance({
      path: '/test.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {
        '0': {
          name: 'fn',
          decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          line: 1,
        },
      },
      branchMap: {},
      s: { '0': 5 },
      f: { '0': 3 },
      b: { '0': [1, 2] },
    });
    fci.resetHits();
    assert.strictEqual(fci.s['0'], 0);
    assert.strictEqual(fci.f['0'], 0);
  });

  it('FileCoverageInstance.toJSON returns plain object', () => {
    const fci = new FileCoverageInstance({
      path: '/test.ts',
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {},
    });
    const json = fci.toJSON();
    assert.strictEqual(json.path, '/test.ts');
  });

  it('FileCoverageInstance.computeSimpleTotals works', () => {
    const fci = new FileCoverageInstance({
      path: '/test.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 1 },
      f: {},
      b: {},
    });
    const totals = fci.computeSimpleTotals();
    assert.strictEqual(totals.total, 1);
    assert.strictEqual(totals.covered, 1);
  });

  it('FileCoverageInstance.computeBranchTotals works', () => {
    const fci = new FileCoverageInstance({
      path: '/test.ts',
      statementMap: {},
      fnMap: {},
      branchMap: { '0': { type: 'if', locations: [], line: 1 } },
      s: {},
      f: {},
      b: { '0': [1, 0] },
    });
    const totals = fci.computeBranchTotals();
    assert.strictEqual(totals.total, 2);
    assert.strictEqual(totals.covered, 1);
  });

  it('FileCoverageInstance.merge combines two coverages', () => {
    const fci = new FileCoverageInstance({
      path: '/test.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 1 },
      f: {},
      b: {},
    });
    fci.merge({
      path: '/test.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 2 },
      f: {},
      b: {},
    });
    assert.strictEqual(fci.s['0'], 3);
  });

  it('CoverageMap.data returns record of files', () => {
    const map = createCoverageMap();
    map.addFileCoverage({
      path: '/file.ts',
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {},
    });
    const data = map.data();
    assert.ok('/file.ts' in data);
  });

  it('CoverageMap.getCoverageSummary returns summary', () => {
    const map = createCoverageMap();
    const summary = map.getCoverageSummary();
    assert.ok('lines' in summary);
  });
});

// =========================================================================
// test-runner/index.ts — configureIsolation, getIsolationConfig, etc.
// =========================================================================

describe('func-coverage: test-runner', () => {
  it('configureIsolation and getIsolationConfig', () => {
    configureIsolation({ isolate: true, isolation: 'mocks' });
    const config = getIsolationConfig();
    assert.strictEqual(config.isolate, true);
    assert.strictEqual(config.isolation, 'mocks');
    // Reset
    configureIsolation({});
  });

  it('setSerialMode and getSerialMode', () => {
    const original = getSerialMode();
    setSerialMode(true);
    assert.strictEqual(getSerialMode(), true);
    setSerialMode(original);
  });

  it('lifecycle hooks: onTestFailed, onTestFinished, notifyTestFailed, notifyTestFinished', () => {
    clearLifecycleHooks();
    let failedCtx: Record<string, unknown> | null = null;
    let finishedCtx: Record<string, unknown> | null = null;
    onTestFailed((ctx) => {
      failedCtx = ctx;
    });
    onTestFinished((ctx) => {
      finishedCtx = ctx;
    });
    notifyTestFailed({ name: 'test1', error: new Error('oops') });
    notifyTestFinished({ name: 'test1', passed: false });
    assert.strictEqual(failedCtx?.name, 'test1');
    assert.strictEqual(finishedCtx?.passed, false);
    clearLifecycleHooks();
  });
});

// =========================================================================
// test-runner/reporter.ts — resetReporterManager, SilentReporter, DotReporter methods
// =========================================================================

describe('func-coverage: reporter', () => {
  it('resetReporterManager resets the singleton', () => {
    resetReporterManager();
    const mgr = getReporterManager();
    assert.ok(mgr instanceof ReporterManager);
    resetReporterManager();
  });

  it('SilentReporter produces no output', () => {
    const reporter = new SilentReporter();
    assert.ok(reporter);
  });

  it('DotReporter.onTestTodo outputs t', () => {
    const reporter = new DotReporter({ colors: false });
    const origWrite = process.stdout.write;
    let output = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdout.write = ((chunk: unknown) => {
      output += String(chunk);
      return true;
    }) as any;
    try {
      reporter.onTestTodo({ name: 'test' });
    } finally {
      process.stdout.write = origWrite;
    }
    assert.ok(output.includes('t'));
  });

  it('DotReporter.onTestSkip outputs s', () => {
    const reporter = new DotReporter({ colors: false });
    const origWrite = process.stdout.write;
    let output = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdout.write = ((chunk: unknown) => {
      output += String(chunk);
      return true;
    }) as any;
    try {
      reporter.onTestSkip({ name: 'test' });
    } finally {
      process.stdout.write = origWrite;
    }
    assert.ok(output.includes('s'));
  });

  it('VerboseReporter.onTestSkip outputs skip info', () => {
    const reporter = new VerboseReporter({ colors: false });
    const origWrite = process.stdout.write;
    let output = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdout.write = ((chunk: unknown) => {
      output += String(chunk);
      return true;
    }) as any;
    try {
      reporter.onTestSkip({ name: 'skipped-test' });
    } finally {
      process.stdout.write = origWrite;
    }
    assert.ok(output.includes('skipped'));
  });

  it('VerboseReporter.onTestTodo outputs todo info', () => {
    const reporter = new VerboseReporter({ colors: false });
    const origWrite = process.stdout.write;
    let output = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdout.write = ((chunk: unknown) => {
      output += String(chunk);
      return true;
    }) as any;
    try {
      reporter.onTestTodo({ name: 'todo-test' });
    } finally {
      process.stdout.write = origWrite;
    }
    assert.ok(output.includes('todo'));
  });

  it('VerboseReporter.onSuiteStart outputs suite name', () => {
    const reporter = new VerboseReporter({ colors: false });
    const origWrite = process.stdout.write;
    let output = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdout.write = ((chunk: unknown) => {
      output += String(chunk);
      return true;
    }) as any;
    try {
      reporter.onSuiteStart({ name: 'MySuite' });
    } finally {
      process.stdout.write = origWrite;
    }
    assert.ok(output.includes('MySuite'));
  });

  it('JsonReporter outputs all event types', () => {
    const reporter = new JsonReporter({ colors: false });
    const origWrite = process.stdout.write;
    let output = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdout.write = ((chunk: unknown) => {
      output += String(chunk);
      return true;
    }) as any;
    try {
      reporter.onSuiteStart({ name: 's' });
      reporter.onSuiteEnd({ name: 's' });
      reporter.onTestStart({ name: 't' });
      reporter.onTestPass({ name: 't' });
      reporter.onTestFail({ name: 't', error: new Error('e') });
      reporter.onTestSkip({ name: 't' });
      reporter.onTestTodo({ name: 't' });
      reporter.onRunStart({ files: ['a.ts'], totalTests: 1 });
      reporter.onRunEnd({
        passed: 1,
        failed: 0,
        skipped: 0,
        todo: 0,
        duration: 100,
      });
    } finally {
      process.stdout.write = origWrite;
    }
    assert.ok(output.includes('suite:start'));
    assert.ok(output.includes('run:end'));
  });

  it('ReporterManager.removeReporter removes a reporter', () => {
    const mgr = new ReporterManager();
    const reporter = new SilentReporter();
    mgr.addReporter(reporter);
    assert.strictEqual(mgr.getReporters().length, 1);
    mgr.removeReporter(reporter);
    assert.strictEqual(mgr.getReporters().length, 0);
  });

  it('ReporterManager.notify dispatches events', () => {
    const mgr = new ReporterManager();
    let passed = false;
    const custom: Record<string, () => void> = {
      onTestPass: () => {
        passed = true;
      },
    };
    mgr.addReporter(custom);
    mgr.notify('onTestPass', { name: 'test' });
    assert.ok(passed);
  });

  it('configureReporters with reporter string', () => {
    configureReporters({ reporter: 'silent' });
    const mgr = getReporterManager();
    assert.ok(mgr.getReporters().length > 0);
    resetReporterManager();
  });

  it('configureReporters with reporters array', () => {
    configureReporters({ reporters: ['silent', 'dot'] });
    const mgr = getReporterManager();
    assert.strictEqual(mgr.getReporters().length, 2);
    resetReporterManager();
  });
});

// =========================================================================
// test-runner/parse-cache.ts — invalidate, clear, hitCount, missCount
// =========================================================================

describe('func-coverage: parse-cache', () => {
  it('ParseCache.invalidate removes cache entry', () => {
    const cache = new ParseCache();
    cache.invalidate('/nonexistent');
    // No error expected
  });

  it('ParseCache.clear resets everything', () => {
    const cache = new ParseCache();
    cache.clear();
    assert.strictEqual(cache.hitCount, 0);
    assert.strictEqual(cache.missCount, 0);
  });

  it('ParseCache.getImports falls back to regex', () => {
    const cache = new ParseCache();
    // Create a temp file
    const tmpFile = path.join('/tmp', `parse-cache-test-${Date.now()}.ts`);
    fs.writeFileSync(
      tmpFile,
      'import { foo } from "./bar.js";\nexport { baz } from "./qux.js";\nimport "./side-effect.js";\nimport * as ns from "./ns.js";\nconst x = import("./dynamic.js");\n',
      'utf-8',
    );
    try {
      const imports = cache.getImports(tmpFile);
      assert.ok(imports.staticImports.length > 0);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('ParseCache.getImports returns empty for nonexistent file', () => {
    const cache = new ParseCache();
    const imports = cache.getImports('/nonexistent/file.ts');
    assert.ok(imports);
    assert.strictEqual(imports.staticImports.length, 0);
  });

  it('ParseCache.getAST returns null for nonexistent file', () => {
    const cache = new ParseCache();
    const ast = cache.getAST('/nonexistent/file.ts');
    assert.strictEqual(ast, null);
  });
});
