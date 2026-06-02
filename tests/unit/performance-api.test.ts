import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow } from '../../src/dom/window.js';
import {
  Performance,
  PerformanceObserver,
  PerformanceObserverEntryList,
} from '../../src/dom/performance.js';
import type { PerformanceEntry } from '../../src/dom/performance.js';

describe('Performance API', () => {
  describe('performance.now()', () => {
    it('returns a number', () => {
      const win = createWindow();
      const now = win.performance.now();
      assert.equal(typeof now, 'number');
    });

    it('returns non-negative value', () => {
      const win = createWindow();
      assert.ok(win.performance.now() >= 0);
    });

    it('increases over time', () => {
      const perf = new Performance();
      const t1 = perf.now();
      // Spin to ensure time passes
      const start = Date.now();
      while (Date.now() - start < 2) {
        // busy wait
      }
      const t2 = perf.now();
      assert.ok(t2 >= t1);
    });
  });

  describe('performance.timeOrigin', () => {
    it('returns a number', () => {
      const perf = new Performance();
      assert.equal(typeof perf.timeOrigin, 'number');
    });
  });

  describe('performance.mark()', () => {
    it('creates a mark entry', () => {
      const perf = new Performance();
      const mark = perf.mark('testMark');
      assert.equal(mark.name, 'testMark');
      assert.equal(mark.entryType, 'mark');
      assert.equal(mark.duration, 0);
      assert.equal(typeof mark.startTime, 'number');
    });

    it('mark appears in getEntries', () => {
      const perf = new Performance();
      perf.mark('a');
      const entries = perf.getEntries();
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.name, 'a');
    });

    it('mark appears in getEntriesByName', () => {
      const perf = new Performance();
      perf.mark('myMark');
      const entries = perf.getEntriesByName('myMark');
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.entryType, 'mark');
    });

    it('mark appears in getEntriesByType', () => {
      const perf = new Performance();
      perf.mark('m');
      const entries = perf.getEntriesByType('mark');
      assert.equal(entries.length, 1);
    });
  });

  describe('performance.measure()', () => {
    it('creates a measure between two marks', () => {
      const perf = new Performance();
      perf.mark('start');
      perf.mark('end');
      const measure = perf.measure('test', 'start', 'end');
      assert.equal(measure.name, 'test');
      assert.equal(measure.entryType, 'measure');
      assert.equal(typeof measure.duration, 'number');
      assert.ok(measure.duration >= 0);
    });

    it('measure without marks uses time origin and now', () => {
      const perf = new Performance();
      const measure = perf.measure('default');
      assert.equal(measure.startTime, 0);
      assert.ok(measure.duration >= 0);
    });

    it('measure with only startMark', () => {
      const perf = new Performance();
      perf.mark('start');
      const measure = perf.measure('half', 'start');
      assert.ok(measure.duration >= 0);
    });

    it('throws for nonexistent start mark', () => {
      const perf = new Performance();
      assert.throws(() => {
        perf.measure('bad', 'nonexistent');
      }, /does not exist/);
    });

    it('throws for nonexistent end mark', () => {
      const perf = new Performance();
      perf.mark('start');
      assert.throws(() => {
        perf.measure('bad', 'start', 'nonexistent');
      }, /does not exist/);
    });

    it('measure appears in getEntriesByType', () => {
      const perf = new Performance();
      perf.mark('a');
      perf.mark('b');
      perf.measure('m', 'a', 'b');
      const measures = perf.getEntriesByType('measure');
      assert.equal(measures.length, 1);
      assert.equal(measures[0]!.name, 'm');
    });
  });

  describe('getEntries / getEntriesByName / getEntriesByType', () => {
    it('returns all entries', () => {
      const perf = new Performance();
      perf.mark('a');
      perf.mark('b');
      perf.measure('m', 'a', 'b');
      const entries = perf.getEntries();
      assert.equal(entries.length, 3);
    });

    it('getEntriesByName filters correctly', () => {
      const perf = new Performance();
      perf.mark('alpha');
      perf.mark('beta');
      const alpha = perf.getEntriesByName('alpha');
      assert.equal(alpha.length, 1);
      assert.equal(alpha[0]!.name, 'alpha');
    });

    it('getEntriesByType separates marks and measures', () => {
      const perf = new Performance();
      perf.mark('x');
      perf.mark('y');
      perf.measure('m', 'x', 'y');
      assert.equal(perf.getEntriesByType('mark').length, 2);
      assert.equal(perf.getEntriesByType('measure').length, 1);
    });
  });

  describe('clearMarks / clearMeasures', () => {
    it('clearMarks removes all marks', () => {
      const perf = new Performance();
      perf.mark('a');
      perf.mark('b');
      perf.clearMarks();
      assert.equal(perf.getEntriesByType('mark').length, 0);
    });

    it('clearMarks with name removes specific mark', () => {
      const perf = new Performance();
      perf.mark('a');
      perf.mark('b');
      perf.clearMarks('a');
      const marks = perf.getEntriesByType('mark');
      assert.equal(marks.length, 1);
      assert.equal(marks[0]!.name, 'b');
    });

    it('clearMeasures removes all measures', () => {
      const perf = new Performance();
      perf.mark('a');
      perf.mark('b');
      perf.measure('m1', 'a', 'b');
      perf.measure('m2', 'a', 'b');
      perf.clearMeasures();
      assert.equal(perf.getEntriesByType('measure').length, 0);
    });

    it('clearMeasures with name removes specific measure', () => {
      const perf = new Performance();
      perf.mark('a');
      perf.mark('b');
      perf.measure('m1', 'a', 'b');
      perf.measure('m2', 'a', 'b');
      perf.clearMeasures('m1');
      const measures = perf.getEntriesByType('measure');
      assert.equal(measures.length, 1);
      assert.equal(measures[0]!.name, 'm2');
    });
  });

  describe('PerformanceObserver', () => {
    it('receives entries when observing', () => {
      const perf = new Performance();
      const received: PerformanceEntry[] = [];
      const observer = new PerformanceObserver((list) => {
        received.push(...list.getEntries());
      });
      observer._performance = perf;
      observer.observe({ entryTypes: ['mark'] });
      perf.mark('observed');
      assert.equal(received.length, 1);
      assert.equal(received[0]!.name, 'observed');
    });

    it('filters by entryTypes', () => {
      const perf = new Performance();
      const received: PerformanceEntry[] = [];
      const observer = new PerformanceObserver((list) => {
        received.push(...list.getEntries());
      });
      observer._performance = perf;
      observer.observe({ entryTypes: ['measure'] });
      perf.mark('a');
      perf.mark('b');
      // marks should not be received
      assert.equal(received.length, 0);
      perf.measure('m', 'a', 'b');
      assert.equal(received.length, 1);
      assert.equal(received[0]!.entryType, 'measure');
    });

    it('disconnect stops notifications', () => {
      const perf = new Performance();
      const received: PerformanceEntry[] = [];
      const observer = new PerformanceObserver((list) => {
        received.push(...list.getEntries());
      });
      observer._performance = perf;
      observer.observe({ entryTypes: ['mark'] });
      perf.mark('first');
      assert.equal(received.length, 1);
      observer.disconnect();
      perf.mark('second');
      assert.equal(received.length, 1);
    });

    it('takeRecords returns buffered entries and clears buffer', () => {
      const perf = new Performance();
      const observer = new PerformanceObserver(() => {});
      observer._performance = perf;
      observer.observe({ entryTypes: ['mark'] });
      perf.mark('a');
      perf.mark('b');
      const records = observer.takeRecords();
      assert.equal(records.length, 2);
      const records2 = observer.takeRecords();
      assert.equal(records2.length, 0);
    });
  });

  describe('PerformanceObserverEntryList', () => {
    it('getEntries returns all entries', () => {
      const entries: PerformanceEntry[] = [
        { name: 'a', entryType: 'mark', startTime: 0, duration: 0 },
        { name: 'b', entryType: 'measure', startTime: 0, duration: 10 },
      ];
      const list = new PerformanceObserverEntryList(entries);
      assert.equal(list.getEntries().length, 2);
    });

    it('getEntriesByName filters', () => {
      const entries: PerformanceEntry[] = [
        { name: 'a', entryType: 'mark', startTime: 0, duration: 0 },
        { name: 'b', entryType: 'mark', startTime: 0, duration: 0 },
      ];
      const list = new PerformanceObserverEntryList(entries);
      assert.equal(list.getEntriesByName('a').length, 1);
    });

    it('getEntriesByType filters', () => {
      const entries: PerformanceEntry[] = [
        { name: 'a', entryType: 'mark', startTime: 0, duration: 0 },
        { name: 'b', entryType: 'measure', startTime: 0, duration: 10 },
      ];
      const list = new PerformanceObserverEntryList(entries);
      assert.equal(list.getEntriesByType('mark').length, 1);
      assert.equal(list.getEntriesByType('measure').length, 1);
    });
  });

  describe('Window integration', () => {
    it('window.performance is a Performance instance', () => {
      const win = createWindow();
      assert.ok(win.performance instanceof Performance);
    });

    it('window.performance.mark works', () => {
      const win = createWindow();
      const mark = win.performance.mark('test');
      assert.equal(mark.name, 'test');
    });

    it('window.performance.now() returns number', () => {
      const win = createWindow();
      assert.equal(typeof win.performance.now(), 'number');
    });
  });
});
