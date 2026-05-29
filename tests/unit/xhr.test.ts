import { describe, it, expect } from '../../src/index.js';
import { XMLHttpRequest, type XHRHandler } from '../../src/dom/xhr.js';
import { createWindow } from '../../src/dom/window.js';

describe('XMLHttpRequest', () => {
  const mockHandler: XHRHandler = async (_request) => ({
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json', 'x-custom': 'value' },
    body: '{"message":"hello"}',
  });

  it('starts in UNSENT state', () => {
    const xhr = new XMLHttpRequest();
    expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT);
    expect(xhr.readyState).toBe(0);
    expect(xhr.status).toBe(0);
    expect(xhr.statusText).toBe('');
    expect(xhr.responseText).toBe('');
    expect(xhr.responseXML).toBe(null);
    expect(xhr.response).toBe('');
    expect(xhr.responseType).toBe('');
    expect(xhr.responseURL).toBe('');
    expect(xhr.timeout).toBe(0);
    expect(xhr.withCredentials).toBe(false);
  });

  it('has correct static constants', () => {
    expect(XMLHttpRequest.UNSENT).toBe(0);
    expect(XMLHttpRequest.OPENED).toBe(1);
    expect(XMLHttpRequest.HEADERS_RECEIVED).toBe(2);
    expect(XMLHttpRequest.LOADING).toBe(3);
    expect(XMLHttpRequest.DONE).toBe(4);
  });

  it('open() transitions to OPENED', () => {
    const xhr = new XMLHttpRequest(mockHandler);
    const states: number[] = [];
    xhr.onreadystatechange = function () {
      states.push(this.readyState);
    };
    xhr.open('GET', 'http://example.com/api');
    expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);
    expect(states).toEqual([XMLHttpRequest.OPENED]);
  });

  it('send() transitions through HEADERS_RECEIVED -> LOADING -> DONE', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    const states: number[] = [];
    xhr.onreadystatechange = function () {
      states.push(this.readyState);
    };
    xhr.open('GET', 'http://example.com/api');
    states.length = 0; // Clear the OPENED state
    xhr.send();

    // Wait for async handler to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(states).toEqual([
      XMLHttpRequest.HEADERS_RECEIVED,
      XMLHttpRequest.LOADING,
      XMLHttpRequest.DONE,
    ]);
    expect(xhr.readyState).toBe(XMLHttpRequest.DONE);
  });

  it('readystatechange fires at each transition', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    const allStates: number[] = [];
    xhr.onreadystatechange = function () {
      allStates.push(this.readyState);
    };
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(allStates).toEqual([
      XMLHttpRequest.OPENED,
      XMLHttpRequest.HEADERS_RECEIVED,
      XMLHttpRequest.LOADING,
      XMLHttpRequest.DONE,
    ]);
  });

  it('load event fires on success', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    let loadFired = false;
    xhr.onload = function () {
      loadFired = true;
    };
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loadFired).toBe(true);
  });

  it('loadstart fires before request, loadend fires after', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    const events: string[] = [];
    xhr.onloadstart = function () {
      events.push('loadstart');
    };
    xhr.onloadend = function () {
      events.push('loadend');
    };
    xhr.onload = function () {
      events.push('load');
    };
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events[0]).toBe('loadstart');
    expect(events[events.length - 1]).toBe('loadend');
    expect(events.indexOf('load')).toBeLessThan(events.indexOf('loadend'));
  });

  it('abort() fires abort event', async () => {
    const slowHandler: XHRHandler = async () => {
      await new Promise((_resolve) => {
        // Never resolves - simulates a slow request
      });
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'response',
      };
    };

    const xhr = new XMLHttpRequest(slowHandler);
    let abortFired = false;
    let loadendFired = false;
    xhr.onabort = function () {
      abortFired = true;
    };
    xhr.onloadend = function () {
      loadendFired = true;
    };
    xhr.open('GET', 'http://example.com/slow');
    xhr.send();

    // Give send a moment to start the async handler
    await new Promise((resolve) => setTimeout(resolve, 5));

    xhr.abort();
    expect(abortFired).toBe(true);
    expect(loadendFired).toBe(true);
  });

  it('abort() prevents load from firing', async () => {
    let resolveHandler!: (value: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: string;
    }) => void;
    const slowHandler: XHRHandler = async () => {
      return new Promise((resolve) => {
        resolveHandler = resolve;
      });
    };

    const xhr = new XMLHttpRequest(slowHandler);
    let loadFired = false;
    xhr.onload = function () {
      loadFired = true;
    };
    xhr.open('GET', 'http://example.com/slow');
    xhr.send();

    await new Promise((resolve) => setTimeout(resolve, 5));
    xhr.abort();

    // Resolve the handler after abort
    resolveHandler({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: 'response',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loadFired).toBe(false);
  });

  it('setRequestHeader stores headers', () => {
    const xhr = new XMLHttpRequest(mockHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.setRequestHeader('Authorization', 'Bearer token');
    xhr.setRequestHeader('Content-Type', 'application/json');
    // Headers are sent via the handler - verified in handler test below
    expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);
  });

  it('getResponseHeader returns response headers', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.getResponseHeader('content-type')).toBe('application/json');
    expect(xhr.getResponseHeader('x-custom')).toBe('value');
    expect(xhr.getResponseHeader('nonexistent')).toBe(null);
  });

  it('getAllResponseHeaders returns formatted string', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const headers = xhr.getAllResponseHeaders();
    expect(headers).toContain('content-type: application/json');
    expect(headers).toContain('x-custom: value');
  });

  it("responseType '' returns text", async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.responseType = '';
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.response).toBe('{"message":"hello"}');
    expect(xhr.responseText).toBe('{"message":"hello"}');
  });

  it("responseType 'text' returns text", async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.responseType = 'text';
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.response).toBe('{"message":"hello"}');
    expect(xhr.responseText).toBe('{"message":"hello"}');
  });

  it("responseType 'json' returns parsed JSON", async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.responseType = 'json';
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.response).toEqual({ message: 'hello' });
  });

  it("responseType 'arraybuffer' returns ArrayBuffer", async () => {
    const textHandler: XHRHandler = async () => ({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: 'hello',
    });
    const xhr = new XMLHttpRequest(textHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.responseType = 'arraybuffer';
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.response).toBeInstanceOf(ArrayBuffer);
    const decoder = new TextDecoder();
    expect(decoder.decode(xhr.response as ArrayBuffer)).toBe('hello');
  });

  it('handler receives correct method, url, headers, body', async () => {
    let receivedRequest: {
      method: string;
      url: string;
      headers: Map<string, string>;
      body: string | null;
    } | null = null;

    const capturingHandler: XHRHandler = async (request) => {
      receivedRequest = request;
      return { status: 200, statusText: 'OK', headers: {}, body: '' };
    };

    const xhr = new XMLHttpRequest(capturingHandler);
    xhr.open('POST', 'http://example.com/submit');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Test', 'yes');
    xhr.send('{"key":"value"}');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(receivedRequest).not.toBe(null);
    expect(receivedRequest!.method).toBe('POST');
    expect(receivedRequest!.url).toBe('http://example.com/submit');
    expect(receivedRequest!.headers.get('Content-Type')).toBe(
      'application/json',
    );
    expect(receivedRequest!.headers.get('X-Test')).toBe('yes');
    expect(receivedRequest!.body).toBe('{"key":"value"}');
  });

  it('handler error fires error event', async () => {
    const failingHandler: XHRHandler = async () => {
      throw new Error('Network failure');
    };

    const xhr = new XMLHttpRequest(failingHandler);
    const events: string[] = [];
    xhr.onerror = function () {
      events.push('error');
    };
    xhr.onloadend = function () {
      events.push('loadend');
    };
    xhr.onload = function () {
      events.push('load');
    };
    xhr.open('GET', 'http://example.com/fail');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toContain('error');
    expect(events).toContain('loadend');
    expect(events).not.toContain('load');
    expect(xhr.readyState).toBe(XMLHttpRequest.DONE);
  });

  it('configureXHR on Window provides default handler', async () => {
    const win = createWindow();
    win.configureXHR(mockHandler);

    const XHR = win.XMLHttpRequest;
    const xhr = new XHR();
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.status).toBe(200);
    expect(xhr.responseText).toBe('{"message":"hello"}');
  });

  it('Window.XMLHttpRequest works without configureXHR', () => {
    const win = createWindow();
    const XHR = win.XMLHttpRequest;
    const xhr = new XHR();
    expect(xhr.readyState).toBe(XMLHttpRequest.UNSENT);
  });

  it('addEventListener/removeEventListener work', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    const events: string[] = [];

    const loadListener = () => events.push('load-listener');
    xhr.addEventListener('load', loadListener);
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toContain('load-listener');

    // Remove and resend
    events.length = 0;
    xhr.removeEventListener('load', loadListener);
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).not.toContain('load-listener');
  });

  it('property-based event handlers (onload, etc.) work', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    const events: string[] = [];

    xhr.onload = function () {
      events.push('onload');
      expect(this.status).toBe(200);
    };
    xhr.onerror = function () {
      events.push('onerror');
    };
    xhr.onprogress = function () {
      events.push('onprogress');
    };

    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toContain('onload');
    expect(events).toContain('onprogress');
    expect(events).not.toContain('onerror');
  });

  it('send() without handler throws error', () => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://example.com/api');
    expect(() => xhr.send()).toThrow('handler is not configured');
  });

  it('send() without open throws error', () => {
    const xhr = new XMLHttpRequest(mockHandler);
    expect(() => xhr.send()).toThrow("The object's state must be OPENED");
  });

  it('open() resets state from previous request', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.readyState).toBe(XMLHttpRequest.DONE);

    // Re-open
    xhr.open('POST', 'http://example.com/other');
    expect(xhr.readyState).toBe(XMLHttpRequest.OPENED);
    expect(xhr.status).toBe(0);
    expect(xhr.statusText).toBe('');
    expect(xhr.responseText).toBe('');
    expect(xhr.response).toBe('');
  });

  it('send with null body', async () => {
    let receivedBody: string | null = 'not-null';
    const captureHandler: XHRHandler = async (request) => {
      receivedBody = request.body;
      return { status: 200, statusText: 'OK', headers: {}, body: '' };
    };
    const xhr = new XMLHttpRequest(captureHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.send(null);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(receivedBody).toBe(null);
  });

  it('send with no body argument', async () => {
    let receivedBody: string | null = 'not-null';
    const captureHandler: XHRHandler = async (request) => {
      receivedBody = request.body;
      return { status: 200, statusText: 'OK', headers: {}, body: '' };
    };
    const xhr = new XMLHttpRequest(captureHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(receivedBody).toBe(null);
  });

  it('responseType json with invalid JSON returns null', async () => {
    const invalidJsonHandler: XHRHandler = async () => ({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: 'not-valid-json',
    });
    const xhr = new XMLHttpRequest(invalidJsonHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.responseType = 'json';
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.response).toBe(null);
  });

  it('getResponseHeader is case-insensitive', async () => {
    const headerHandler: XHRHandler = async () => ({
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/html' },
      body: '',
    });
    const xhr = new XMLHttpRequest(headerHandler);
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.getResponseHeader('content-type')).toBe('text/html');
    expect(xhr.getResponseHeader('Content-Type')).toBe('text/html');
  });

  it('response status and statusText are set correctly', async () => {
    const notFoundHandler: XHRHandler = async () => ({
      status: 404,
      statusText: 'Not Found',
      headers: {},
      body: 'page not found',
    });
    const xhr = new XMLHttpRequest(notFoundHandler);
    xhr.open('GET', 'http://example.com/missing');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.status).toBe(404);
    expect(xhr.statusText).toBe('Not Found');
    expect(xhr.responseText).toBe('page not found');
  });

  it('responseURL is set after send completes', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    xhr.open('GET', 'http://example.com/api');
    expect(xhr.responseURL).toBe('');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(xhr.responseURL).toBe('http://example.com/api');
  });

  it('abort without active send is a no-op', () => {
    const xhr = new XMLHttpRequest(mockHandler);
    let abortFired = false;
    xhr.onabort = function () {
      abortFired = true;
    };
    xhr.abort();
    expect(abortFired).toBe(false);
  });

  it('multiple addEventListener for same event type', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    const calls: string[] = [];
    xhr.addEventListener('load', () => calls.push('listener1'));
    xhr.addEventListener('load', () => calls.push('listener2'));
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(calls).toEqual(['listener1', 'listener2']);
  });

  it('removeEventListener for non-existent listener is a no-op', () => {
    const xhr = new XMLHttpRequest(mockHandler);
    expect(() => xhr.removeEventListener('load', () => {})).not.toThrow();
  });

  it('removeEventListener for non-existent type is a no-op', () => {
    const xhr = new XMLHttpRequest(mockHandler);
    expect(() =>
      xhr.removeEventListener('nonexistent', () => {}),
    ).not.toThrow();
  });

  it('event listeners and property handlers both fire', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    const calls: string[] = [];
    xhr.onload = function () {
      calls.push('property');
    };
    xhr.addEventListener('load', () => calls.push('listener'));
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(calls).toContain('property');
    expect(calls).toContain('listener');
  });

  it('progress event fires during loading', async () => {
    const xhr = new XMLHttpRequest(mockHandler);
    let progressFired = false;
    xhr.addEventListener('progress', () => {
      progressFired = true;
    });
    xhr.open('GET', 'http://example.com/api');
    xhr.send();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(progressFired).toBe(true);
  });

  it('ontimeout property exists and defaults to null', () => {
    const xhr = new XMLHttpRequest();
    expect(xhr.ontimeout).toBe(null);
  });

  it('withCredentials can be set', () => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    expect(xhr.withCredentials).toBe(true);
  });

  it('timeout can be set', () => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 5000;
    expect(xhr.timeout).toBe(5000);
  });
});
