/**
 * WebSocket simulation for DOM testing.
 * @module dom/websocket
 */

import { Event } from './index.js';

/**
 * WebSocket handler type for configuring simulated responses.
 */
export type WebSocketHandler = {
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  send?: (data: string) => void;
};

/** Event listener function type. */
type EventListener = (...args: unknown[]) => void;

/**
 * MessageEvent for WebSocket messages.
 */
export class WSMessageEvent extends Event {
  readonly data: string;

  constructor(type: string, init?: { data?: string }) {
    super(type);
    this.data = init?.data ?? '';
  }
}

/**
 * CloseEvent for WebSocket close notifications.
 */
export class CloseEvent extends Event {
  readonly code: number;
  readonly reason: string;
  readonly wasClean: boolean;

  constructor(
    type: string,
    init?: { code?: number; reason?: string; wasClean?: boolean },
  ) {
    super(type);
    this.code = init?.code ?? 1000;
    this.reason = init?.reason ?? '';
    this.wasClean = init?.wasClean ?? true;
  }
}

/**
 * WebSocket stub \u2014 simulates WebSocket behavior for testing.
 */
export class WebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState: number = WebSocket.CONNECTING;
  url: string;
  protocol: string = '';
  bufferedAmount: number = 0;
  extensions: string = '';
  binaryType: string = 'blob';

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: WSMessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private _listeners: Map<string, EventListener[]> = new Map();
  private _handler: WebSocketHandler | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    if (typeof protocols === 'string') {
      this.protocol = protocols;
    } else if (Array.isArray(protocols) && protocols.length > 0) {
      this.protocol = protocols[0]!;
    }
  }

  send(data: string): void {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error(
        "Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.",
      );
    }
    if (this._handler?.send) {
      this._handler.send(data);
    }
  }

  close(code?: number, reason?: string): void {
    if (
      this.readyState === WebSocket.CLOSING ||
      this.readyState === WebSocket.CLOSED
    ) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    const closeCode = code ?? 1000;
    const closeReason = reason ?? '';
    this.readyState = WebSocket.CLOSED;
    const event = new CloseEvent('close', {
      code: closeCode,
      reason: closeReason,
      wasClean: true,
    });
    this._fireEvent('close', event);
    if (this.onclose) {
      this.onclose(event);
    }
    if (this._handler?.onClose) {
      this._handler.onClose(closeCode, closeReason);
    }
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    }
  }

  /** @internal Configure a handler for this WebSocket. */
  _setHandler(handler: WebSocketHandler): void {
    this._handler = handler;
  }

  simulateOpen(): void {
    this.readyState = WebSocket.OPEN;
    const event = new Event('open');
    this._fireEvent('open', event);
    if (this.onopen) {
      this.onopen(event);
    }
    if (this._handler?.onOpen) {
      this._handler.onOpen();
    }
  }

  simulateMessage(data: string): void {
    const event = new WSMessageEvent('message', { data });
    this._fireEvent('message', event);
    if (this.onmessage) {
      this.onmessage(event);
    }
    if (this._handler?.onMessage) {
      this._handler.onMessage(data);
    }
  }

  simulateClose(code?: number, reason?: string): void {
    this.readyState = WebSocket.CLOSED;
    const event = new CloseEvent('close', {
      code: code ?? 1000,
      reason: reason ?? '',
      wasClean: true,
    });
    this._fireEvent('close', event);
    if (this.onclose) {
      this.onclose(event);
    }
    if (this._handler?.onClose) {
      this._handler.onClose(code ?? 1000, reason ?? '');
    }
  }

  simulateError(error?: Error): void {
    const event = new Event('error');
    (event as Event & { error?: Error }).error = error;
    this._fireEvent('error', event);
    if (this.onerror) {
      this.onerror(event);
    }
    if (this._handler?.onError) {
      this._handler.onError(error ?? new Error('WebSocket error'));
    }
  }

  private _fireEvent(type: string, event: Event): void {
    const listeners = this._listeners.get(type) ?? [];
    for (const listener of listeners) {
      listener(event);
    }
  }
}
