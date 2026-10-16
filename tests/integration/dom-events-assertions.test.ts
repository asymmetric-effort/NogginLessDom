import { describe, it } from 'node:test';
import {
  expect,
  Document,
  Element,
  Event,
  CustomEvent,
  MouseEvent,
  KeyboardEvent,
  FocusEvent,
  InputEvent,
  fn,
} from '../../src/index.js';

describe('integration: DOM + Events + Assertions', () => {
  it('should handle click events on buttons and verify DOM state', () => {
    const doc = new Document();
    const button = doc.createElement('button');
    button.textContent = 'Click me';
    button.setAttribute('data-clicks', '0');
    doc.appendChild(button);

    button.addEventListener('click', () => {
      const count =
        parseInt(button.getAttribute('data-clicks') ?? '0', 10) + 1;
      button.setAttribute('data-clicks', String(count));
      button.textContent = `Clicked ${count} times`;
    });

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(button.getAttribute('data-clicks')).toBe('1');
    expect(button.textContent).toBe('Clicked 1 times');

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(button.getAttribute('data-clicks')).toBe('2');
  });

  it('should handle keyboard events and update input value', () => {
    const doc = new Document();
    const input = doc.createElement('input') as Element;
    input.setAttribute('type', 'text');
    doc.appendChild(input);

    const keyHandler = fn();
    input.addEventListener('keydown', keyHandler);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );
    expect(keyHandler).toHaveBeenCalledOnce();

    const event = keyHandler.mock.calls[0][0] as KeyboardEvent;
    expect(event.key).toBe('a');
  });

  it('should handle focus and blur events', () => {
    const doc = new Document();
    const input = doc.createElement('input');
    doc.appendChild(input);

    const focusHandler = fn();
    const blurHandler = fn();
    input.addEventListener('focus', focusHandler);
    input.addEventListener('blur', blurHandler);

    input.dispatchEvent(new FocusEvent('focus'));
    expect(focusHandler).toHaveBeenCalledOnce();
    expect(blurHandler).not.toHaveBeenCalled();

    input.dispatchEvent(new FocusEvent('blur'));
    expect(blurHandler).toHaveBeenCalledOnce();
  });

  it('should handle input events on form fields', () => {
    const doc = new Document();
    const textarea = doc.createElement('textarea');
    doc.appendChild(textarea);

    const inputHandler = fn();
    textarea.addEventListener('input', inputHandler);

    textarea.dispatchEvent(
      new InputEvent('input', { data: 'hello', inputType: 'insertText' }),
    );
    expect(inputHandler).toHaveBeenCalledOnce();
  });

  it('should test event bubbling through nested elements', () => {
    const doc = new Document();
    const outer = doc.createElement('div');
    const inner = doc.createElement('div');
    const button = doc.createElement('button');
    outer.appendChild(inner);
    inner.appendChild(button);
    doc.appendChild(outer);

    const outerHandler = fn();
    const innerHandler = fn();
    const buttonHandler = fn();

    outer.addEventListener('click', outerHandler);
    inner.addEventListener('click', innerHandler);
    button.addEventListener('click', buttonHandler);

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(buttonHandler).toHaveBeenCalledOnce();
    expect(innerHandler).toHaveBeenCalledOnce();
    expect(outerHandler).toHaveBeenCalledOnce();
  });

  it('should stop propagation when requested', () => {
    const doc = new Document();
    const parent = doc.createElement('div');
    const child = doc.createElement('span');
    parent.appendChild(child);
    doc.appendChild(parent);

    const parentHandler = fn();
    parent.addEventListener('click', parentHandler);

    child.addEventListener('click', (e: Event) => {
      e.stopPropagation();
    });

    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(parentHandler).not.toHaveBeenCalled();
  });

  it('should handle CustomEvent with detail payload', () => {
    const doc = new Document();
    const element = doc.createElement('div');
    doc.appendChild(element);

    const handler = fn();
    element.addEventListener('custom-action', handler);

    const detail = { action: 'save', data: { id: 42 } };
    element.dispatchEvent(
      new CustomEvent('custom-action', { detail, bubbles: true }),
    );

    expect(handler).toHaveBeenCalledOnce();
    const received = handler.mock.calls[0][0] as CustomEvent;
    expect(received.detail).toEqual(detail);
    expect(received.detail.action).toBe('save');
    expect(received.detail.data.id).toBe(42);
  });

  it('should track classList changes triggered by events', () => {
    const doc = new Document();
    const element = doc.createElement('div');
    element.classList.add('inactive');
    doc.appendChild(element);

    element.addEventListener('click', () => {
      element.classList.remove('inactive');
      element.classList.add('active');
    });

    expect(element.classList.contains('inactive')).toBe(true);
    expect(element.classList.contains('active')).toBe(false);

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(element.classList.contains('inactive')).toBe(false);
    expect(element.classList.contains('active')).toBe(true);
  });

  it('should manipulate DOM tree and verify with querySelector patterns', () => {
    const doc = new Document();
    const list = doc.createElement('ul');
    list.setAttribute('id', 'items');
    doc.appendChild(list);

    for (let i = 0; i < 3; i++) {
      const li = doc.createElement('li');
      li.setAttribute('class', 'item');
      li.setAttribute('data-index', String(i));
      li.textContent = `Item ${i}`;
      list.appendChild(li);
    }

    expect(list.childNodes).toHaveLength(3);
    expect(list.childNodes[0].textContent).toBe('Item 0');
    expect(list.childNodes[2].textContent).toBe('Item 2');
    expect(doc.getElementById('items')).toBe(list);

    // Remove middle item
    list.removeChild(list.childNodes[1]);
    expect(list.childNodes).toHaveLength(2);
    expect(list.childNodes[1].textContent).toBe('Item 2');
  });

  it('should handle nested event delegation pattern', () => {
    const doc = new Document();
    const nav = doc.createElement('nav');
    const links = ['Home', 'About', 'Contact'];
    const clicked: string[] = [];

    nav.addEventListener('click', (e: Event) => {
      const target = e.target as Element;
      if (target.tagName === 'A') {
        clicked.push(target.textContent ?? '');
      }
    });

    for (const label of links) {
      const a = doc.createElement('a');
      a.textContent = label;
      a.setAttribute('href', '#');
      nav.appendChild(a);
    }
    doc.appendChild(nav);

    // Click each link
    for (const child of Array.from(nav.childNodes)) {
      (child as Element).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    }

    expect(clicked).toEqual(['Home', 'About', 'Contact']);
    expect(clicked).toHaveLength(3);
  });

  it('should build and manipulate a complex form with assertions', () => {
    const doc = new Document();
    const form = doc.createElement('form');
    const fieldset = doc.createElement('fieldset');
    const legend = doc.createElement('legend');
    legend.textContent = 'User Info';

    const nameInput = doc.createElement('input');
    nameInput.setAttribute('name', 'username');
    nameInput.setAttribute('type', 'text');
    nameInput.setAttribute('required', '');

    const emailInput = doc.createElement('input');
    emailInput.setAttribute('name', 'email');
    emailInput.setAttribute('type', 'email');

    const submitBtn = doc.createElement('button');
    submitBtn.setAttribute('type', 'submit');
    submitBtn.textContent = 'Submit';

    fieldset.appendChild(legend);
    fieldset.appendChild(nameInput);
    fieldset.appendChild(emailInput);
    form.appendChild(fieldset);
    form.appendChild(submitBtn);
    doc.appendChild(form);

    // Verify structure
    expect(form.childNodes).toHaveLength(2);
    expect(fieldset.childNodes).toHaveLength(3);
    expect(legend.textContent).toBe('User Info');
    expect(nameInput.getAttribute('required')).toBe('');
    expect(emailInput.getAttribute('type')).toBe('email');

    // Simulate form interaction
    const submitHandler = fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', submitHandler);

    form.dispatchEvent(new Event('submit', { bubbles: true }));
    expect(submitHandler).toHaveBeenCalledOnce();
  });
});
