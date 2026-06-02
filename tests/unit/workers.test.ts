import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Worker,
  SharedWorker,
  MessagePort,
  ServiceWorkerContainer,
  ServiceWorker,
  ServiceWorkerRegistration,
} from '../../src/dom/workers.js';
import { MessageEvent, ErrorEvent } from '../../src/dom/events.js';
import { Window, createWindow } from '../../src/dom/window.js';

describe('Web Workers simulation', () => {
  describe('Worker', () => {
    it('should construct with a URL string', () => {
      const worker = new Worker('worker.js');
      assert.equal(worker.url, 'worker.js');
      assert.equal(worker.type, 'classic');
      assert.equal(worker.name, '');
    });

    it('should construct with a URL object', () => {
      const url = new URL('https://example.com/worker.js');
      const worker = new Worker(url);
      assert.equal(worker.url, url);
    });

    it('should construct with options', () => {
      const worker = new Worker('worker.js', {
        type: 'module',
        name: 'my-worker',
      });
      assert.equal(worker.type, 'module');
      assert.equal(worker.name, 'my-worker');
    });

    it('should allow postMessage', () => {
      const worker = new Worker('worker.js');
      // Should not throw
      worker.postMessage({ hello: 'world' });
      worker.postMessage('data', []);
    });

    it('should terminate and prevent further messages', () => {
      const worker = new Worker('worker.js');
      worker.terminate();
      assert.equal(worker._isTerminated, true);
    });

    it('should not fire simulateMessage after terminate', () => {
      const worker = new Worker('worker.js');
      let called = false;
      worker.onmessage = () => {
        called = true;
      };
      worker.terminate();
      worker.simulateMessage('test');
      assert.equal(called, false);
    });

    it('should not fire simulateError after terminate', () => {
      const worker = new Worker('worker.js');
      let called = false;
      worker.onerror = () => {
        called = true;
      };
      worker.terminate();
      worker.simulateError(new Error('test'));
      assert.equal(called, false);
    });

    describe('simulateMessage', () => {
      it('should fire onmessage handler', () => {
        const worker = new Worker('worker.js');
        let received: unknown = null;
        worker.onmessage = (event: MessageEvent) => {
          received = event.data;
        };
        worker.simulateMessage({ value: 42 });
        assert.deepEqual(received, { value: 42 });
      });

      it('should fire addEventListener listeners', () => {
        const worker = new Worker('worker.js');
        const messages: unknown[] = [];
        worker.addEventListener('message', (event: unknown) => {
          messages.push((event as MessageEvent).data);
        });
        worker.simulateMessage('hello');
        assert.deepEqual(messages, ['hello']);
      });

      it('should fire both onmessage and addEventListener', () => {
        const worker = new Worker('worker.js');
        const calls: string[] = [];
        worker.onmessage = () => {
          calls.push('onmessage');
        };
        worker.addEventListener('message', () => {
          calls.push('addEventListener');
        });
        worker.simulateMessage('data');
        assert.deepEqual(calls, ['onmessage', 'addEventListener']);
      });
    });

    describe('simulateError', () => {
      it('should fire onerror handler', () => {
        const worker = new Worker('worker.js');
        let errorMsg = '';
        worker.onerror = (event: ErrorEvent) => {
          errorMsg = event.message;
        };
        worker.simulateError(new Error('test error'));
        assert.equal(errorMsg, 'test error');
      });

      it('should fire addEventListener error listeners', () => {
        const worker = new Worker('worker.js');
        let errorMsg = '';
        worker.addEventListener('error', (event: unknown) => {
          errorMsg = (event as ErrorEvent).message;
        });
        worker.simulateError(new Error('addEventListener error'));
        assert.equal(errorMsg, 'addEventListener error');
      });
    });

    describe('addEventListener/removeEventListener', () => {
      it('should add and remove listeners', () => {
        const worker = new Worker('worker.js');
        const calls: string[] = [];
        const listener = (): void => {
          calls.push('called');
        };
        worker.addEventListener('message', listener);
        worker.simulateMessage('test');
        assert.equal(calls.length, 1);

        worker.removeEventListener('message', listener);
        worker.simulateMessage('test2');
        assert.equal(calls.length, 1);
      });

      it('should handle removing non-existent listener', () => {
        const worker = new Worker('worker.js');
        // Should not throw
        worker.removeEventListener('message', () => {});
        worker.removeEventListener('nonexistent', () => {});
      });
    });

    it('should have null onmessageerror by default', () => {
      const worker = new Worker('worker.js');
      assert.equal(worker.onmessageerror, null);
    });

    it('should not fire postMessage after terminate', () => {
      const worker = new Worker('worker.js');
      worker.terminate();
      // Should not throw
      worker.postMessage('test');
    });
  });

  describe('MessagePort', () => {
    it('should have null onmessage by default', () => {
      const port = new MessagePort();
      assert.equal(port.onmessage, null);
      assert.equal(port.onmessageerror, null);
    });

    it('should allow postMessage', () => {
      const port = new MessagePort();
      port.postMessage('data');
    });

    it('should not postMessage after close', () => {
      const port = new MessagePort();
      port.close();
      assert.equal(port._isClosed, true);
      // Should not throw
      port.postMessage('data');
    });

    it('should start the port', () => {
      const port = new MessagePort();
      assert.equal(port._isStarted, false);
      port.start();
      assert.equal(port._isStarted, true);
    });

    it('should simulateMessage and fire onmessage', () => {
      const port = new MessagePort();
      let received: unknown = null;
      port.onmessage = (event: MessageEvent) => {
        received = event.data;
      };
      port.simulateMessage('hello');
      assert.equal(received, 'hello');
    });

    it('should simulateMessage and fire addEventListener listeners', () => {
      const port = new MessagePort();
      const msgs: unknown[] = [];
      port.addEventListener('message', (event: unknown) => {
        msgs.push((event as MessageEvent).data);
      });
      port.simulateMessage('test');
      assert.deepEqual(msgs, ['test']);
    });

    it('should add and remove listeners', () => {
      const port = new MessagePort();
      const calls: string[] = [];
      const listener = (): void => {
        calls.push('called');
      };
      port.addEventListener('message', listener);
      port.simulateMessage('x');
      assert.equal(calls.length, 1);

      port.removeEventListener('message', listener);
      port.simulateMessage('y');
      assert.equal(calls.length, 1);
    });

    it('should handle removing non-existent listener', () => {
      const port = new MessagePort();
      port.removeEventListener('message', () => {});
      port.removeEventListener('nonexistent', () => {});
    });
  });

  describe('SharedWorker', () => {
    it('should construct with URL and have port', () => {
      const sw = new SharedWorker('shared-worker.js');
      assert.equal(sw.url, 'shared-worker.js');
      assert.ok(sw.port instanceof MessagePort);
      assert.equal(sw.name, '');
    });

    it('should accept string options as name', () => {
      const sw = new SharedWorker('shared-worker.js', 'my-name');
      assert.equal(sw.name, 'my-name');
    });

    it('should accept object options', () => {
      const sw = new SharedWorker('shared-worker.js', {
        type: 'module',
        name: 'obj-name',
      });
      assert.equal(sw.name, 'obj-name');
    });

    it('should have null onerror by default', () => {
      const sw = new SharedWorker('shared-worker.js');
      assert.equal(sw.onerror, null);
    });

    it('should allow communication through port', () => {
      const sw = new SharedWorker('shared-worker.js');
      let received: unknown = null;
      sw.port.onmessage = (event: MessageEvent) => {
        received = event.data;
      };
      sw.port.simulateMessage('shared-data');
      assert.equal(received, 'shared-data');
    });
  });

  describe('ServiceWorker', () => {
    it('should have scriptURL and state', () => {
      const sw = new ServiceWorker('/sw.js');
      assert.equal(sw.scriptURL, '/sw.js');
      assert.equal(sw.state, 'activated');
    });

    it('should have null onstatechange by default', () => {
      const sw = new ServiceWorker('/sw.js');
      assert.equal(sw.onstatechange, null);
    });

    it('should allow postMessage', () => {
      const sw = new ServiceWorker('/sw.js');
      sw.postMessage({ action: 'skip-waiting' });
    });

    it('should support addEventListener/removeEventListener', () => {
      const sw = new ServiceWorker('/sw.js');
      const listener = (): void => {};
      sw.addEventListener('statechange', listener);
      sw.removeEventListener('statechange', listener);
    });

    it('should handle removing non-existent listener', () => {
      const sw = new ServiceWorker('/sw.js');
      sw.removeEventListener('statechange', () => {});
      sw.removeEventListener('nonexistent', () => {});
    });
  });

  describe('ServiceWorkerRegistration', () => {
    it('should have active worker and scope', () => {
      const sw = new ServiceWorker('/sw.js');
      const reg = new ServiceWorkerRegistration(sw, '/');
      assert.equal(reg.active, sw);
      assert.equal(reg.scope, '/');
    });

    it('should unregister', async () => {
      const sw = new ServiceWorker('/sw.js');
      const reg = new ServiceWorkerRegistration(sw, '/');
      const result = await reg.unregister();
      assert.equal(result, true);
      assert.equal(reg._isUnregistered, true);
    });

    it('should update without error', async () => {
      const sw = new ServiceWorker('/sw.js');
      const reg = new ServiceWorkerRegistration(sw, '/');
      await reg.update();
    });
  });

  describe('ServiceWorkerContainer', () => {
    it('should have null controller by default', () => {
      const container = new ServiceWorkerContainer();
      assert.equal(container.controller, null);
    });

    it('should register a service worker', async () => {
      const container = new ServiceWorkerContainer();
      const reg = await container.register('/sw.js');
      assert.ok(reg instanceof ServiceWorkerRegistration);
      assert.equal(reg.scope, '/');
      assert.ok(reg.active instanceof ServiceWorker);
      assert.equal(reg.active.scriptURL, '/sw.js');
    });

    it('should register with custom scope', async () => {
      const container = new ServiceWorkerContainer();
      const reg = await container.register('/sw.js', { scope: '/app/' });
      assert.equal(reg.scope, '/app/');
    });

    it('should resolve ready promise after first registration', async () => {
      const container = new ServiceWorkerContainer();
      const reg = await container.register('/sw.js');
      const readyReg = await container.ready;
      assert.equal(readyReg, reg);
    });

    it('should getRegistration by scope', async () => {
      const container = new ServiceWorkerContainer();
      await container.register('/sw.js', { scope: '/app/' });
      const reg = await container.getRegistration('/app/');
      assert.ok(reg !== undefined);
      assert.equal(reg!.scope, '/app/');
    });

    it('should return undefined for unregistered scope', async () => {
      const container = new ServiceWorkerContainer();
      const reg = await container.getRegistration('/unknown/');
      assert.equal(reg, undefined);
    });

    it('should getRegistration with default scope', async () => {
      const container = new ServiceWorkerContainer();
      await container.register('/sw.js');
      const reg = await container.getRegistration();
      assert.ok(reg !== undefined);
    });

    it('should getRegistrations returning all registrations', async () => {
      const container = new ServiceWorkerContainer();
      await container.register('/sw1.js', { scope: '/a/' });
      await container.register('/sw2.js', { scope: '/b/' });
      const regs = await container.getRegistrations();
      assert.equal(regs.length, 2);
    });
  });

  describe('Window integration', () => {
    it('should have Worker on window', () => {
      const win = new Window();
      assert.equal(win.Worker, Worker);
    });

    it('should have SharedWorker on window', () => {
      const win = new Window();
      assert.equal(win.SharedWorker, SharedWorker);
    });

    it('should have navigator.serviceWorker', () => {
      const win = new Window();
      assert.ok(win.navigator.serviceWorker instanceof ServiceWorkerContainer);
    });

    it('should register and retrieve service worker from navigator', async () => {
      const win = createWindow();
      const reg = await win.navigator.serviceWorker.register('/sw.js');
      assert.ok(reg instanceof ServiceWorkerRegistration);
      const retrieved = await win.navigator.serviceWorker.getRegistration('/');
      assert.equal(retrieved, reg);
    });
  });
});
