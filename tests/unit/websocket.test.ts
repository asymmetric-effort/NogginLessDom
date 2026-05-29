import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WebSocket,
  WSMessageEvent,
  CloseEvent,
} from '../../src/dom/websocket.js';

describe('WebSocket', () => {
  describe('constructor', () => {
    it('should set url and CONNECTING state', () => {
      const ws = new WebSocket('ws://localhost:8080');
      assert.strictEqual(ws.url, 'ws://localhost:8080');
      assert.strictEqual(ws.readyState, WebSocket.CONNECTING);
    });

    it('should set protocol from string', () => {
      const ws = new WebSocket('ws://localhost', 'graphql-ws');
      assert.strictEqual(ws.protocol, 'graphql-ws');
    });

    it('should set protocol from array', () => {
      const ws = new WebSocket('ws://localhost', ['proto1', 'proto2']);
      assert.strictEqual(ws.protocol, 'proto1');
    });

    it('should have default property values', () => {
      const ws = new WebSocket('ws://localhost');
      assert.strictEqual(ws.bufferedAmount, 0);
      assert.strictEqual(ws.extensions, '');
      assert.strictEqual(ws.binaryType, 'blob');
      assert.strictEqual(ws.onopen, null);
      assert.strictEqual(ws.onmessage, null);
      assert.strictEqual(ws.onclose, null);
      assert.strictEqual(ws.onerror, null);
    });
  });

  describe('static constants', () => {
    it('should have correct state constants', () => {
      assert.strictEqual(WebSocket.CONNECTING, 0);
      assert.strictEqual(WebSocket.OPEN, 1);
      assert.strictEqual(WebSocket.CLOSING, 2);
      assert.strictEqual(WebSocket.CLOSED, 3);
    });
  });

  describe('simulateOpen', () => {
    it('should set readyState to OPEN', () => {
      const ws = new WebSocket('ws://localhost');
      ws.simulateOpen();
      assert.strictEqual(ws.readyState, WebSocket.OPEN);
    });

    it('should fire open event via addEventListener', () => {
      const ws = new WebSocket('ws://localhost');
      let fired = false;
      ws.addEventListener('open', () => {
        fired = true;
      });
      ws.simulateOpen();
      assert.strictEqual(fired, true);
    });

    it('should fire onopen handler', () => {
      const ws = new WebSocket('ws://localhost');
      let fired = false;
      ws.onopen = () => {
        fired = true;
      };
      ws.simulateOpen();
      assert.strictEqual(fired, true);
    });
  });

  describe('send', () => {
    it('should work when OPEN', () => {
      const ws = new WebSocket('ws://localhost');
      ws.simulateOpen();
      assert.doesNotThrow(() => ws.send('hello'));
    });

    it('should throw when not OPEN', () => {
      const ws = new WebSocket('ws://localhost');
      assert.throws(() => ws.send('hello'), {
        message: /Still in CONNECTING state/,
      });
    });

    it('should call handler send if configured', () => {
      const ws = new WebSocket('ws://localhost');
      let sentData = '';
      ws._setHandler({
        send: (data: string) => {
          sentData = data;
        },
      });
      ws.simulateOpen();
      ws.send('test-message');
      assert.strictEqual(sentData, 'test-message');
    });
  });

  describe('simulateMessage', () => {
    it('should fire message event with data via addEventListener', () => {
      const ws = new WebSocket('ws://localhost');
      let receivedData = '';
      ws.addEventListener('message', (event: unknown) => {
        receivedData = (event as WSMessageEvent).data;
      });
      ws.simulateMessage('hello world');
      assert.strictEqual(receivedData, 'hello world');
    });

    it('should fire onmessage handler', () => {
      const ws = new WebSocket('ws://localhost');
      let receivedData = '';
      ws.onmessage = (event) => {
        receivedData = event.data;
      };
      ws.simulateMessage('test data');
      assert.strictEqual(receivedData, 'test data');
    });
  });

  describe('simulateClose', () => {
    it('should set readyState to CLOSED', () => {
      const ws = new WebSocket('ws://localhost');
      ws.simulateOpen();
      ws.simulateClose();
      assert.strictEqual(ws.readyState, WebSocket.CLOSED);
    });

    it('should fire close event with code and reason', () => {
      const ws = new WebSocket('ws://localhost');
      let receivedCode = 0;
      let receivedReason = '';
      ws.addEventListener('close', (event: unknown) => {
        receivedCode = (event as CloseEvent).code;
        receivedReason = (event as CloseEvent).reason;
      });
      ws.simulateClose(1001, 'going away');
      assert.strictEqual(receivedCode, 1001);
      assert.strictEqual(receivedReason, 'going away');
    });

    it('should fire onclose handler', () => {
      const ws = new WebSocket('ws://localhost');
      let fired = false;
      ws.onclose = () => {
        fired = true;
      };
      ws.simulateClose();
      assert.strictEqual(fired, true);
    });

    it('should default code to 1000 and reason to empty', () => {
      const ws = new WebSocket('ws://localhost');
      let receivedCode = -1;
      let receivedReason = 'not-set';
      ws.addEventListener('close', (event: unknown) => {
        receivedCode = (event as CloseEvent).code;
        receivedReason = (event as CloseEvent).reason;
      });
      ws.simulateClose();
      assert.strictEqual(receivedCode, 1000);
      assert.strictEqual(receivedReason, '');
    });
  });

  describe('close', () => {
    it('should transition to CLOSED and fire close event', () => {
      const ws = new WebSocket('ws://localhost');
      ws.simulateOpen();
      let closeFired = false;
      ws.addEventListener('close', () => {
        closeFired = true;
      });
      ws.close();
      assert.strictEqual(ws.readyState, WebSocket.CLOSED);
      assert.strictEqual(closeFired, true);
    });

    it('should pass code and reason', () => {
      const ws = new WebSocket('ws://localhost');
      ws.simulateOpen();
      let receivedCode = 0;
      ws.addEventListener('close', (event: unknown) => {
        receivedCode = (event as CloseEvent).code;
      });
      ws.close(1001, 'bye');
      assert.strictEqual(receivedCode, 1001);
    });

    it('should be a no-op if already CLOSED', () => {
      const ws = new WebSocket('ws://localhost');
      ws.simulateClose();
      let closeFired = false;
      ws.addEventListener('close', () => {
        closeFired = true;
      });
      ws.close();
      assert.strictEqual(closeFired, false);
    });
  });

  describe('addEventListener/removeEventListener', () => {
    it('should add and fire multiple listeners', () => {
      const ws = new WebSocket('ws://localhost');
      let count = 0;
      const listener1 = (): void => {
        count++;
      };
      const listener2 = (): void => {
        count++;
      };
      ws.addEventListener('open', listener1);
      ws.addEventListener('open', listener2);
      ws.simulateOpen();
      assert.strictEqual(count, 2);
    });

    it('should remove a listener', () => {
      const ws = new WebSocket('ws://localhost');
      let count = 0;
      const listener = (): void => {
        count++;
      };
      ws.addEventListener('open', listener);
      ws.removeEventListener('open', listener);
      ws.simulateOpen();
      assert.strictEqual(count, 0);
    });

    it('should handle removing non-existent listener', () => {
      const ws = new WebSocket('ws://localhost');
      assert.doesNotThrow(() => ws.removeEventListener('open', () => {}));
    });

    it('should handle removing from non-existent type', () => {
      const ws = new WebSocket('ws://localhost');
      assert.doesNotThrow(() =>
        ws.removeEventListener('nonexistent', () => {}),
      );
    });
  });

  describe('simulateError', () => {
    it('should fire error event via addEventListener', () => {
      const ws = new WebSocket('ws://localhost');
      let fired = false;
      ws.addEventListener('error', () => {
        fired = true;
      });
      ws.simulateError();
      assert.strictEqual(fired, true);
    });

    it('should fire onerror handler', () => {
      const ws = new WebSocket('ws://localhost');
      let fired = false;
      ws.onerror = () => {
        fired = true;
      };
      ws.simulateError(new Error('connection failed'));
      assert.strictEqual(fired, true);
    });
  });

  describe('WSMessageEvent', () => {
    it('should have data property', () => {
      const event = new WSMessageEvent('message', { data: 'hello' });
      assert.strictEqual(event.data, 'hello');
      assert.strictEqual(event.type, 'message');
    });

    it('should default data to empty string', () => {
      const event = new WSMessageEvent('message');
      assert.strictEqual(event.data, '');
    });
  });

  describe('CloseEvent', () => {
    it('should have code, reason, and wasClean', () => {
      const event = new CloseEvent('close', {
        code: 1001,
        reason: 'going away',
        wasClean: false,
      });
      assert.strictEqual(event.code, 1001);
      assert.strictEqual(event.reason, 'going away');
      assert.strictEqual(event.wasClean, false);
    });

    it('should have defaults', () => {
      const event = new CloseEvent('close');
      assert.strictEqual(event.code, 1000);
      assert.strictEqual(event.reason, '');
      assert.strictEqual(event.wasClean, true);
    });
  });

  describe('property-based handlers', () => {
    it('should fire onopen when set', () => {
      const ws = new WebSocket('ws://localhost');
      const events: string[] = [];
      ws.onopen = () => events.push('open');
      ws.simulateOpen();
      assert.deepStrictEqual(events, ['open']);
    });

    it('should fire onmessage when set', () => {
      const ws = new WebSocket('ws://localhost');
      const events: string[] = [];
      ws.onmessage = (e) => events.push(e.data);
      ws.simulateMessage('hi');
      assert.deepStrictEqual(events, ['hi']);
    });

    it('should fire onclose when set', () => {
      const ws = new WebSocket('ws://localhost');
      const events: number[] = [];
      ws.onclose = (e) => events.push(e.code);
      ws.simulateClose(1000);
      assert.deepStrictEqual(events, [1000]);
    });

    it('should fire onerror when set', () => {
      const ws = new WebSocket('ws://localhost');
      const events: string[] = [];
      ws.onerror = () => events.push('error');
      ws.simulateError();
      assert.deepStrictEqual(events, ['error']);
    });
  });
});
