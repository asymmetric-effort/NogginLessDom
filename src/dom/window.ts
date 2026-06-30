/**
 * Window environment for full DOM simulation test environment.
 * @module dom/window
 */

import { URL, URLSearchParams } from 'node:url';
import * as http from 'node:http';
import * as https from 'node:https';
import { Document, Element, Event } from './index.js';
import { StorageEvent, PopStateEvent, MessageEvent } from './events.js';
import { Performance } from './performance.js';
import { CSSStyleDeclaration } from './style.js';
import { FormData } from './form-data.js';
import { Headers as NogginHeaders } from './headers.js';
import { Blob as NogginLessBlob } from './blob.js';
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
import {
  parseMediaQuery,
  evaluateMediaQuery,
  type ParsedMediaQuery,
  type MediaContext,
} from './media-query.js';
import {
  XMLHttpRequest as NogginXMLHttpRequest,
  type XHRHandler,
} from './xhr.js';
import {
  WebSocket as NogginWebSocket,
  type WebSocketHandler,
} from './websocket.js';
import { IDBFactory } from './indexeddb.js';
import {
  Worker as NogginWorker,
  SharedWorker as NogginSharedWorker,
  ServiceWorkerContainer,
} from './workers.js';

/**
 * Default fetch handler using node:http and node:https.
 * Makes real HTTP/HTTPS requests and returns a Response object.
 */
