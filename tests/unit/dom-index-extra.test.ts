import { describe, it, expect } from '../../src/index.js';
import { Document, Element } from '../../src/dom/index.js';

describe('Node.nodeValue', () => {
  it('returns null for element nodes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    expect(div.nodeValue).toBeNull();
  });

  it('set nodeValue is a no-op for element nodes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.nodeValue = 'test';
    expect(div.nodeValue).toBeNull();
  });
});

describe('Comment node methods', () => {
  it('Comment._getTextContent returns data', () => {
    const doc = new Document();
    const comment = doc.createComment('test comment');
    expect(comment.textContent).toBe('test comment');
  });

  it('Comment.textContent setter updates data', () => {
    const doc = new Document();
    const comment = doc.createComment('old');
    comment.textContent = 'new';
    expect(comment.textContent).toBe('new');
  });

  it('Comment._cloneNode returns a clone', () => {
    const doc = new Document();
    const comment = doc.createComment('my comment');
    // cloneNode calls _cloneNode internally
    const clone = comment.cloneNode();
    expect(clone.textContent).toBe('my comment');
    expect(clone).not.toBe(comment);
  });
});

describe('Element.shadowRoot with closed mode', () => {
  it('shadowRoot returns null for closed shadow root', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    doc.appendChild(div);
    div.attachShadow({ mode: 'closed' });
    expect(div.shadowRoot).toBeNull();
  });

  it('_internalShadowRoot returns shadow root regardless of mode', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    doc.appendChild(div);
    const shadow = div.attachShadow({ mode: 'closed' });
    expect(
      (div as unknown as Record<string, unknown>)._internalShadowRoot,
    ).toBe(shadow);
  });
});

describe('Element.dataset - has/in operator', () => {
  it('dataset has returns true for existing data attributes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.setAttribute('data-foo', 'bar');
    expect('foo' in div.dataset).toBe(true);
  });

  it('dataset has returns false for non-existing data attributes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    expect('foo' in div.dataset).toBe(false);
  });

  it('dataset has returns false for symbol properties', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const sym = Symbol('test');
    expect(sym in div.dataset).toBe(false);
  });
});

describe('Element.click()', () => {
  it('dispatches a click event', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    doc.appendChild(div);
    let clicked = false;
    div.addEventListener('click', () => {
      clicked = true;
    });
    div.click();
    expect(clicked).toBe(true);
  });
});

describe('Element on-event handlers', () => {
  const eventNames = [
    'click',
    'dblclick',
    'mousedown',
    'mouseup',
    'mousemove',
    'mouseover',
    'mouseout',
    'mouseenter',
    'mouseleave',
    'keydown',
    'keyup',
    'keypress',
    'focus',
    'blur',
    'change',
    'input',
    'submit',
    'reset',
    'scroll',
    'wheel',
    'drag',
    'dragstart',
    'dragend',
    'dragover',
    'dragenter',
    'dragleave',
    'drop',
    'load',
    'error',
    'resize',
  ];

  for (const eventName of eventNames) {
    it(`on${eventName} getter/setter works`, () => {
      const doc = new Document();
      const div = doc.createElement('div');
      doc.appendChild(div);

      const propName = `on${eventName}` as keyof Element;

      const elem = div as unknown as Record<string, unknown>;

      // Initially null
      expect(elem[propName]).toBeNull();

      // Set handler
      const handler = () => {};
      elem[propName] = handler;
      expect(elem[propName]).toBe(handler);

      // Replace handler
      const handler2 = () => {};
      elem[propName] = handler2;
      expect(elem[propName]).toBe(handler2);

      // Clear handler
      elem[propName] = null;
      expect(elem[propName]).toBeNull();
    });
  }
});

describe('Element.onclick setter replaces previous handler', () => {
  it('replaces event handler and removes old one from listeners', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    doc.appendChild(div);
    let count1 = 0;
    let count2 = 0;

    const handler1 = () => {
      count1++;
    };
    const handler2 = () => {
      count2++;
    };

    div.onclick = handler1;
    div.click();
    expect(count1).toBe(1);
    expect(count2).toBe(0);

    div.onclick = handler2;
    div.click();
    expect(count1).toBe(1); // old handler should not fire again
    expect(count2).toBe(1);
  });
});
