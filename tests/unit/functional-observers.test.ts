import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';
import {
  IntersectionObserver,
  triggerIntersection,
  type IntersectionObserverEntry,
} from '../../src/dom/intersection-observer.js';
import {
  ResizeObserver,
  triggerResize,
  type ResizeObserverEntry,
} from '../../src/dom/resize-observer.js';

describe('Functional IntersectionObserver', () => {
  describe('observe/unobserve/disconnect lifecycle', () => {
    it('should observe a target and receive entries on trigger', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerIntersection(observer, [{ target: div, isIntersecting: true }]);

      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0]!.target, div);
      assert.strictEqual(received[0]!.isIntersecting, true);
      observer.disconnect();
    });

    it('should stop tracking after unobserve', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);
      observer.unobserve(div);

      triggerIntersection(observer, [{ target: div, isIntersecting: true }]);

      assert.strictEqual(received.length, 0);
    });

    it('should stop tracking all after disconnect', () => {
      const doc = new Document();
      const div1 = doc.createElement('div');
      const div2 = doc.createElement('span');
      const received: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div1);
      observer.observe(div2);
      observer.disconnect();

      triggerIntersection(observer, [
        { target: div1, isIntersecting: true },
        { target: div2, isIntersecting: false },
      ]);

      assert.strictEqual(received.length, 0);
    });
  });

  describe('triggerIntersection fires callback with correct entries', () => {
    it('should auto-fill defaults for partial entries', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerIntersection(observer, [{ target: div }]);

      assert.strictEqual(received.length, 1);
      const entry = received[0]!;
      // Defaults
      assert.strictEqual(entry.isIntersecting, false);
      assert.strictEqual(entry.intersectionRatio, 0);
      assert.strictEqual(entry.rootBounds, null);
      assert.ok(typeof entry.time === 'number');
      // Default rect values
      assert.strictEqual(entry.boundingClientRect.x, 0);
      assert.strictEqual(entry.boundingClientRect.y, 0);
      assert.strictEqual(entry.boundingClientRect.width, 0);
      assert.strictEqual(entry.intersectionRect.x, 0);
      observer.disconnect();
    });

    it('should use provided values over defaults', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerIntersection(observer, [
        {
          target: div,
          isIntersecting: true,
          intersectionRatio: 0.75,
          boundingClientRect: { width: 100, height: 200 },
          intersectionRect: { width: 75, height: 200 },
          rootBounds: { width: 1024, height: 768 },
          time: 12345,
        },
      ]);

      const entry = received[0]!;
      assert.strictEqual(entry.isIntersecting, true);
      assert.strictEqual(entry.intersectionRatio, 0.75);
      assert.strictEqual(entry.boundingClientRect.width, 100);
      assert.strictEqual(entry.boundingClientRect.height, 200);
      assert.strictEqual(entry.boundingClientRect.x, 0); // default for unset
      assert.strictEqual(entry.intersectionRect.width, 75);
      assert.ok(entry.rootBounds !== null);
      assert.strictEqual(entry.rootBounds!.width, 1024);
      assert.strictEqual(entry.time, 12345);
      observer.disconnect();
    });

    it('should allow explicit null rootBounds', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerIntersection(observer, [{ target: div, rootBounds: null }]);

      assert.strictEqual(received[0]!.rootBounds, null);
      observer.disconnect();
    });
  });

  describe('entries have all required properties', () => {
    it('should have target, isIntersecting, intersectionRatio, rects, and time', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerIntersection(observer, [
        { target: div, isIntersecting: true, intersectionRatio: 1 },
      ]);

      const entry = received[0]!;
      assert.ok('target' in entry);
      assert.ok('isIntersecting' in entry);
      assert.ok('intersectionRatio' in entry);
      assert.ok('boundingClientRect' in entry);
      assert.ok('intersectionRect' in entry);
      assert.ok('rootBounds' in entry);
      assert.ok('time' in entry);

      // Check rect shape
      const rect = entry.boundingClientRect;
      assert.ok('x' in rect);
      assert.ok('y' in rect);
      assert.ok('width' in rect);
      assert.ok('height' in rect);
      assert.ok('top' in rect);
      assert.ok('right' in rect);
      assert.ok('bottom' in rect);
      assert.ok('left' in rect);
      observer.disconnect();
    });
  });

  describe('takeRecords', () => {
    it('should return pending entries', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const observer = new IntersectionObserver(() => {});
      observer.observe(div);

      triggerIntersection(observer, [{ target: div, isIntersecting: true }]);

      const records = observer.takeRecords();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.target, div);
      assert.strictEqual(records[0]!.isIntersecting, true);
      observer.disconnect();
    });

    it('should clear pending entries after takeRecords', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const observer = new IntersectionObserver(() => {});
      observer.observe(div);

      triggerIntersection(observer, [{ target: div }]);

      const first = observer.takeRecords();
      assert.strictEqual(first.length, 1);

      const second = observer.takeRecords();
      assert.strictEqual(second.length, 0);
      observer.disconnect();
    });
  });

  describe('callback only receives entries for observed targets', () => {
    it('should filter out unobserved targets', () => {
      const doc = new Document();
      const observed = doc.createElement('div');
      const notObserved = doc.createElement('span');
      const received: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(observed);

      triggerIntersection(observer, [
        { target: observed, isIntersecting: true },
        { target: notObserved, isIntersecting: true },
      ]);

      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0]!.target, observed);
      observer.disconnect();
    });

    it('should not fire callback when no entries match observed targets', () => {
      const doc = new Document();
      const notObserved = doc.createElement('div');
      let callbackCalled = false;
      const observer = new IntersectionObserver(() => {
        callbackCalled = true;
      });

      triggerIntersection(observer, [
        { target: notObserved, isIntersecting: true },
      ]);

      assert.strictEqual(callbackCalled, false);
      observer.disconnect();
    });
  });

  describe('observer passes itself to callback', () => {
    it('should pass the observer as the second argument', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      let receivedObserver: IntersectionObserver | null = null;
      const observer = new IntersectionObserver((_entries, obs) => {
        receivedObserver = obs;
      });
      observer.observe(div);

      triggerIntersection(observer, [{ target: div }]);

      assert.strictEqual(receivedObserver, observer);
      observer.disconnect();
    });
  });
});