function defaultFetchHandler(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    let parsedUrl: globalThis.URL;
    try {
      parsedUrl = new globalThis.URL(url);
    } catch {
      reject(new TypeError(`Failed to parse URL: ${url}`));
      return;
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const reqOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options?.method ?? 'GET',
      headers: options?.headers ?? {},
    };

    const req = transport.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === 'string') {
            responseHeaders[key] = value;
          } else if (Array.isArray(value)) {
            responseHeaders[key] = value.join(', ');
          }
        }
        resolve(
          new Response(body, {
            status: res.statusCode ?? 200,
            statusText: res.statusMessage ?? '',
            headers: responseHeaders,
          }),
        );
      });
      res.on('error', (err: Error) => {
        reject(new TypeError(`Network request failed: ${err.message}`));
      });
    });

    req.on('error', (err: Error) => {
      reject(new TypeError(`Network request failed: ${err.message}`));
    });

    if (options?.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/** Default storage quota: 5 MB (UTF-16, so 2 bytes per character). */
const DEFAULT_STORAGE_QUOTA = 5 * 1024 * 1024;

/**
 * In-memory Storage implementation (localStorage / sessionStorage).
 */
export class Storage {
  private store: Map<string, string> = new Map();
  /** @internal */ _window: Window | null = null;
  /** @internal */ _name: string = '';
  /** @internal */ _maxQuota: number;

  constructor(maxQuota: number = DEFAULT_STORAGE_QUOTA) {
    this._maxQuota = maxQuota;
  }

  get length(): number {
    return this.store.size;
  }

  /**
   * Calculate total byte size of all stored entries (UTF-16: 2 bytes per char).
   */
  private _byteSize(): number {
    let size = 0;
    for (const [k, v] of this.store) {
      size += (k.length + v.length) * 2;
    }
    return size;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    const strValue = String(value);
    const oldValue = this.store.get(key) ?? null;

    // Quota check: compute projected size
    const currentSize = this._byteSize();
    const oldEntrySize =
      oldValue !== null ? (key.length + oldValue.length) * 2 : 0;
    const newEntrySize = (key.length + strValue.length) * 2;
    if (currentSize - oldEntrySize + newEntrySize > this._maxQuota) {
      const err = new Error(
        "Failed to execute 'setItem' on 'Storage': Setting the value exceeded the quota.",
      );
      err.name = 'QuotaExceededError';
      throw err;
    }

    this.store.set(key, strValue);

    // Only dispatch event if value actually changed
    if (oldValue !== strValue) {
      this._dispatchStorageEvent(key, oldValue, strValue);
    }
  }

  removeItem(key: string): void {
    const oldValue = this.store.get(key) ?? null;
    if (oldValue === null) return;
    this.store.delete(key);
    this._dispatchStorageEvent(key, oldValue, null);
  }

  clear(): void {
    if (this.store.size === 0) return;
    this.store.clear();
    this._dispatchStorageEvent(null, null, null);
  }

  key(index: number): string | null {
    const keys = [...this.store.keys()];
    return keys[index] ?? null;
  }

  private _dispatchStorageEvent(
    key: string | null,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    const win = this._window;
    if (!win) return;
    const event = new StorageEvent('storage', {
      key,
      oldValue,
      newValue,
      url: win.location.href,
      storageArea: this,
    });
    win.dispatchEvent(event);
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
 * History — supports pushState, replaceState, back, forward, go with popstate events.
 */
export class History {
  private entries: HistoryEntry[] = [{ state: null, title: '', url: '' }];
  private currentIndex = 0;
  /** @internal */ _window: Window | null = null;

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
    // Per spec: pushState does NOT fire popstate
  }

  replaceState(state: unknown, title: string, url: string): void {
    this.entries[this.currentIndex] = { state, title, url };
    // Per spec: replaceState does NOT fire popstate
  }

  back(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._firePopState();
    }
  }

  forward(): void {
    if (this.currentIndex < this.entries.length - 1) {
      this.currentIndex++;
      this._firePopState();
    }
  }

  go(delta: number): void {
    const newIndex = this.currentIndex + delta;
    if (newIndex >= 0 && newIndex < this.entries.length) {
      this.currentIndex = newIndex;
      if (delta !== 0) {
        this._firePopState();
      }
    }
  }

  private _firePopState(): void {
    if (this._window) {
      const event = new PopStateEvent('popstate', {
        state: this.entries[this.currentIndex]!.state,
      });
      this._window.dispatchEvent(event);
    }
  }
}

/**
 * Basic Navigator stub.
 */
export class Clipboard {
  private _text: string = '';

  async readText(): Promise<string> {
    return this._text;
  }

  async writeText(text: string): Promise<void> {
    this._text = text;
  }

  async read(): Promise<ClipboardItem[]> {
    return [];
  }

  async write(_items: ClipboardItem[]): Promise<void> {
    // no-op stub
  }
}

/** Minimal ClipboardItem type for Clipboard.write/read. */
export interface ClipboardItem {
  readonly types: string[];
  getType(type: string): Promise<Blob>;
}

/**
 * Permissions stub \u2014 always returns granted.
 */
export class Permissions {
  async query(_desc: { name: string }): Promise<{ state: string }> {
    return { state: 'granted' };
  }
}

/**
 * Navigator \u2014 provides browser-like navigator properties for testing.
 */
export class Navigator {
  public userAgent: string = 'NogginLessDom/1.0';
  public language: string = 'en-US';
  public languages: readonly string[] = ['en-US', 'en'];
  public onLine: boolean = true;
  public cookieEnabled: boolean = true;
  public platform: string = 'Linux';
  public vendor: string = '';
  public hardwareConcurrency: number = 4;
  public maxTouchPoints: number = 0;
  public clipboard: Clipboard;
  public permissions: Permissions;
  public serviceWorker: ServiceWorkerContainer;

  constructor() {
    this.clipboard = new Clipboard();
    this.permissions = new Permissions();
    this.serviceWorker = new ServiceWorkerContainer();
  }

  sendBeacon(_url: string, _data?: string): boolean {
    return true;
  }

  vibrate(_pattern: number | number[]): boolean {
    return true;
  }
}

/** Listener type for MediaQueryList. */
type MediaQueryListener = (event: { matches: boolean; media: string }) => void;

/**
 * MediaQueryList with dynamic evaluation against Window dimensions and preferences.
 */
export class MediaQueryList {
  public readonly media: string;
  private listeners: Map<string, MediaQueryListener[]> = new Map();
  /** @internal */ _parsed: ParsedMediaQuery[];
  /** @internal */ _window: Window | null;

  constructor(query: string, window: Window | null) {
    this.media = query;
    this._parsed = parseMediaQuery(query);
    this._window = window;
  }

  get matches(): boolean {
    if (!this._window) return false;
    return evaluateMediaQuery(this._parsed, this._window._getMediaContext());
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

  /** @internal Fire change event to all registered listeners. */
  _fireChange(): void {
    const event = { matches: this.matches, media: this.media };
    const changeListeners = this.listeners.get('change') ?? [];
    for (const listener of changeListeners) {
      listener(event);
    }
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
  public bodyUsed: boolean = false;
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

  private _consumeBody(): void {
    if (this.bodyUsed) {
      throw new TypeError('Body has already been consumed');
    }
    this.bodyUsed = true;
  }

  async json(): Promise<unknown> {
    this._consumeBody();
    return JSON.parse(this._body) as unknown;
  }

  async text(): Promise<string> {
    this._consumeBody();
    return this._body;
  }

  async blob(): Promise<NogginLessBlob> {
    this._consumeBody();
    const contentType = this.headers.get('content-type') ?? '';
    return new NogginLessBlob([this._body], { type: contentType });
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    this._consumeBody();
    const encoder = new TextEncoder();
    const encoded = encoder.encode(this._body);
    return encoded.buffer.slice(
      encoded.byteOffset,
      encoded.byteOffset + encoded.byteLength,
    );
  }

  async formData(): Promise<FormData> {
    this._consumeBody();
    const fd = new FormData();
    const params = new URLSearchParams(this._body);
    for (const [key, value] of params) {
      fd.append(key, value);
    }
    return fd;
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
  public bodyUsed: boolean = false;

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

  private _consumeBody(): void {
    if (this.bodyUsed) {
      throw new TypeError('Body has already been consumed');
    }
    this.bodyUsed = true;
  }

  async json(): Promise<unknown> {
    this._consumeBody();
    return JSON.parse(this.body ?? '') as unknown;
  }

  async text(): Promise<string> {
    this._consumeBody();
    return this.body ?? '';
  }

  async blob(): Promise<NogginLessBlob> {
    this._consumeBody();
    const contentType = this.headers.get('content-type') ?? '';
    return new NogginLessBlob([this.body ?? ''], { type: contentType });
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    this._consumeBody();
    const encoder = new TextEncoder();
    const encoded = encoder.encode(this.body ?? '');
    return encoded.buffer.slice(
      encoded.byteOffset,
      encoded.byteOffset + encoded.byteLength,
    );
  }

  async formData(): Promise<FormData> {
    this._consumeBody();
    const fd = new FormData();
    const params = new URLSearchParams(this.body ?? '');
    for (const [key, value] of params) {
      fd.append(key, value);
    }
    return fd;
  }

  clone(): Request {
    const headersObj: Record<string, string> = {};
    for (const [key, value] of this.headers) {
      headersObj[key] = value;
    }
    return new Request(this.url, {
      method: this.method,
      headers: headersObj,
      body: this.body ?? undefined,
    });
  }
}

/** Fetch handler type. */
export type FetchHandler = (
  url: string,
  options?: RequestInit,
) => Response | Promise<Response>;

/** Minimal RequestInit for fetch. */
export interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Global fetch handler used by the standalone fetch() function.
 * Can be overridden via configureFetch().
 */
let globalFetchHandler: FetchHandler = defaultFetchHandler;

/**
 * Standalone fetch function that works without a Window instance.
 * Uses the global fetch handler, which defaults to making real HTTP/HTTPS
 * requests using node:http and node:https.
 */
export async function fetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  return globalFetchHandler(url, options);
}

/**
 * Configure the global fetch handler used by the standalone fetch() function.
 * Pass null to reset to the default handler.
 */
export function configureFetch(handler: FetchHandler | null): void {
  globalFetchHandler = handler ?? defaultFetchHandler;
}

// Performance API is now provided by ./performance.ts

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
  colorScheme?: 'light' | 'dark';
  reducedMotion?: boolean;
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
  public performance: Performance;
  public console: typeof globalThis.console;
  public screen: ScreenStub;
  public devicePixelRatio: number;
  public CSS: CSSNamespace;
  public scrollX: number;
  public scrollY: number;
  public pageXOffset: number;
  public pageYOffset: number;
  public indexedDB: IDBFactory;

  // Web API properties
  public FormData: typeof FormData = FormData;
  public Headers: typeof NogginHeaders = NogginHeaders;
  public Request: typeof Request = Request;
  public Response: typeof Response = Response;
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
  public Worker: typeof NogginWorker = NogginWorker;
  public SharedWorker: typeof NogginSharedWorker = NogginSharedWorker;

  private eventListeners: Map<string, Array<(event: Event) => void>> =
    new Map();
  private rafCallbacks: Map<number, (timestamp: number) => void> = new Map();
  private rafIdCounter = 0;
  private _matchMediaMatches: boolean;
  private _fetchHandler: FetchHandler = defaultFetchHandler;
  private _xhrHandler: XHRHandler | undefined = undefined;
  private _wsHandler: WebSocketHandler | undefined = undefined;
  private _selection: import('./selection.js').Selection | null = null;
  private _eventHandlers: Map<string, (event: Event) => void> = new Map();
  private _colorScheme: 'light' | 'dark';
  private _reducedMotion: boolean;
  private _activeMediaQueryLists: Set<MediaQueryList> = new Set();
  private _idleCallbackId = 0;
  private _idleCallbacks: Map<
    number,
    (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void
  > = new Map();
  private _stylesheetLoader:
    | ((href: string) => string | Promise<string>)
    | undefined = undefined;
  /** @internal Loaded external stylesheets (href -> css text). */
  _loadedStylesheets: Map<string, string> = new Map();

  constructor(options?: WindowOptions) {
    this.document = new Document();
    this.location = new Location();
    this.history = new History();
    this.history._window = this;
    this.navigator = new Navigator();
    this.localStorage = new Storage();
    this.localStorage._window = this;
    this.localStorage._name = 'localStorage';
    this.sessionStorage = new Storage();
    this.sessionStorage._window = this;
    this.sessionStorage._name = 'sessionStorage';
    this.innerWidth = options?.innerWidth ?? 1024;
    this.innerHeight = options?.innerHeight ?? 768;
    this._matchMediaMatches = options?.matchMediaMatches ?? false;
    this._colorScheme = options?.colorScheme ?? 'light';
    this._reducedMotion = options?.reducedMotion ?? false;
    this.URL = URL;
    this.URLSearchParams = URLSearchParams;
    this.performance = new Performance();
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
    this.indexedDB = new IDBFactory();
  }

  matchMedia(query: string): MediaQueryList {
    const mql = new MediaQueryList(query, this);
    this._activeMediaQueryLists.add(mql);
    return mql;
  }

  /** @internal Build a MediaContext from current window state. */
  _getMediaContext(): MediaContext {
    return {
      width: this.innerWidth,
      height: this.innerHeight,
      colorScheme: this._colorScheme,
      reducedMotion: this._reducedMotion,
      mediaType: 'screen',
    };
  }

  /**
   * Update window dimensions and fire change events on affected MediaQueryLists.
   */
  setDimensions(width: number, height: number): void {
    // Snapshot current matches state for all tracked MQLs
    const before = new Map<MediaQueryList, boolean>();
    for (const mql of this._activeMediaQueryLists) {
      before.set(mql, mql.matches);
    }

    this.innerWidth = width;
    this.innerHeight = height;

    // Fire change events where matches state changed
    for (const mql of this._activeMediaQueryLists) {
      const oldMatches = before.get(mql)!;
      if (mql.matches !== oldMatches) {
        mql._fireChange();
      }
    }
  }

  getComputedStyle(
    el: Element,
    pseudoElement?: string | null,
  ): CSSStyleDeclaration {
    const {
      parseStyleSheet: parseSS,
      collectApplicableStylesWithImportance: collectStylesImportance,
      collectApplicableStyles: collectStyles,
      INHERITED_PROPERTIES: INHERITED,
      isCustomProperty,
      resolveVariables,
      resolveCalc,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('./css-cascade.js') as typeof import('./css-cascade.js');
    const computed = new CSSStyleDeclaration();

    // Normalize pseudo parameter
    const pseudo = pseudoElement || null;

    // Apply default display value based on tag name (only for non-pseudo)
    if (!pseudo) {
      const defaultDisplay = DEFAULT_DISPLAY[el.tagName];
      if (defaultDisplay) {
        computed.setProperty('display', defaultDisplay);
      }
    }

    // Collect <style> elements and parse them into CSS rules
    const allRules: Array<{
      selector: string;
      properties: Map<string, string>;
      specificity: [number, number, number];
      importantProperties?: Set<string>;
      pseudo?: string;
    }> = [];
    // Include loaded external stylesheets
    for (const [, cssText] of this._loadedStylesheets) {
      const rules = parseSS(cssText);
      allRules.push(...rules);
    }

    const styleElements = this.document.querySelectorAll('style');
    for (let s = 0; s < styleElements.length; s++) {
      const styleEl = styleElements[s]!;
      const cssText = (styleEl as Element).textContent ?? '';
      const rules = parseSS(cssText);
      allRules.push(...rules);
    }

    // Build a variable map from ancestor chain + current element for resolution
    const variableMap = new Map<string, string>();

    // Collect variables from ancestor chain (for inheritance)
    const ancestors: Element[] = [];
    let anc = el.parentNode as Element | null;
    while (anc) {
      if (anc.nodeType === 1) ancestors.unshift(anc);
      anc = anc.parentNode as Element | null;
    }
    for (const ancestor of ancestors) {
      // Collect custom properties from stylesheets for ancestor
      const ancestorStyles = collectStyles(ancestor, allRules);
      for (const [prop, val] of ancestorStyles) {
        if (isCustomProperty(prop)) {
          variableMap.set(prop, val);
        }
      }
      // Collect custom properties from inline styles for ancestor
      if (ancestor.style) {
        for (const [prop, val] of ancestor.style) {
          if (isCustomProperty(prop)) {
            variableMap.set(prop, val);
          }
        }
      }
    }

    // Collect custom properties from current element's stylesheets
    const currentStyles = collectStyles(el, allRules);
    for (const [prop, val] of currentStyles) {
      if (isCustomProperty(prop)) {
        variableMap.set(prop, val);
      }
    }
    // Collect custom properties from current element's inline styles
    for (const [prop, val] of el.style) {
      if (isCustomProperty(prop)) {
        variableMap.set(prop, val);
      }
    }

    // Collect applicable stylesheet styles sorted by specificity + source order
    const { styles: stylesheetStyles, important: sheetImportant } =
      collectStylesImportance(el, allRules, undefined, pseudo);
    for (const [prop, val] of stylesheetStyles) {
      // Resolve var() references using the variable map
      let resolvedVal = val;
      if (resolvedVal.includes('var(')) {
        resolvedVal = resolveVariables(resolvedVal, variableMap);
      }
      if (resolvedVal.includes('calc(')) {
        resolvedVal = resolveCalc(resolvedVal);
      }
      computed.setProperty(prop, resolvedVal);
    }

    // Overlay inline styles (only for non-pseudo)
    if (!pseudo) {
      const inlineStyle = el.style;
      for (let i = 0; i < inlineStyle.length; i++) {
        const prop = inlineStyle.item(i);
        const val = inlineStyle.getPropertyValue(prop);
        if (val) {
          const inlinePriority = inlineStyle.getPropertyPriority(prop);
          const isInlineImportant = inlinePriority === 'important';
          if (sheetImportant.has(prop) && !isInlineImportant) {
            continue;
          }
          // Resolve var() references in inline style values
          let resolvedVal = val;
          if (resolvedVal.includes('var(')) {
            resolvedVal = resolveVariables(resolvedVal, variableMap);
          }
          if (resolvedVal.includes('calc(')) {
            resolvedVal = resolveCalc(resolvedVal);
          }
          computed.setProperty(prop, resolvedVal);
        }
      }
    }

    // Inherit inheritable properties from parent chain (only for non-pseudo)
    if (!pseudo) {
      // Inherit standard CSS properties
      for (const prop of INHERITED) {
        if (!computed.getPropertyValue(prop)) {
          let ancestor = el.parentNode as Element | null;
          while (ancestor) {
            if (ancestor.nodeType === 1) {
              const ancestorStyles = collectStyles(ancestor, allRules);
              const fromStylesheet = ancestorStyles.get(prop);
              const fromInline = ancestor.style?.getPropertyValue(prop);
              const ancestorVal = fromInline || fromStylesheet;
              if (ancestorVal) {
                computed.setProperty(prop, ancestorVal);
                break;
              }
            }
            ancestor = ancestor.parentNode as Element | null;
          }
        }
      }

      // Inherit CSS custom properties from parent chain
      for (const [prop, val] of variableMap) {
        if (!computed.getPropertyValue(prop)) {
          computed.setProperty(prop, val);
        }
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
    return this._fetchHandler(url, options);
  }

  configureFetch(handler: FetchHandler): void {
    this._fetchHandler = handler;
  }

  configureXHR(handler: XHRHandler): void {
    this._xhrHandler = handler;
  }

  configureWebSocket(handler: WebSocketHandler): void {
    this._wsHandler = handler;
  }

  configureStylesheetLoader(
    loader: (href: string) => string | Promise<string>,
  ): void {
    this._stylesheetLoader = loader;
  }

  /** @internal */
  _getStylesheetLoader():
    | ((href: string) => string | Promise<string>)
    | undefined {
    return this._stylesheetLoader;
  }

  /**
   * @internal Load a stylesheet from a given href using the configured loader.
   */
  async _loadStylesheet(href: string): Promise<void> {
    if (!this._stylesheetLoader) return;
    if (this._loadedStylesheets.has(href)) return;
    const css = await this._stylesheetLoader(href);
    this._loadedStylesheets.set(href, css);
  }

  get WebSocket(): typeof NogginWebSocket {
    const handler = this._wsHandler;
    if (handler) {
      return class extends NogginWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          this._setHandler(handler!);
        }
      } as typeof NogginWebSocket;
    }
    return NogginWebSocket;
  }

  get XMLHttpRequest(): typeof NogginXMLHttpRequest {
    const handler = this._xhrHandler;
    if (handler) {
      return class extends NogginXMLHttpRequest {
        constructor() {
          super(handler);
        }
      } as typeof NogginXMLHttpRequest;
    }
    return NogginXMLHttpRequest;
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

  // ---- postMessage ----

  postMessage(data: unknown, targetOrigin?: string): void {
    const event = new MessageEvent('message', {
      data,
      origin: targetOrigin ?? '*',
    });
    queueMicrotask(() => {
      this.dispatchEvent(event);
    });
  }

  // ---- open / close stubs ----

  open(_url?: string, _target?: string, _features?: string): Window | null {
    return this;
  }

  close(): void {
    // no-op
  }

  // ---- requestIdleCallback / cancelIdleCallback ----

  requestIdleCallback(
    callback: (deadline: {
      timeRemaining: () => number;
      didTimeout: boolean;
    }) => void,
    _options?: { timeout?: number },
  ): number {
    this._idleCallbackId++;
    this._idleCallbacks.set(this._idleCallbackId, callback);
    return this._idleCallbackId;
  }

  cancelIdleCallback(id: number): void {
    this._idleCallbacks.delete(id);
  }

  /**
   * Test helper: synchronously run all queued idle callbacks.
   */
  flushIdleCallbacks(): void {
    const callbacks = new Map(this._idleCallbacks);
    this._idleCallbacks.clear();
    for (const [, cb] of callbacks) {
      cb({ timeRemaining: () => 50, didTimeout: false });
    }
  }

  // ---- Timer methods ----

  setTimeout(
    callback: (...args: unknown[]) => void,
    ms?: number,
    ...args: unknown[]
  ): ReturnType<typeof globalThis.setTimeout> {
    return globalThis.setTimeout(callback, ms, ...args);
  }

  setInterval(
    callback: (...args: unknown[]) => void,
    ms?: number,
    ...args: unknown[]
  ): ReturnType<typeof globalThis.setInterval> {
    return globalThis.setInterval(callback, ms, ...args);
  }

  clearTimeout(id: ReturnType<typeof globalThis.setTimeout>): void {
    globalThis.clearTimeout(id);
  }

  clearInterval(id: ReturnType<typeof globalThis.setInterval>): void {
    globalThis.clearInterval(id);
  }
}

/**
 * Factory function that returns a configured Window with a fresh Document.
 */
export function createWindow(options?: WindowOptions): Window {
  const win = new Window(options);
  win.document.defaultView = win;

  // Build default document structure: <html><head></head><body></body></html>
  const html = win.document.createElement('html');
  const head = win.document.createElement('head');
  const body = win.document.createElement('body');
  html.appendChild(head);
  html.appendChild(body);
  win.document.appendChild(html);

  return win;
}
