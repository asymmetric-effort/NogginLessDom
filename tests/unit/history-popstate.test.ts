import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow } from '../../src/dom/window.js';
import { PopStateEvent } from '../../src/dom/events.js';

describe('History API with popstate events', () => {
  describe('pushState', () => {
    it('does NOT fire popstate', () => {
      const win = createWindow();
      let fired = false;
      win.addEventListener('popstate', () => {
        fired = true;
      });
      win.history.pushState({ page: 1 }, '', '/page1');
      assert.equal(fired, false);
    });

    it('updates state', () => {
      const win = createWindow();
      win.history.pushState({ page: 1 }, '', '/page1');
      assert.deepEqual(win.history.state, { page: 1 });
    });

    it('increases history length', () => {
      const win = createWindow();
      const initialLength = win.history.length;
      win.history.pushState(null, '', '/a');
      assert.equal(win.history.length, initialLength + 1);
    });
  });

  describe('replaceState', () => {
    it('does NOT fire popstate', () => {
      const win = createWindow();
      let fired = false;
      win.addEventListener('popstate', () => {
        fired = true;
      });
      win.history.replaceState({ replaced: true }, '', '/replaced');
      assert.equal(fired, false);
    });

    it('replaces current state', () => {
      const win = createWindow();
      win.history.replaceState({ replaced: true }, '', '/replaced');
      assert.deepEqual(win.history.state, { replaced: true });
    });

    it('does not change length', () => {
      const win = createWindow();
      const len = win.history.length;
      win.history.replaceState(null, '', '/x');
      assert.equal(win.history.length, len);
    });
  });

  describe('back()', () => {
    it('fires popstate with correct state', () => {
      const win = createWindow();
      win.history.pushState({ page: 1 }, '', '/page1');
      win.history.pushState({ page: 2 }, '', '/page2');

      const events: unknown[] = [];
      win.addEventListener('popstate', (e) => {
        events.push((e as PopStateEvent).state);
      });

      win.history.back();
      assert.equal(events.length, 1);
      assert.deepEqual(events[0], { page: 1 });
    });

    it('does not fire popstate when at beginning', () => {
      const win = createWindow();
      let fired = false;
      win.addEventListener('popstate', () => {
        fired = true;
      });
      win.history.back();
      assert.equal(fired, false);
    });
  });

  describe('forward()', () => {
    it('fires popstate with correct state', () => {
      const win = createWindow();
      win.history.pushState({ page: 1 }, '', '/page1');
      win.history.pushState({ page: 2 }, '', '/page2');
      win.history.back(); // go to page1

      const events: unknown[] = [];
      win.addEventListener('popstate', (e) => {
        events.push((e as PopStateEvent).state);
      });

      win.history.forward();
      // events[0] is from back() above? No, we added listener after back()
      assert.equal(events.length, 1);
      assert.deepEqual(events[0], { page: 2 });
    });

    it('does not fire popstate when at end', () => {
      const win = createWindow();
      win.history.pushState(null, '', '/a');
      let count = 0;
      win.addEventListener('popstate', () => {
        count++;
      });
      win.history.forward();
      assert.equal(count, 0);
    });
  });

  describe('go()', () => {
    it('go(-1) navigates back and fires popstate', () => {
      const win = createWindow();
      win.history.pushState({ page: 1 }, '', '/p1');
      win.history.pushState({ page: 2 }, '', '/p2');

      const events: unknown[] = [];
      win.addEventListener('popstate', (e) => {
        events.push((e as PopStateEvent).state);
      });

      win.history.go(-1);
      assert.equal(events.length, 1);
      assert.deepEqual(events[0], { page: 1 });
    });

    it('go(1) navigates forward and fires popstate', () => {
      const win = createWindow();
      win.history.pushState({ a: 1 }, '', '/a');
      win.history.pushState({ b: 2 }, '', '/b');
      win.history.back(); // go to {a: 1}

      const events: unknown[] = [];
      win.addEventListener('popstate', (e) => {
        events.push((e as PopStateEvent).state);
      });

      win.history.go(1);
      assert.equal(events.length, 1);
      assert.deepEqual(events[0], { b: 2 });
    });

    it('go(-2) navigates back two entries', () => {
      const win = createWindow();
      win.history.pushState({ p: 1 }, '', '/1');
      win.history.pushState({ p: 2 }, '', '/2');
      win.history.pushState({ p: 3 }, '', '/3');

      const events: unknown[] = [];
      win.addEventListener('popstate', (e) => {
        events.push((e as PopStateEvent).state);
      });

      win.history.go(-2);
      assert.equal(events.length, 1);
      assert.deepEqual(events[0], { p: 1 });
    });

    it('go(0) does not fire popstate', () => {
      const win = createWindow();
      win.history.pushState(null, '', '/a');
      let fired = false;
      win.addEventListener('popstate', () => {
        fired = true;
      });
      win.history.go(0);
      assert.equal(fired, false);
    });

    it('go beyond bounds does not fire popstate', () => {
      const win = createWindow();
      let fired = false;
      win.addEventListener('popstate', () => {
        fired = true;
      });
      win.history.go(-10);
      assert.equal(fired, false);
      win.history.go(10);
      assert.equal(fired, false);
    });
  });

  describe('PopStateEvent', () => {
    it('has state property', () => {
      const ev = new PopStateEvent('popstate', { state: { test: true } });
      assert.deepEqual(ev.state, { test: true });
    });

    it('state defaults to null', () => {
      const ev = new PopStateEvent('popstate');
      assert.equal(ev.state, null);
    });

    it('has correct type', () => {
      const ev = new PopStateEvent('popstate');
      assert.equal(ev.type, 'popstate');
    });

    it('supports bubbles and cancelable', () => {
      const ev = new PopStateEvent('popstate', {
        bubbles: true,
        cancelable: true,
        state: 42,
      });
      assert.equal(ev.bubbles, true);
      assert.equal(ev.cancelable, true);
      assert.equal(ev.state, 42);
    });
  });
});
