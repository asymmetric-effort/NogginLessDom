/**
 * Window environment for full DOM simulation test environment.
 * @module dom/window
 */

import { URL, URLSearchParams } from 'node:url';
import { Document, Element, Event } from './index.js';
import { CSSStyleDeclaration } from './style.js';
import { FormData } from './form-data.js';
import { Headers as NogginHeaders } from './headers.js';
import {
  NogginTextEncoder,
  NogginTextDecoder,
  NogginBlob,
  atob,
  btoa,
  nogginStructuredClone,
  nogginQueueMicrotask,
} from './web-apis.js';
import {
  AbortController as NogginAbortController,
  AbortSignal as NogginAbortSignal,
} from './abort.js';
import {
  DOMParser as NogginDOMParser,
  XMLSerializer as NogginXMLSerializer,
} from './dom-parser.js';

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
 * Minimal Response class for fetch testing.
 */
export class Response {
  public readonly status: number;
  public readonly ok: boolean;
  public readonly statusText: string;
  public readonly headers: Map<string, string>;
  private readonly _body: string;

  constructor(
    body?: string | null,
    init?: {
      status?: number;
      statusText?: string;
      headers?: Record<string, string>;
    },
  ) {
    this._body = body ?? '';
    this.status = init?.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = init?.statusText ?? '';
    this.headers = new Map<string, string>();
    if (init?.headers) {
      for (const [key, value] of Object.entries(init.headers)) {
        this.headers.set(key, value);
      }
    }
  }

  async json(): Promise<unknown> {
    return JSON.parse(this._body) as unknown;
  }

  async text(): Promise<string> {
    return this._body;
  }

  clone(): Response {
    const headersObj: Record<string, string> = {};
    for (const [key, value] of this.headers) {
      headersObj[key] = value;
    }
    return new Response(this._body, {
      status: this.status,
      statusText: this.statusText,
      headers: headersObj,
    });
  }
}

/**
 * Minimal Request class for fetch testing.
 */
export class Request {
  public readonly url: string;
  public readonly method: string;
  public readonly headers: Map<string, string>;
  public readonly body: string | null;

  constructor(
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string },
  ) {
    this.url = url;
    this.method = init?.method ?? 'GET';
    this.body = init?.body ?? null;
    this.headers = new Map<string, string>();
    if (init?.headers) {
      for (const [key, value] of Object.entries(init.headers)) {
        this.headers.set(key, value);
      }
    }
  }
}

/** Fetch handler type. */
type FetchHandler = (
  url: string,
  options?: RequestInit,
) => Response | Promise<Response>;

/** Minimal RequestInit for fetch. */
interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Performance API stub interface. */
interface PerformanceStub {
  now(): number;
  mark(_name: string): void;
  measure(_name: string, _start?: string, _end?: string): void;
  getEntries(): unknown[];
  getEntriesByName(_name: string): unknown[];
  getEntriesByType(_type: string): unknown[];
}

/** Screen stub interface. */
interface ScreenStub {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
}

/** Set of CSS property names recognized by CSS.supports(). */
const KNOWN_CSS_PROPERTIES: Set<string> = new Set([
  'display',
  'color',
  'background',
  'background-color',
  'background-image',
  'background-position',
  'background-repeat',
  'background-size',
  'flex',
  'flex-direction',
  'flex-wrap',
  'flex-flow',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'grid',
  'grid-template',
  'grid-template-columns',
  'grid-template-rows',
  'grid-template-areas',
  'grid-area',
  'grid-column',
  'grid-row',
  'grid-gap',
  'gap',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'outline',
  'font',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'line-height',
  'text-align',
  'text-decoration',
  'text-transform',
  'letter-spacing',
  'word-spacing',
  'white-space',
  'overflow',
  'overflow-x',
  'overflow-y',
  'visibility',
  'opacity',
  'cursor',
  'pointer-events',
  'box-sizing',
  'float',
  'clear',
  'transform',
  'transition',
  'animation',
  'box-shadow',
  'text-shadow',
  'content',
  'list-style',
  'list-style-type',
  'vertical-align',
  'align-items',
  'align-content',
  'align-self',
  'justify-content',
  'justify-items',
  'justify-self',
  'order',
  'resize',
  'object-fit',
  'object-position',
  'user-select',
  'appearance',
  'filter',
  'backdrop-filter',
  'clip-path',
  'will-change',
  'contain',
  'aspect-ratio',
  'accent-color',
  'caret-color',
  'scroll-behavior',
  'writing-mode',
  'direction',
  'unicode-bidi',
  'word-break',
  'overflow-wrap',
  'text-overflow',
  'table-layout',
  'border-collapse',
  'border-spacing',
  'caption-side',
  'empty-cells',
  'columns',
  'column-count',
  'column-gap',
  'column-width',
  'row-gap',
  'place-items',
  'place-content',
  'place-self',
  'isolation',
  'mix-blend-mode',
  'background-blend-mode',
]);

