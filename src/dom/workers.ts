/**
 * Web Workers simulation for testing environments.
 * @module dom/workers
 */

import { MessageEvent, ErrorEvent } from './events.js';

/** Generic event listener type. */
type EventListener = (...args: unknown[]) => void;

/**
 * Simulated MessagePort for SharedWorker communication.
 */
export class MessagePort {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  private _listeners: Map<string, EventListener[]> = new Map();
  private _started: boolean = false;
  private _closed: boolean = false;

  postMessage(_data: unknown): void {
    if (this._closed) return;
    // In a real implementation this would send to the other port
  }

  start(): void {
    this._started = true;
  }

  close(): void {
    this._closed = true;
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  /**
   * Test helper: simulate receiving a message on this port.
   */
  simulateMessage(data: unknown): void {
    const event = new MessageEvent('message', { data });
    if (this.onmessage) {
      this.onmessage(event);
    }
    const listeners = this._listeners.get('message') ?? [];
    for (const listener of listeners) {
      listener(event);
    }
  }

  /** @internal */
  get _isClosed(): boolean {
    return this._closed;
  }

  /** @internal */
  get _isStarted(): boolean {
    return this._started;
  }
}

/**
 * Simulated Web Worker for testing.
 */
export class Worker {
  private _listeners: Map<string, EventListener[]> = new Map();
  private _terminated: boolean = false;

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  public readonly url: string | URL;
  public readonly type: string;
  public readonly name: string;

  constructor(url: string | URL, options?: { type?: string; name?: string }) {
    this.url = url;
    this.type = options?.type ?? 'classic';
    this.name = options?.name ?? '';
  }

  postMessage(_data: unknown, _transfer?: Transferable[]): void {
    if (this._terminated) return;
    // In a real implementation this would send to the worker thread
  }

  terminate(): void {
    this._terminated = true;
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  /**
   * Test helper: simulate the worker sending a message back.
   */
  simulateMessage(data: unknown): void {
    if (this._terminated) return;
    const event = new MessageEvent('message', { data });
    if (this.onmessage) {
      this.onmessage(event);
    }
    const listeners = this._listeners.get('message') ?? [];
    for (const listener of listeners) {
      listener(event);
    }
  }

  /**
   * Test helper: simulate the worker encountering an error.
   */
  simulateError(error: Error): void {
    if (this._terminated) return;
    const event = new ErrorEvent('error', {
      message: error.message,
      error,
    });
    if (this.onerror) {
      this.onerror(event);
    }
    const listeners = this._listeners.get('error') ?? [];
    for (const listener of listeners) {
      listener(event);
    }
  }

  /** @internal */
  get _isTerminated(): boolean {
    return this._terminated;
  }
}

/**
 * Simulated SharedWorker for testing.
 */
export class SharedWorker {
  readonly port: MessagePort;
  onerror: ((event: ErrorEvent) => void) | null = null;

  public readonly url: string | URL;
  public readonly name: string;

  constructor(
    url: string | URL,
    options?: string | { type?: string; name?: string },
  ) {
    this.url = url;
    this.port = new MessagePort();
    if (typeof options === 'string') {
      this.name = options;
    } else {
      this.name = options?.name ?? '';
    }
  }
}

/**
 * Simulated ServiceWorker for testing.
 */
export class ServiceWorker {
  readonly scriptURL: string;
  readonly state: string = 'activated';
  onstatechange: ((event: Event) => void) | null = null;

  private _listeners: Map<string, EventListener[]> = new Map();

  constructor(scriptURL: string) {
    this.scriptURL = scriptURL;
  }

  postMessage(_data: unknown): void {
    // In a real implementation this would send to the service worker
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }
}

/**
 * Simulated ServiceWorkerRegistration for testing.
 */
export class ServiceWorkerRegistration {
  readonly active: ServiceWorker | null;
  readonly scope: string;
  private _unregistered: boolean = false;

  constructor(sw: ServiceWorker, scope: string) {
    this.active = sw;
    this.scope = scope;
  }

  async unregister(): Promise<boolean> {
    this._unregistered = true;
    return true;
  }

  async update(): Promise<void> {
    // No-op in test environment
  }

  /** @internal */
  get _isUnregistered(): boolean {
    return this._unregistered;
  }
}

/**
 * Simulated ServiceWorkerContainer (navigator.serviceWorker) for testing.
 */
export class ServiceWorkerContainer {
  readonly controller: ServiceWorker | null = null;
  readonly ready: Promise<ServiceWorkerRegistration>;

  private _registrations: Map<string, ServiceWorkerRegistration> = new Map();
  private _readyResolve!: (reg: ServiceWorkerRegistration) => void;

  constructor() {
    this.ready = new Promise<ServiceWorkerRegistration>((resolve) => {
      this._readyResolve = resolve;
    });
  }

  async register(
    scriptURL: string,
    options?: { scope?: string },
  ): Promise<ServiceWorkerRegistration> {
    const scope = options?.scope ?? '/';
    const sw = new ServiceWorker(scriptURL);
    const registration = new ServiceWorkerRegistration(sw, scope);
    this._registrations.set(scope, registration);
    // Resolve ready promise with first registration
    if (this._registrations.size === 1) {
      this._readyResolve(registration);
    }
    return registration;
  }

  async getRegistration(
    scope?: string,
  ): Promise<ServiceWorkerRegistration | undefined> {
    const key = scope ?? '/';
    return this._registrations.get(key);
  }

  async getRegistrations(): Promise<ServiceWorkerRegistration[]> {
    return [...this._registrations.values()];
  }
}
