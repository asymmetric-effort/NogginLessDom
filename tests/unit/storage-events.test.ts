import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow, Storage } from '../../src/dom/window.js';
import { StorageEvent } from '../../src/dom/events.js';

describe('StorageEvent dispatch and quota enforcement', () => {
  describe('setItem dispatches StorageEvent', () => {
    it('should dispatch StorageEvent with correct key, oldValue, newValue', () => {
      const win = createWindow();
      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.setItem('color', 'red');
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0]!.key, 'color');
      assert.strictEqual(events[0]!.oldValue, null);
      assert.strictEqual(events[0]!.newValue, 'red');
    });

    it('should dispatch StorageEvent with oldValue on update', () => {
      const win = createWindow();
      win.localStorage.setItem('color', 'red');

      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.setItem('color', 'blue');
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0]!.key, 'color');
      assert.strictEqual(events[0]!.oldValue, 'red');
      assert.strictEqual(events[0]!.newValue, 'blue');
    });
  });

  describe('setItem with same value does NOT dispatch event', () => {
    it('should not dispatch when value is unchanged', () => {
      const win = createWindow();
      win.localStorage.setItem('color', 'red');

      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.setItem('color', 'red');
      assert.strictEqual(events.length, 0);
    });
  });

  describe('removeItem dispatches StorageEvent', () => {
    it('should dispatch with newValue: null', () => {
      const win = createWindow();
      win.localStorage.setItem('color', 'red');

      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.removeItem('color');
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0]!.key, 'color');
      assert.strictEqual(events[0]!.oldValue, 'red');
      assert.strictEqual(events[0]!.newValue, null);
    });

    it('should not dispatch when removing non-existent key', () => {
      const win = createWindow();

      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.removeItem('missing');
      assert.strictEqual(events.length, 0);
    });
  });

  describe('clear dispatches StorageEvent', () => {
    it('should dispatch with null key/oldValue/newValue', () => {
      const win = createWindow();
      win.localStorage.setItem('a', '1');
      win.localStorage.setItem('b', '2');

      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.clear();
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0]!.key, null);
      assert.strictEqual(events[0]!.oldValue, null);
      assert.strictEqual(events[0]!.newValue, null);
    });

    it('should not dispatch when storage is already empty', () => {
      const win = createWindow();

      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.clear();
      assert.strictEqual(events.length, 0);
    });
  });

  describe('StorageEvent has correct storageArea reference', () => {
    it('should reference localStorage when triggered by localStorage', () => {
      const win = createWindow();
      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.setItem('x', '1');
      assert.strictEqual(events[0]!.storageArea, win.localStorage);
    });

    it('should reference sessionStorage when triggered by sessionStorage', () => {
      const win = createWindow();
      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.sessionStorage.setItem('x', '1');
      assert.strictEqual(events[0]!.storageArea, win.sessionStorage);
    });
  });

  describe('Event listeners on window receive storage events', () => {
    it('should receive events with correct type', () => {
      const win = createWindow();
      let received = false;
      win.addEventListener('storage', (e) => {
        assert.strictEqual(e.type, 'storage');
        received = true;
      });

      win.localStorage.setItem('test', 'value');
      assert.ok(received);
    });

    it('should include url from window.location', () => {
      const win = createWindow();
      win.location.href = 'http://example.com/page';

      const events: StorageEvent[] = [];
      win.addEventListener('storage', (e) => events.push(e as StorageEvent));

      win.localStorage.setItem('k', 'v');
      assert.strictEqual(events[0]!.url, 'http://example.com/page');
    });
  });

  describe('Quota enforcement throws QuotaExceededError', () => {
    it('should throw QuotaExceededError when quota is exceeded', () => {
      // Create a storage with a tiny quota: 20 bytes
      const storage = new Storage(20);
      // key "a" (1 char) + value "b" (1 char) = 4 bytes — fits
      storage.setItem('a', 'b');
      // key "c" (1 char) + value with 10 chars = 22 bytes — over quota with existing 4
      assert.throws(
        () => storage.setItem('c', '0123456789'),
        (err: Error) => {
          assert.strictEqual(err.name, 'QuotaExceededError');
          return true;
        },
      );
    });

    it('should not throw when updating existing key within quota', () => {
      // 20 bytes quota
      const storage = new Storage(20);
      // key "ab" (2 chars) + value "cd" (2 chars) = 8 bytes
      storage.setItem('ab', 'cd');
      // Update: key "ab" (2 chars) + value "efgh" (4 chars) = 12 bytes total
      assert.doesNotThrow(() => storage.setItem('ab', 'efgh'));
    });

    it('should throw on default 5MB quota', () => {
      const storage = new Storage();
      // Fill up to near 5MB then try to go over
      // 5MB = 5242880 bytes / 2 = 2621440 chars total (key + value)
      // We'll create a key of length 1 and value near the limit
      const bigValue = 'x'.repeat(2621439); // key "k" (1) + value (2621439) = 2621440 chars = 5242880 bytes = exactly 5MB
      storage.setItem('k', bigValue);
      // Now adding one more byte should fail
      assert.throws(
        () => storage.setItem('z', '1'),
        (err: Error) => {
          assert.strictEqual(err.name, 'QuotaExceededError');
          return true;
        },
      );
    });
  });

  describe('Quota calculation counts key + value bytes', () => {
    it('should count both key and value lengths times 2 for UTF-16', () => {
      // 40 bytes quota
      const storage = new Storage(40);
      // key "hello" (5 chars) + value "world" (5 chars) = 10 chars = 20 bytes
      storage.setItem('hello', 'world');
      // key "foo" (3 chars) + value "bar" (3 chars) = 6 chars = 12 bytes
      // Total would be 32 bytes — fits
      storage.setItem('foo', 'bar');
      // key "x" (1 char) + value "12345" (5 chars) = 6 chars = 12 bytes
      // Total would be 32 + 12 = 44 bytes — over 40
      assert.throws(
        () => storage.setItem('x', '12345'),
        (err: Error) => {
          assert.strictEqual(err.name, 'QuotaExceededError');
          return true;
        },
      );
    });
  });

  describe('Existing Storage API behavior unchanged', () => {
    it('should support getItem, setItem, removeItem, clear, key, length', () => {
      const win = createWindow();
      const s = win.localStorage;

      assert.strictEqual(s.length, 0);
      assert.strictEqual(s.getItem('x'), null);

      s.setItem('x', 'hello');
      assert.strictEqual(s.length, 1);
      assert.strictEqual(s.getItem('x'), 'hello');
      assert.strictEqual(s.key(0), 'x');
      assert.strictEqual(s.key(1), null);

      s.removeItem('x');
      assert.strictEqual(s.length, 0);
      assert.strictEqual(s.getItem('x'), null);

      s.setItem('a', '1');
      s.setItem('b', '2');
      s.clear();
      assert.strictEqual(s.length, 0);
    });

    it('should coerce value to string', () => {
      const win = createWindow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      win.localStorage.setItem('num', 42 as any);
      assert.strictEqual(win.localStorage.getItem('num'), '42');
    });

    it('should work with sessionStorage independently', () => {
      const win = createWindow();
      win.localStorage.setItem('key', 'local');
      win.sessionStorage.setItem('key', 'session');
      assert.strictEqual(win.localStorage.getItem('key'), 'local');
      assert.strictEqual(win.sessionStorage.getItem('key'), 'session');
    });
  });

  describe('StorageEvent constructor defaults', () => {
    it('should have null defaults for all optional properties', () => {
      const event = new StorageEvent('storage');
      assert.strictEqual(event.key, null);
      assert.strictEqual(event.oldValue, null);
      assert.strictEqual(event.newValue, null);
      assert.strictEqual(event.url, '');
      assert.strictEqual(event.storageArea, null);
      assert.strictEqual(event.type, 'storage');
    });

    it('should accept all init properties', () => {
      const storage = new Storage();
      const event = new StorageEvent('storage', {
        key: 'myKey',
        oldValue: 'old',
        newValue: 'new',
        url: 'http://example.com',
        storageArea: storage,
      });
      assert.strictEqual(event.key, 'myKey');
      assert.strictEqual(event.oldValue, 'old');
      assert.strictEqual(event.newValue, 'new');
      assert.strictEqual(event.url, 'http://example.com');
      assert.strictEqual(event.storageArea, storage);
    });

    it('should support bubbles and cancelable options', () => {
      const event = new StorageEvent('storage', {
        bubbles: true,
        cancelable: true,
      });
      assert.strictEqual(event.bubbles, true);
      assert.strictEqual(event.cancelable, true);
    });
  });

  describe('Storage without window does not throw', () => {
    it('should work without window reference (no event dispatch)', () => {
      const storage = new Storage();
      assert.doesNotThrow(() => storage.setItem('a', '1'));
      assert.doesNotThrow(() => storage.removeItem('a'));
      assert.doesNotThrow(() => storage.clear());
    });
  });
});