describe('Functional ResizeObserver', () => {
  describe('observe/unobserve/disconnect lifecycle', () => {
    it('should observe a target and receive entries on trigger', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerResize(observer, [
        { target: div, contentRect: { width: 200, height: 100 } },
      ]);

      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0]!.target, div);
      assert.strictEqual(received[0]!.contentRect.width, 200);
      assert.strictEqual(received[0]!.contentRect.height, 100);
      observer.disconnect();
    });

    it('should stop tracking after unobserve', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);
      observer.unobserve(div);

      triggerResize(observer, [{ target: div, contentRect: { width: 100 } }]);

      assert.strictEqual(received.length, 0);
    });

    it('should stop tracking all after disconnect', () => {
      const doc = new Document();
      const div1 = doc.createElement('div');
      const div2 = doc.createElement('span');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div1);
      observer.observe(div2);
      observer.disconnect();

      triggerResize(observer, [
        { target: div1, contentRect: { width: 100 } },
        { target: div2, contentRect: { width: 200 } },
      ]);

      assert.strictEqual(received.length, 0);
    });
  });

  describe('triggerResize fires callback with correct entries', () => {
    it('should auto-fill defaults for partial entries', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerResize(observer, [{ target: div }]);

      assert.strictEqual(received.length, 1);
      const entry = received[0]!;
      assert.strictEqual(entry.contentRect.x, 0);
      assert.strictEqual(entry.contentRect.y, 0);
      assert.strictEqual(entry.contentRect.width, 0);
      assert.strictEqual(entry.contentRect.height, 0);
      assert.strictEqual(entry.contentRect.top, 0);
      assert.strictEqual(entry.contentRect.right, 0);
      assert.strictEqual(entry.contentRect.bottom, 0);
      assert.strictEqual(entry.contentRect.left, 0);
      observer.disconnect();
    });

    it('should auto-generate borderBoxSize and contentBoxSize from contentRect', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerResize(observer, [
        { target: div, contentRect: { width: 300, height: 400 } },
      ]);

      const entry = received[0]!;
      assert.strictEqual(entry.borderBoxSize.length, 1);
      assert.strictEqual(entry.borderBoxSize[0]!.blockSize, 400);
      assert.strictEqual(entry.borderBoxSize[0]!.inlineSize, 300);
      assert.strictEqual(entry.contentBoxSize.length, 1);
      assert.strictEqual(entry.contentBoxSize[0]!.blockSize, 400);
      assert.strictEqual(entry.contentBoxSize[0]!.inlineSize, 300);
      observer.disconnect();
    });

    it('should accept custom borderBoxSize and contentBoxSize', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerResize(observer, [
        {
          target: div,
          contentRect: { width: 100, height: 100 },
          borderBoxSize: [{ blockSize: 120, inlineSize: 120 }],
          contentBoxSize: [{ blockSize: 100, inlineSize: 100 }],
        },
      ]);

      const entry = received[0]!;
      assert.strictEqual(entry.borderBoxSize[0]!.blockSize, 120);
      assert.strictEqual(entry.borderBoxSize[0]!.inlineSize, 120);
      assert.strictEqual(entry.contentBoxSize[0]!.blockSize, 100);
      assert.strictEqual(entry.contentBoxSize[0]!.inlineSize, 100);
      observer.disconnect();
    });
  });

  describe('entries have all required properties', () => {
    it('should have target, contentRect, borderBoxSize, contentBoxSize', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerResize(observer, [
        { target: div, contentRect: { width: 50, height: 50, x: 10, y: 20 } },
      ]);

      const entry = received[0]!;
      assert.ok('target' in entry);
      assert.ok('contentRect' in entry);
      assert.ok('borderBoxSize' in entry);
      assert.ok('contentBoxSize' in entry);

      const rect = entry.contentRect;
      assert.ok('x' in rect);
      assert.ok('y' in rect);
      assert.ok('width' in rect);
      assert.ok('height' in rect);
      assert.ok('top' in rect);
      assert.ok('right' in rect);
      assert.ok('bottom' in rect);
      assert.ok('left' in rect);
      observer.disconnect();
    });
  });

  describe('callback only receives entries for observed targets', () => {
    it('should filter out unobserved targets', () => {
      const doc = new Document();
      const observed = doc.createElement('div');
      const notObserved = doc.createElement('span');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(observed);

      triggerResize(observer, [
        { target: observed, contentRect: { width: 100 } },
        { target: notObserved, contentRect: { width: 200 } },
      ]);

      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0]!.target, observed);
      observer.disconnect();
    });

    it('should not fire callback when no entries match observed targets', () => {
      const doc = new Document();
      const notObserved = doc.createElement('div');
      let callbackCalled = false;
      const observer = new ResizeObserver(() => {
        callbackCalled = true;
      });

      triggerResize(observer, [
        { target: notObserved, contentRect: { width: 100 } },
      ]);

      assert.strictEqual(callbackCalled, false);
      observer.disconnect();
    });
  });

  describe('legacy single-target triggerResize API', () => {
    it('should still work with the old 3-argument form', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const received: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((entries) => {
        received.push(...entries);
      });
      observer.observe(div);

      triggerResize(observer, div, {
        x: 0,
        y: 0,
        width: 200,
        height: 150,
        top: 0,
        right: 200,
        bottom: 150,
        left: 0,
      });

      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0]!.target, div);
      assert.strictEqual(received[0]!.contentRect.width, 200);
      observer.disconnect();
    });
  });

  describe('observer passes itself to callback', () => {
    it('should pass the observer as the second argument', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      let receivedObserver: ResizeObserver | null = null;
      const observer = new ResizeObserver((_entries, obs) => {
        receivedObserver = obs;
      });
      observer.observe(div);

      triggerResize(observer, [{ target: div, contentRect: { width: 100 } }]);

      assert.strictEqual(receivedObserver, observer);
      observer.disconnect();
    });
  });
});
