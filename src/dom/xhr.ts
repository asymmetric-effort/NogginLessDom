/**
 * XMLHttpRequest simulation for testing.
 * @module dom/xhr
 */

/** Handler type for processing XHR requests. */
export type XHRHandler = (request: {
  method: string;
  url: string;
  headers: Map<string, string>;
  body: string | null;
}) => Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}>;

/**
 * XMLHttpRequest simulation for DOM testing.
 */
export class XMLHttpRequest {
  // Constants
  static readonly UNSENT = 0;
  static readonly OPENED = 1;
  static readonly HEADERS_RECEIVED = 2;
  static readonly LOADING = 3;
  static readonly DONE = 4;

  // State
  readyState: number = 0;
  status: number = 0;
  statusText: string = '';
  responseText: string = '';
  responseXML: null = null;
  response: unknown = '';
  responseType: '' | 'text' | 'json' | 'arraybuffer' = '';
  responseURL: string = '';
  timeout: number = 0;
  withCredentials: boolean = false;

  // Event handlers (property-based)
  onreadystatechange: ((this: XMLHttpRequest) => void) | null = null;
  onload: ((this: XMLHttpRequest) => void) | null = null;
  onerror: ((this: XMLHttpRequest) => void) | null = null;
  onabort: ((this: XMLHttpRequest) => void) | null = null;
  ontimeout: ((this: XMLHttpRequest) => void) | null = null;
  onloadstart: ((this: XMLHttpRequest) => void) | null = null;
  onloadend: ((this: XMLHttpRequest) => void) | null = null;
  onprogress: ((this: XMLHttpRequest) => void) | null = null;

  // Private
  private _method: string = '';
  private _url: string = '';
  private _headers: Map<string, string> = new Map();
  private _responseHeaders: Map<string, string> = new Map();
  private _aborted: boolean = false;
  private _handler: XHRHandler | null = null;
  private _listeners: Map<string, Array<() => void>> = new Map();
  private _sendInProgress: boolean = false;

  constructor(handler?: XHRHandler) {
    this._handler = handler ?? null;
  }

  open(method: string, url: string, _async?: boolean): void {
    this._method = method;
    this._url = url;
    this._headers = new Map();
    this._responseHeaders = new Map();
    this._aborted = false;
    this.status = 0;
    this.statusText = '';
    this.responseText = '';
    this.response = '';
    this.responseURL = '';
    this._setReadyState(XMLHttpRequest.OPENED);
  }

  send(body?: string | null): void {
    if (this.readyState !== XMLHttpRequest.OPENED) {
      throw new Error(
        "Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.",
      );
    }

    this._sendInProgress = true;
    this._fireEvent('loadstart');

    const handler = this._handler;
    if (!handler) {
      throw new Error(
        'XMLHttpRequest handler is not configured. Use configureXHR() on Window to set up a handler.',
      );
    }

    const requestBody = body ?? null;

    void handler({
      method: this._method,
      url: this._url,
      headers: new Map(this._headers),
      body: requestBody,
    })
      .then((result) => {
        if (this._aborted) return;

        // Store response headers
        this._responseHeaders = new Map();
        for (const [key, value] of Object.entries(result.headers)) {
          this._responseHeaders.set(key.toLowerCase(), value);
        }

        // HEADERS_RECEIVED
        this._setReadyState(XMLHttpRequest.HEADERS_RECEIVED);

        if (this._aborted) return;

        // LOADING
        this._setReadyState(XMLHttpRequest.LOADING);
        this._fireEvent('progress');

        if (this._aborted) return;

        // Set response data
        this.status = result.status;
        this.statusText = result.statusText;
        this.responseText = result.body;
        this.responseURL = this._url;

        // Set response based on responseType
        if (this.responseType === 'json') {
          try {
            this.response = JSON.parse(result.body) as unknown;
          } catch {
            this.response = null;
          }
        } else if (this.responseType === 'arraybuffer') {
          const encoder = new TextEncoder();
          const encoded = encoder.encode(result.body);
          this.response = encoded.buffer.slice(
            encoded.byteOffset,
            encoded.byteOffset + encoded.byteLength,
          );
        } else {
          // '' or 'text'
          this.response = result.body;
        }

        // DONE
        this._setReadyState(XMLHttpRequest.DONE);
        this._fireEvent('load');
        this._fireEvent('loadend');
        this._sendInProgress = false;
      })
      .catch((_error: unknown) => {
        if (this._aborted) return;
        this._setReadyState(XMLHttpRequest.DONE);
        this._fireEvent('error');
        this._fireEvent('loadend');
        this._sendInProgress = false;
      });
  }

  abort(): void {
    this._aborted = true;
    if (this._sendInProgress) {
      this._setReadyState(XMLHttpRequest.DONE);
      this._fireEvent('abort');
      this._fireEvent('loadend');
      this._sendInProgress = false;
    }
  }

  setRequestHeader(name: string, value: string): void {
    this._headers.set(name, value);
  }

  getResponseHeader(name: string): string | null {
    return this._responseHeaders.get(name.toLowerCase()) ?? null;
  }

  getAllResponseHeaders(): string {
    const lines: string[] = [];
    for (const [key, value] of this._responseHeaders) {
      lines.push(`${key}: ${value}`);
    }
    return lines.join('\r\n');
  }

  addEventListener(type: string, listener: () => void): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  private _setReadyState(state: number): void {
    this.readyState = state;
    if (this.onreadystatechange) {
      this.onreadystatechange.call(this);
    }
    this._fireEvent('readystatechange');
  }

  private _fireEvent(type: string): void {
    // Fire property-based handler
    const handlerName = `on${type}` as keyof this;
    const handler = this[handlerName];
    if (typeof handler === 'function' && handlerName !== 'onreadystatechange') {
      (handler as (this: XMLHttpRequest) => void).call(this);
    }

    // Fire addEventListener-based listeners
    const listeners = this._listeners.get(type);
    if (listeners) {
      for (const listener of listeners.slice()) {
        listener.call(this);
      }
    }
  }
}
