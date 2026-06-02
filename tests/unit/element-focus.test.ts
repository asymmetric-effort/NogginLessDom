import { describe, it, expect } from '../../src/index.js';
import { Document, Element, Event } from '../../src/dom/index.js';

describe('Element.focus()', () => {
  it('dispatches focus event', () => {
    const el = new Element('div');
    let focusFired = false;
    el.addEventListener('focus', () => {
      focusFired = true;
    });
    el.focus();
    expect(focusFired).toBe(true);
  });

  it('focus event does not bubble', () => {
    const doc = new Document();
    const parent = new Element('div');
    const child = new Element('input');
    doc.appendChild(parent);
    parent.appendChild(child);
    let parentGotFocus = false;
    parent.addEventListener('focus', () => {
      parentGotFocus = true;
    });
    child.focus();
    expect(parentGotFocus).toBe(false);
  });

  it('focus event has correct type', () => {
    const el = new Element('input');
    let eventType = '';
    el.addEventListener('focus', (e: Event) => {
      eventType = e.type;
    });
    el.focus();
    expect(eventType).toBe('focus');
  });
});

describe('Element.blur()', () => {
  it('dispatches blur event', () => {
    const el = new Element('div');
    let blurFired = false;
    el.addEventListener('blur', () => {
      blurFired = true;
    });
    el.blur();
    expect(blurFired).toBe(true);
  });

  it('blur event does not bubble', () => {
    const parent = new Element('div');
    const child = new Element('input');
    parent.appendChild(child);
    let parentGotBlur = false;
    parent.addEventListener('blur', () => {
      parentGotBlur = true;
    });
    child.blur();
    expect(parentGotBlur).toBe(false);
  });

  it('blur event has correct type', () => {
    const el = new Element('input');
    let eventType = '';
    el.addEventListener('blur', (e: Event) => {
      eventType = e.type;
    });
    el.blur();
    expect(eventType).toBe('blur');
  });
});

describe('Element.tabIndex', () => {
  it('get returns default -1 for non-interactive elements', () => {
    const el = new Element('div');
    expect(el.tabIndex).toBe(-1);
  });

  it('get returns 0 for interactive elements', () => {
    const button = new Element('button');
    expect(button.tabIndex).toBe(0);
  });

  it('set and get work', () => {
    const el = new Element('div');
    el.tabIndex = 5;
    expect(el.tabIndex).toBe(5);
  });

  it('can be set to 0', () => {
    const el = new Element('div');
    el.tabIndex = 0;
    expect(el.tabIndex).toBe(0);
  });

  it('can be set to -1 on interactive element', () => {
    const el = new Element('button');
    el.tabIndex = -1;
    expect(el.tabIndex).toBe(-1);
  });
});

describe('Element.contentEditable', () => {
  it('defaults to inherit', () => {
    const el = new Element('div');
    expect(el.contentEditable).toBe('inherit');
  });

  it('get/set works', () => {
    const el = new Element('div');
    el.contentEditable = 'true';
    expect(el.contentEditable).toBe('true');
  });

  it('can be set to false', () => {
    const el = new Element('div');
    el.contentEditable = 'false';
    expect(el.contentEditable).toBe('false');
  });
});

describe('Element.isContentEditable', () => {
  it('returns true when contentEditable is true', () => {
    const el = new Element('div');
    el.contentEditable = 'true';
    expect(el.isContentEditable).toBe(true);
  });

  it('returns false when contentEditable is false', () => {
    const el = new Element('div');
    el.contentEditable = 'false';
    expect(el.isContentEditable).toBe(false);
  });

  it('inherits from parent when set to inherit', () => {
    const parent = new Element('div');
    const child = new Element('span');
    parent.appendChild(child);
    parent.contentEditable = 'true';
    expect(child.isContentEditable).toBe(true);
  });

  it('returns false when inherit and no parent is editable', () => {
    const parent = new Element('div');
    const child = new Element('span');
    parent.appendChild(child);
    expect(child.isContentEditable).toBe(false);
  });

  it('false overrides parent true', () => {
    const parent = new Element('div');
    const child = new Element('span');
    parent.appendChild(child);
    parent.contentEditable = 'true';
    child.contentEditable = 'false';
    expect(child.isContentEditable).toBe(false);
  });

  it('inherits through multiple levels', () => {
    const grandparent = new Element('div');
    const parent = new Element('div');
    const child = new Element('span');
    grandparent.appendChild(parent);
    parent.appendChild(child);
    grandparent.contentEditable = 'true';
    expect(child.isContentEditable).toBe(true);
  });

  it('returns false with no parent and inherit', () => {
    const el = new Element('div');
    expect(el.isContentEditable).toBe(false);
  });
});
