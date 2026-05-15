/**
 * Window environment for jsdom-like test environment.
 * @module dom/window
 */

import { Document, Element, Event } from './index.js';

/**
 * In-memory Storage implementation (localStorage / sessionStorage).
 */
export class Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    const keys = [...this.store.keys()];
    return keys[index] ?? null;
  }
}

/**
 * Basic Location stub.
 */
export class Location {
  public href = 'about:blank';
  public hash = '';
  public pathname = '/';
  public search = '';
  public origin = '';
  public protocol = '';
  public host = '';
  public hostname = '';
  public port = '';

  assign(url: string): void {
    this.href = url;
  }

  replace(url: string): void {
    this.href = url;
  }

  reload(): void {
    // no-op in test environment
  }
}

interface HistoryEntry {
  state: unknown;
  title: string;
  url: string;
}

/**
 * Basic History stub.
 */
export class History {
  private entries: HistoryEntry[] = [{ state: null, title: '', url: '' }];
  private currentIndex = 0;

  get length(): number {
    return this.entries.length;
  }

  get state(): unknown {
    return this.entries[this.currentIndex]!.state;
  }

  pushState(state: unknown, title: string, url: string): void {
    // Remove forward entries
    this.entries = this.entries.slice(0, this.currentIndex + 1);
    this.entries.push({ state, title, url });
    this.currentIndex++;
  }

  replaceState(state: unknown, title: string, url: string): void {
    this.entries[this.currentIndex] = { state, title, url };
  }

  back(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  forward(): void {
    if (this.currentIndex < this.entries.length - 1) {
      this.currentIndex++;
    }
  }

  go(delta: number): void {
    const newIndex = this.currentIndex + delta;
    if (newIndex >= 0 && newIndex < this.entries.length) {
      this.currentIndex = newIndex;
    }
  }
}

/**
 * Basic Navigator stub.
 */
export class Navigator {
  public userAgent = 'NogginLessDom/1.0';
  public language = 'en-US';
  public languages: string[] = ['en-US', 'en'];
  public platform = 'NogginLessDom';
  public onLine = true;
}

/** Listener type for MediaQueryList. */
type MediaQueryListener = (event: { matches: boolean; media: string }) => void;

/**
 * MediaQueryList stub.
 */
export class MediaQueryList {
  public readonly media: string;
  public readonly matches: boolean;
  private listeners: Map<string, MediaQueryListener[]> = new Map();

  constructor(query: string, defaultMatches: boolean) {
    this.media = query;
    this.matches = defaultMatches;
  }

  addEventListener(type: string, listener: MediaQueryListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: MediaQueryListener): void {
    const list = this.listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  /** @deprecated Use addEventListener('change', ...) */
  addListener(listener: MediaQueryListener): void {
    this.addEventListener('change', listener);
  }

  /** @deprecated Use removeEventListener('change', ...) */
  removeListener(listener: MediaQueryListener): void {
    this.removeEventListener('change', listener);
  }
}

/**
 * Options for createWindow factory.
 */
export interface WindowOptions {
  innerWidth?: number;
  innerHeight?: number;
  matchMediaMatches?: boolean;
}

/**
 * Window class providing a jsdom-like test environment.
 */
export class Window {
  public document: Document;
  public location: Location;
  public history: History;
  public navigator: Navigator;
  public localStorage: Storage;
  public sessionStorage: Storage;
  public innerWidth: number;
  public innerHeight: number;

  private eventListeners: Map<string, Array<(event: Event) => void>> =
    new Map();
  private rafCallbacks: Map<number, (timestamp: number) => void> = new Map();
  private rafIdCounter = 0;
  private _matchMediaMatches: boolean;

  constructor(options?: WindowOptions) {
    this.document = new Document();
    this.location = new Location();
    this.history = new History();
    this.navigator = new Navigator();
    this.localStorage = new Storage();
    this.sessionStorage = new Storage();
    this.innerWidth = options?.innerWidth ?? 1024;
    this.innerHeight = options?.innerHeight ?? 768;
    this._matchMediaMatches = options?.matchMediaMatches ?? false;
  }

  matchMedia(query: string): MediaQueryList {
    return new MediaQueryList(query, this._matchMediaMatches);
  }

  getComputedStyle(el: Element): Record<string, string> {
    // Without CSS cascade, return an empty style object.
    // In real DOM this would inspect inline styles, but we keep it simple.
    const style: Record<string, string> = {};
    void el;
    return style;
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type) ?? [];
    for (const listener of listeners) {
      listener(event);
    }
    return !event.defaultPrevented;
  }

  requestAnimationFrame(callback: (timestamp: number) => void): number {
    this.rafIdCounter++;
    this.rafCallbacks.set(this.rafIdCounter, callback);
    return this.rafIdCounter;
  }

  cancelAnimationFrame(id: number): void {
    this.rafCallbacks.delete(id);
  }

  /**
   * Test helper: synchronously run all queued animation frame callbacks.
   */
  flushAnimationFrames(): void {
    const callbacks = new Map(this.rafCallbacks);
    this.rafCallbacks.clear();
    const timestamp = Date.now();
    for (const [, callback] of callbacks) {
      callback(timestamp);
    }
  }
}

/**
 * Factory function that returns a configured Window with a fresh Document.
 */
export function createWindow(options?: WindowOptions): Window {
  return new Window(options);
}
