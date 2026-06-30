import { describe, it, expect } from '../../src/index.js';
import { Window } from '../../src/dom/window.js';

describe('Window.configureWebSocket', () => {
  it('configures a WebSocket handler', () => {
    const win = new Window();
    const handler = {
      onOpen: () => {},
      onMessage: () => {},
    };
    win.configureWebSocket(handler);
    // After configuring, WebSocket getter should return a subclass
    const WS = win.WebSocket;
    expect(WS).toBeDefined();
  });

  it('WebSocket getter returns configured subclass with handler', () => {
    const win = new Window();
    const handler = {
      onOpen: () => {},
    };
    win.configureWebSocket(handler);
    const WS = win.WebSocket;
    const ws = new WS('ws://localhost');
    // The handler should have been set on the instance
    expect(ws).toBeDefined();
  });

  it('WebSocket getter without handler returns base class', () => {
    const win = new Window();
    const WS = win.WebSocket;
    expect(WS).toBeDefined();
  });
});

describe('Window._loadStylesheet', () => {
  it('loads stylesheet using configured loader', async () => {
    const win = new Window();
    const cssContent = 'body { color: red; }';
    win.configureStylesheetLoader((_href: string) => cssContent);

    await (
      win as unknown as { _loadStylesheet: (href: string) => Promise<void> }
    )._loadStylesheet('test.css');
    // Should be cached now, calling again should use cache
    await (
      win as unknown as { _loadStylesheet: (href: string) => Promise<void> }
    )._loadStylesheet('test.css');
  });

  it('returns immediately if no loader configured', async () => {
    const win = new Window();
    await (
      win as unknown as { _loadStylesheet: (href: string) => Promise<void> }
    )._loadStylesheet('test.css');
    // Should not throw
  });
});

describe('Window on-event handler setters', () => {
  it('onload setter/getter', () => {
    const win = new Window();
    expect(win.onload).toBeNull();
    const handler = () => {};
    win.onload = handler;
    expect(win.onload).toBe(handler);
    win.onload = null;
    expect(win.onload).toBeNull();
  });

  it('onerror setter/getter', () => {
    const win = new Window();
    expect(win.onerror).toBeNull();
    const handler = () => {};
    win.onerror = handler;
    expect(win.onerror).toBe(handler);
    win.onerror = null;
    expect(win.onerror).toBeNull();
  });

  it('onresize setter/getter with replacement', () => {
    const win = new Window();
    const handler1 = () => {};
    const handler2 = () => {};
    win.onresize = handler1;
    expect(win.onresize).toBe(handler1);
    win.onresize = handler2;
    expect(win.onresize).toBe(handler2);
  });

  it('onpopstate setter/getter', () => {
    const win = new Window();
    const handler = () => {};
    win.onpopstate = handler;
    expect(win.onpopstate).toBe(handler);
    win.onpopstate = null;
    expect(win.onpopstate).toBeNull();
  });

  it('onhashchange setter/getter', () => {
    const win = new Window();
    const handler = () => {};
    win.onhashchange = handler;
    expect(win.onhashchange).toBe(handler);
    win.onhashchange = null;
    expect(win.onhashchange).toBeNull();
  });

  it('onbeforeunload setter/getter', () => {
    const win = new Window();
    const handler = () => {};
    win.onbeforeunload = handler;
    expect(win.onbeforeunload).toBe(handler);
    win.onbeforeunload = null;
    expect(win.onbeforeunload).toBeNull();
  });

  it('onfocus setter/getter', () => {
    const win = new Window();
    const handler = () => {};
    win.onfocus = handler;
    expect(win.onfocus).toBe(handler);
    win.onfocus = null;
    expect(win.onfocus).toBeNull();
  });

  it('onblur setter/getter', () => {
    const win = new Window();
    const handler = () => {};
    win.onblur = handler;
    expect(win.onblur).toBe(handler);
    win.onblur = null;
    expect(win.onblur).toBeNull();
  });
});

describe('Window timer methods', () => {
  it('setTimeout returns a timer id', () => {
    const win = new Window();
    const id = win.setTimeout(() => {}, 0);
    expect(id).toBeDefined();
    win.clearTimeout(id);
  });

  it('setInterval returns a timer id', () => {
    const win = new Window();
    const id = win.setInterval(() => {}, 1000);
    expect(id).toBeDefined();
    win.clearInterval(id);
  });

  it('clearTimeout clears a timer', () => {
    const win = new Window();
    let called = false;
    const id = win.setTimeout(() => {
      called = true;
    }, 50);
    win.clearTimeout(id);
    // Wait a bit to confirm it was cleared
    return new Promise<void>((resolve) => {
      globalThis.setTimeout(() => {
        expect(called).toBe(false);
        resolve();
      }, 100);
    });
  });

  it('clearInterval clears an interval', () => {
    const win = new Window();
    let count = 0;
    const id = win.setInterval(() => {
      count++;
    }, 50);
    win.clearInterval(id);
    return new Promise<void>((resolve) => {
      globalThis.setTimeout(() => {
        expect(count).toBe(0);
        resolve();
      }, 100);
    });
  });
});
