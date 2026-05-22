import { describe, it, expect } from '../../src/index.js';
import { Element, Event } from '../../src/dom/index.js';
import { createWindow } from '../../src/dom/window.js';

describe('Element event handler properties', () => {
  it('element.onclick = fn registers listener', () => {
    const el = new Element('div');
    let called = false;
    const fn = (): void => {
      called = true;
    };
    el.onclick = fn;
    expect(el.onclick).toBe(fn);
    el.dispatchEvent(new Event('click'));
    expect(called).toBe(true);
  });

  it('element.onclick = null removes listener', () => {
    const el = new Element('div');
    let count = 0;
    el.onclick = (): void => {
      count++;
    };
    el.dispatchEvent(new Event('click'));
    expect(count).toBe(1);
    el.onclick = null;
    expect(el.onclick).toBeNull();
    el.dispatchEvent(new Event('click'));
    expect(count).toBe(1);
  });

  it('element.onclick fires on dispatchEvent', () => {
    const el = new Element('div');
    const events: Event[] = [];
    el.onclick = (e: Event): void => {
      events.push(e);
    };
    const evt = new Event('click');
    el.dispatchEvent(evt);
    expect(events.length).toBe(1);
    expect(events[0]).toBe(evt);
  });

  it('replacing handler removes old one', () => {
    const el = new Element('div');
    let firstCalled = false;
    let secondCalled = false;
    el.onclick = (): void => {
      firstCalled = true;
    };
    el.onclick = (): void => {
      secondCalled = true;
    };
    el.dispatchEvent(new Event('click'));
    expect(firstCalled).toBe(false);
    expect(secondCalled).toBe(true);
  });

  it('ondblclick works', () => {
    const el = new Element('div');
    let called = false;
    el.ondblclick = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('dblclick'));
    expect(called).toBe(true);
  });

  it('onmousedown works', () => {
    const el = new Element('div');
    let called = false;
    el.onmousedown = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('mousedown'));
    expect(called).toBe(true);
  });

  it('onkeydown works', () => {
    const el = new Element('div');
    let called = false;
    el.onkeydown = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('keydown'));
    expect(called).toBe(true);
  });

  it('onfocus works', () => {
    const el = new Element('div');
    let called = false;
    el.onfocus = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('focus'));
    expect(called).toBe(true);
  });

  it('onchange works', () => {
    const el = new Element('div');
    let called = false;
    el.onchange = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('change'));
    expect(called).toBe(true);
  });

  it('oninput works', () => {
    const el = new Element('div');
    let called = false;
    el.oninput = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('input'));
    expect(called).toBe(true);
  });

  it('onsubmit works', () => {
    const el = new Element('div');
    let called = false;
    el.onsubmit = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('submit'));
    expect(called).toBe(true);
  });

  it('onscroll works', () => {
    const el = new Element('div');
    let called = false;
    el.onscroll = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('scroll'));
    expect(called).toBe(true);
  });

  it('onload works on element', () => {
    const el = new Element('img');
    let called = false;
    el.onload = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('load'));
    expect(called).toBe(true);
  });

  it('onerror works on element', () => {
    const el = new Element('img');
    let called = false;
    el.onerror = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('error'));
    expect(called).toBe(true);
  });

  it('onresize works on element', () => {
    const el = new Element('div');
    let called = false;
    el.onresize = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('resize'));
    expect(called).toBe(true);
  });

  it('ondrag works', () => {
    const el = new Element('div');
    let called = false;
    el.ondrag = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('drag'));
    expect(called).toBe(true);
  });

  it('ondrop works', () => {
    const el = new Element('div');
    let called = false;
    el.ondrop = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('drop'));
    expect(called).toBe(true);
  });

  it('onwheel works', () => {
    const el = new Element('div');
    let called = false;
    el.onwheel = (): void => {
      called = true;
    };
    el.dispatchEvent(new Event('wheel'));
    expect(called).toBe(true);
  });

  it('getter returns null when no handler set', () => {
    const el = new Element('div');
    expect(el.onclick).toBeNull();
    expect(el.onmousedown).toBeNull();
    expect(el.onkeydown).toBeNull();
  });

  it('handler coexists with addEventListener listeners', () => {
    const el = new Element('div');
    const calls: string[] = [];
    el.addEventListener('click', () => {
      calls.push('addEventListener');
    });
    el.onclick = (): void => {
      calls.push('onclick');
    };
    el.dispatchEvent(new Event('click'));
    expect(calls).toContain('addEventListener');
    expect(calls).toContain('onclick');
  });
});

describe('Window event handler properties', () => {
  it('window.onload works', () => {
    const win = createWindow();
    let called = false;
    win.onload = (): void => {
      called = true;
    };
    expect(win.onload).not.toBeNull();
    win.dispatchEvent(new Event('load'));
    expect(called).toBe(true);
  });

  it('window.onerror works', () => {
    const win = createWindow();
    let called = false;
    win.onerror = (): void => {
      called = true;
    };
    win.dispatchEvent(new Event('error'));
    expect(called).toBe(true);
  });

  it('window.onresize works', () => {
    const win = createWindow();
    let called = false;
    win.onresize = (): void => {
      called = true;
    };
    win.dispatchEvent(new Event('resize'));
    expect(called).toBe(true);
  });

  it('window.onpopstate works', () => {
    const win = createWindow();
    let called = false;
    win.onpopstate = (): void => {
      called = true;
    };
    win.dispatchEvent(new Event('popstate'));
    expect(called).toBe(true);
  });

  it('window.onhashchange works', () => {
    const win = createWindow();
    let called = false;
    win.onhashchange = (): void => {
      called = true;
    };
    win.dispatchEvent(new Event('hashchange'));
    expect(called).toBe(true);
  });

  it('window.onbeforeunload works', () => {
    const win = createWindow();
    let called = false;
    win.onbeforeunload = (): void => {
      called = true;
    };
    win.dispatchEvent(new Event('beforeunload'));
    expect(called).toBe(true);
  });

  it('window.onfocus works', () => {
    const win = createWindow();
    let called = false;
    win.onfocus = (): void => {
      called = true;
    };
    win.dispatchEvent(new Event('focus'));
    expect(called).toBe(true);
  });

  it('window.onblur works', () => {
    const win = createWindow();
    let called = false;
    win.onblur = (): void => {
      called = true;
    };
    win.dispatchEvent(new Event('blur'));
    expect(called).toBe(true);
  });

  it('window.onload = null removes listener', () => {
    const win = createWindow();
    let count = 0;
    win.onload = (): void => {
      count++;
    };
    win.dispatchEvent(new Event('load'));
    expect(count).toBe(1);
    win.onload = null;
    expect(win.onload).toBeNull();
    win.dispatchEvent(new Event('load'));
    expect(count).toBe(1);
  });

  it('replacing window handler removes old one', () => {
    const win = createWindow();
    let firstCalled = false;
    let secondCalled = false;
    win.onload = (): void => {
      firstCalled = true;
    };
    win.onload = (): void => {
      secondCalled = true;
    };
    win.dispatchEvent(new Event('load'));
    expect(firstCalled).toBe(false);
    expect(secondCalled).toBe(true);
  });
});