/** Default display values per element tag name. */
const DEFAULT_DISPLAY: Record<string, string> = {
  DIV: 'block',
  P: 'block',
  H1: 'block',
  H2: 'block',
  H3: 'block',
  H4: 'block',
  H5: 'block',
  H6: 'block',
  SECTION: 'block',
  ARTICLE: 'block',
  HEADER: 'block',
  FOOTER: 'block',
  MAIN: 'block',
  NAV: 'block',
  ASIDE: 'block',
  BLOCKQUOTE: 'block',
  FIGURE: 'block',
  FIGCAPTION: 'block',
  ADDRESS: 'block',
  DETAILS: 'block',
  SUMMARY: 'block',
  DIALOG: 'block',
  FORM: 'block',
  FIELDSET: 'block',
  HR: 'block',
  PRE: 'block',
  UL: 'block',
  OL: 'block',
  DL: 'block',
  DD: 'block',
  DT: 'block',
  SEARCH: 'block',
  HGROUP: 'block',
  SPAN: 'inline',
  A: 'inline',
  STRONG: 'inline',
  EM: 'inline',
  B: 'inline',
  I: 'inline',
  U: 'inline',
  S: 'inline',
  SMALL: 'inline',
  SUB: 'inline',
  SUP: 'inline',
  ABBR: 'inline',
  CITE: 'inline',
  CODE: 'inline',
  KBD: 'inline',
  MARK: 'inline',
  Q: 'inline',
  SAMP: 'inline',
  VAR: 'inline',
  TIME: 'inline',
  DATA: 'inline',
  LABEL: 'inline',
  BDI: 'inline',
  BDO: 'inline',
  BR: 'inline',
  WBR: 'inline',
  IMG: 'inline',
  TABLE: 'table',
  THEAD: 'table-header-group',
  TBODY: 'table-row-group',
  TFOOT: 'table-footer-group',
  TR: 'table-row',
  TD: 'table-cell',
  TH: 'table-cell',
  CAPTION: 'table-caption',
  COLGROUP: 'table-column-group',
  COL: 'table-column',
  LI: 'list-item',
  INPUT: 'inline-block',
  BUTTON: 'inline-block',
  SELECT: 'inline-block',
  TEXTAREA: 'inline-block',
};

/** CSS namespace object providing CSS.supports(). */
interface CSSNamespace {
  supports(property: string, value: string): boolean;
  supports(conditionText: string): boolean;
}

/**
 * Parse a single "property: value" condition and check support.
 */
function cssSupportsSingle(conditionText: string): boolean {
  // Strip outer parens if present: "(display: flex)" -> "display: flex"
  let text = conditionText.trim();
  if (text.startsWith('(') && text.endsWith(')')) {
    text = text.slice(1, -1).trim();
  }
  const colonIdx = text.indexOf(':');
  if (colonIdx === -1) {
    return false;
  }
  const property = text.slice(0, colonIdx).trim();
  return KNOWN_CSS_PROPERTIES.has(property);
}

/**
 * Create the CSS namespace object.
 */
function createCSSNamespace(): CSSNamespace {
  return {
    supports(propertyOrCondition: string, value?: string): boolean {
      if (value !== undefined) {
        // Two-argument form: CSS.supports(property, value)
        return KNOWN_CSS_PROPERTIES.has(propertyOrCondition);
      }
      // Single-argument form: CSS.supports(conditionText)
      return cssSupportsSingle(propertyOrCondition);
    },
  };
}

/**
 * Options for createWindow factory.
 */
export interface WindowOptions {
  innerWidth?: number;
  innerHeight?: number;
  matchMediaMatches?: boolean;
  screenWidth?: number;
  screenHeight?: number;
  devicePixelRatio?: number;
}

