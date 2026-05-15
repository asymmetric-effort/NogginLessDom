import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';
import {
  ResizeObserver,
  triggerResize,
  ResizeObserverEntry,
} from '../../src/dom/resize-observer.js';
import {
  IntersectionObserver,
  triggerIntersection,
  IntersectionObserverEntry,
} from '../../src/dom/intersection-observer.js';

describe('ResizeObserver', () => {
  describe('constructor', () => {
    it('should create a ResizeObserver with a callback', () => {
      const observer = new ResizeObserver(() => {});
      assert.ok(observer instanceof ResizeObserver);
    });
  });

  describe('observe and unobserve', () => {
    it('should observe a target element', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const observer = new ResizeObserver(() => {});
      observer.observe(div);
      observer.disconnect();
    });

    it('should unobserve a target element', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const observer = new ResizeObserver(() => {});
      observer.observe(div);
      observer.unobserve(div);
      observer.disconnect();
    });
  });

  describe('disconnect', () => {
    it('should stop observing all targets', () => {
      const doc = new Document();
      const div1 = doc.createElement('div');
      const div2 = doc.createElement('div');
      const entries: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((e) => {
        entries.push(...e);
      });
      observer.observe(div1);
      observer.observe(div2);
      observer.disconnect();

      // After disconnect, triggerResize should not fire callback
      triggerResize(observer, div1, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
      });
      assert.strictEqual(entries.length, 0);
    });
  });

  describe('triggerResize test helper', () => {
    it('should fire the callback with resize entries', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const entries: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((e) => {
        entries.push(...e);
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

      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0]!.target, div);
      assert.strictEqual(entries[0]!.contentRect.width, 200);
      assert.strictEqual(entries[0]!.contentRect.height, 150);
      observer.disconnect();
    });

    it('should include borderBoxSize and contentBoxSize', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const entries: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((e) => {
        entries.push(...e);
      });
      observer.observe(div);

      triggerResize(observer, div, {
        x: 10,
        y: 20,
        width: 300,
        height: 400,
        top: 20,
        right: 310,
        bottom: 420,
        left: 10,
      });

      assert.strictEqual(entries[0]!.borderBoxSize.length, 1);
      assert.strictEqual(entries[0]!.borderBoxSize[0]!.blockSize, 400);
      assert.strictEqual(entries[0]!.borderBoxSize[0]!.inlineSize, 300);
      assert.strictEqual(entries[0]!.contentBoxSize.length, 1);
      assert.strictEqual(entries[0]!.contentBoxSize[0]!.blockSize, 400);
      assert.strictEqual(entries[0]!.contentBoxSize[0]!.inlineSize, 300);
      observer.disconnect();
    });

    it('should not fire for unobserved targets', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const other = doc.createElement('span');
      const entries: ResizeObserverEntry[] = [];
      const observer = new ResizeObserver((e) => {
        entries.push(...e);
      });
      observer.observe(div);

      triggerResize(observer, other, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
      });

      assert.strictEqual(entries.length, 0);
      observer.disconnect();
    });
  });
});

describe('IntersectionObserver', () => {
  describe('constructor', () => {
    it('should create an IntersectionObserver with a callback', () => {
      const observer = new IntersectionObserver(() => {});
      assert.ok(observer instanceof IntersectionObserver);
    });

    it('should accept options', () => {
      const doc = new Document();
      const root = doc.createElement('div');
      const observer = new IntersectionObserver(() => {}, {
        root,
        rootMargin: '10px',
        threshold: 0.5,
      });
      assert.strictEqual(observer.root, root);
      assert.strictEqual(observer.rootMargin, '10px');
      assert.deepStrictEqual(observer.thresholds, [0.5]);
      observer.disconnect();
    });

    it('should accept array of thresholds', () => {
      const observer = new IntersectionObserver(() => {}, {
        threshold: [0, 0.25, 0.5, 0.75, 1],
      });
      assert.deepStrictEqual(observer.thresholds, [0, 0.25, 0.5, 0.75, 1]);
      observer.disconnect();
    });

    it('should default threshold to [0]', () => {
      const observer = new IntersectionObserver(() => {});
      assert.deepStrictEqual(observer.thresholds, [0]);
      observer.disconnect();
    });

    it('should default rootMargin to 0px', () => {
      const observer = new IntersectionObserver(() => {});
      assert.strictEqual(observer.rootMargin, '0px');
      observer.disconnect();
    });
  });

  describe('observe and unobserve', () => {
    it('should observe a target element', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const observer = new IntersectionObserver(() => {});
      observer.observe(div);
      observer.disconnect();
    });

    it('should unobserve a target element', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const observer = new IntersectionObserver(() => {});
      observer.observe(div);
      observer.unobserve(div);
      observer.disconnect();
    });
  });

  describe('disconnect', () => {
    it('should stop observing all targets', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const entries: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((e) => {
        entries.push(...e);
      });
      observer.observe(div);
      observer.disconnect();

      triggerIntersection(observer, [
        {
          target: div,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            top: 0,
            right: 100,
            bottom: 100,
            left: 0,
          },
          intersectionRect: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            top: 0,
            right: 100,
            bottom: 100,
            left: 0,
          },
          rootBounds: {
            x: 0,
            y: 0,
            width: 1024,
            height: 768,
            top: 0,
            right: 1024,
            bottom: 768,
            left: 0,
          },
        },
      ]);
      assert.strictEqual(entries.length, 0);
    });
  });

  describe('triggerIntersection test helper', () => {
    it('should fire the callback with intersection entries', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const entries: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((e) => {
        entries.push(...e);
      });
      observer.observe(div);

      triggerIntersection(observer, [
        {
          target: div,
          isIntersecting: true,
          intersectionRatio: 0.75,
          boundingClientRect: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            top: 0,
            right: 100,
            bottom: 100,
            left: 0,
          },
          intersectionRect: {
            x: 0,
            y: 0,
            width: 75,
            height: 100,
            top: 0,
            right: 75,
            bottom: 100,
            left: 0,
          },
          rootBounds: {
            x: 0,
            y: 0,
            width: 1024,
            height: 768,
            top: 0,
            right: 1024,
            bottom: 768,
            left: 0,
          },
        },
      ]);

      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0]!.target, div);
      assert.strictEqual(entries[0]!.isIntersecting, true);
      assert.strictEqual(entries[0]!.intersectionRatio, 0.75);
      assert.strictEqual(entries[0]!.boundingClientRect.width, 100);
      assert.strictEqual(entries[0]!.intersectionRect.width, 75);
      observer.disconnect();
    });

    it('should not fire for targets that are not observed', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const other = doc.createElement('span');
      const entries: IntersectionObserverEntry[] = [];
      const observer = new IntersectionObserver((e) => {
        entries.push(...e);
      });
      observer.observe(div);

      triggerIntersection(observer, [
        {
          target: other,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            top: 0,
            right: 100,
            bottom: 100,
            left: 0,
          },
          intersectionRect: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            top: 0,
            right: 100,
            bottom: 100,
            left: 0,
          },
          rootBounds: {
            x: 0,
            y: 0,
            width: 1024,
            height: 768,
            top: 0,
            right: 1024,
            bottom: 768,
            left: 0,
          },
        },
      ]);

      assert.strictEqual(entries.length, 0);
      observer.disconnect();
    });
  });
});