/**
 * Window class providing a full DOM simulation test environment.
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
  public URL: typeof URL;
  public URLSearchParams: typeof URLSearchParams;
  public performance: PerformanceStub;
  public console: typeof globalThis.console;
  public screen: ScreenStub;
  public devicePixelRatio: number;
  public CSS: CSSNamespace;
  public scrollX: number;
  public scrollY: number;
  public pageXOffset: number;
  public pageYOffset: number;

  // Web API properties
  public FormData: typeof FormData = FormData;
  public Headers: typeof NogginHeaders = NogginHeaders;
  public TextEncoder: typeof NogginTextEncoder = NogginTextEncoder;
  public TextDecoder: typeof NogginTextDecoder = NogginTextDecoder;
  public Blob: typeof NogginBlob = NogginBlob;
  public atob: (data: string) => string = atob;
  public btoa: (data: string) => string = btoa;
  public structuredClone: typeof nogginStructuredClone = nogginStructuredClone;
  public DOMParser: typeof NogginDOMParser = NogginDOMParser;
  public XMLSerializer: typeof NogginXMLSerializer = NogginXMLSerializer;
  public queueMicrotask: typeof nogginQueueMicrotask = nogginQueueMicrotask;
  public AbortController: typeof NogginAbortController = NogginAbortController;
  public AbortSignal: typeof NogginAbortSignal = NogginAbortSignal;
  public crypto: Crypto = globalThis.crypto;

  private eventListeners: Map<string, Array<(event: Event) => void>> =
    new Map();
  private rafCallbacks: Map<number, (timestamp: number) => void> = new Map();
  private rafIdCounter = 0;
  private _matchMediaMatches: boolean;
  private _fetchHandler: FetchHandler | null = null;
  private _selection: import('./selection.js').Selection | null = null;
  private _eventHandlers: Map<string, (event: Event) => void> = new Map();

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
    this.URL = URL;
    this.URLSearchParams = URLSearchParams;
    this.performance = {
      now(): number {
        return Date.now();
      },
      mark(_name: string): void {},
      measure(_name: string, _start?: string, _end?: string): void {},
      getEntries(): unknown[] {
        return [];
      },
      getEntriesByName(_name: string): unknown[] {
        return [];
      },
      getEntriesByType(_type: string): unknown[] {
        return [];
      },
    };
    this.console = globalThis.console;
    this.screen = {
      width: options?.screenWidth ?? 1920,
      height: options?.screenHeight ?? 1080,
      availWidth: options?.screenWidth ?? 1920,
      availHeight: options?.screenHeight ?? 1080,
      colorDepth: 24,
      pixelDepth: 24,
    };
    this.CSS = createCSSNamespace();
    this.devicePixelRatio = options?.devicePixelRatio ?? 1;
    this.scrollX = 0;
    this.scrollY = 0;
    this.pageXOffset = 0;
    this.pageYOffset = 0;
  }

  matchMedia(query: string): MediaQueryList {
    return new MediaQueryList(query, this._matchMediaMatches);
  }

  getComputedStyle(el: Element): CSSStyleDeclaration {
    const computed = new CSSStyleDeclaration();

    // Apply default display value based on tag name
    const defaultDisplay = DEFAULT_DISPLAY[el.tagName];
    if (defaultDisplay) {
      computed.setProperty('display', defaultDisplay);
    }

    // Overlay inline styles (they take precedence)
    const inlineStyle = el.style;
    for (let i = 0; i < inlineStyle.length; i++) {
      const prop = inlineStyle.item(i);
      const val = inlineStyle.getPropertyValue(prop);
      if (val) {
        computed.setProperty(prop, val);
      }
    }

    return computed;
  }

  getSelection(): import('./selection.js').Selection {
    if (!this._selection) {
      // Lazy import to avoid circular dependency
      const { Selection } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./selection.js') as typeof import('./selection.js');
      this._selection = new Selection();
    }
    return this._selection;
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    if (!this._fetchHandler) {
      throw new Error(
        'fetch is not configured. Use window.configureFetch() to set up responses.',
      );
    }
    return this._fetchHandler(url, options);
  }

  configureFetch(handler: FetchHandler): void {
    this._fetchHandler = handler;
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

  // ---- Event handler property helpers ----

  private _getEventHandler(type: string): ((event: Event) => void) | null {
    return this._eventHandlers.get(type) ?? null;
  }

  private _setEventHandler(
    type: string,
    handler: ((event: Event) => void) | null,
  ): void {
    const existing = this._eventHandlers.get(type);
    if (existing) {
      this.removeEventListener(type, existing);
      this._eventHandlers.delete(type);
    }
    if (handler) {
      this._eventHandlers.set(type, handler);
      this.addEventListener(type, handler);
    }
  }

  // ---- On-event properties ----

  get onload(): ((event: Event) => void) | null {
    return this._getEventHandler('load');
  }
  set onload(handler: ((event: Event) => void) | null) {
    this._setEventHandler('load', handler);
  }

  get onerror(): ((event: Event) => void) | null {
    return this._getEventHandler('error');
  }
  set onerror(handler: ((event: Event) => void) | null) {
    this._setEventHandler('error', handler);
  }

  get onresize(): ((event: Event) => void) | null {
    return this._getEventHandler('resize');
  }
  set onresize(handler: ((event: Event) => void) | null) {
    this._setEventHandler('resize', handler);
  }

  get onpopstate(): ((event: Event) => void) | null {
    return this._getEventHandler('popstate');
  }
  set onpopstate(handler: ((event: Event) => void) | null) {
    this._setEventHandler('popstate', handler);
  }

  get onhashchange(): ((event: Event) => void) | null {
    return this._getEventHandler('hashchange');
  }
  set onhashchange(handler: ((event: Event) => void) | null) {
    this._setEventHandler('hashchange', handler);
  }

  get onbeforeunload(): ((event: Event) => void) | null {
    return this._getEventHandler('beforeunload');
  }
  set onbeforeunload(handler: ((event: Event) => void) | null) {
    this._setEventHandler('beforeunload', handler);
  }

  get onfocus(): ((event: Event) => void) | null {
    return this._getEventHandler('focus');
  }
  set onfocus(handler: ((event: Event) => void) | null) {
    this._setEventHandler('focus', handler);
  }

  get onblur(): ((event: Event) => void) | null {
    return this._getEventHandler('blur');
  }
  set onblur(handler: ((event: Event) => void) | null) {
    this._setEventHandler('blur', handler);
  }
}

/**
 * Factory function that returns a configured Window with a fresh Document.
 */
export function createWindow(options?: WindowOptions): Window {
  const win = new Window(options);
  win.document.defaultView = win;
  return win;
}
