import { describe, it } from 'node:test';
import {
  expect,
  Document,
  Event,
  fn,
  useFakeTimers,
  useRealTimers,
} from '../../src/index.js';

describe('e2e: complete testing workflow', () => {
  it('should simulate a full UI component test lifecycle', () => {
    // Setup: create a document with a form
    const doc = new Document();
    const form = doc.createElement('form');
    const input = doc.createElement('input');
    const button = doc.createElement('button');

    input.setAttribute('type', 'text');
    input.setAttribute('id', 'name-input');
    button.setAttribute('type', 'submit');
    button.textContent = 'Submit';

    form.appendChild(input);
    form.appendChild(button);
    doc.appendChild(form);

    // Verify structure
    expect(form.childNodes).toHaveLength(2);
    expect(doc.getElementById('name-input')).toBe(input);
    expect(button.textContent).toBe('Submit');

    // Simulate event handling
    const submitHandler = fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', submitHandler);
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(submitHandler.mock.calls).toHaveLength(1);
  });

  it('should simulate async operations with fake timers', () => {
    const timer = useFakeTimers();
    const doc = new Document();
    const status = doc.createElement('div');
    status.setAttribute('id', 'status');
    status.textContent = 'Loading...';
    doc.appendChild(status);

    expect(status.textContent).toBe('Loading...');

    // Simulate delayed data fetch
    globalThis.setTimeout(() => {
      status.textContent = 'Data loaded';
    }, 2000);

    timer.advanceTimersByTime(2000);
    expect(status.textContent).toBe('Data loaded');

    useRealTimers();
  });

  it('should simulate class toggling interactions', () => {
    const doc = new Document();
    const menu = doc.createElement('nav');
    menu.setAttribute('id', 'menu');
    const toggleBtn = doc.createElement('button');
    doc.appendChild(menu);
    doc.appendChild(toggleBtn);

    const toggleHandler = fn(() => {
      menu.classList.toggle('open');
    });

    toggleBtn.addEventListener('click', toggleHandler);

    // Initially no class
    expect(menu.classList.contains('open')).toBe(false);

    // First click: open
    toggleBtn.dispatchEvent(new Event('click'));
    expect(menu.classList.contains('open')).toBe(true);
    expect(toggleHandler.mock.calls).toHaveLength(1);

    // Second click: close
    toggleBtn.dispatchEvent(new Event('click'));
    expect(menu.classList.contains('open')).toBe(false);
    expect(toggleHandler.mock.calls).toHaveLength(2);
  });

  it('should simulate building a dynamic list', () => {
    const doc = new Document();
    const list = doc.createElement('ul');
    doc.appendChild(list);

    const items = ['Buy groceries', 'Write tests', 'Deploy app'];
    items.forEach((text, i) => {
      const li = doc.createElement('li');
      li.setAttribute('id', `item-${i}`);
      li.textContent = text;
      list.appendChild(li);
    });

    expect(list.childNodes).toHaveLength(3);

    // Verify each item
    for (let i = 0; i < items.length; i++) {
      const li = doc.getElementById(`item-${i}`);
      expect(li).toBeDefined();
      expect(li!.textContent).toBe(items[i]);
    }

    // Remove middle item
    const middle = doc.getElementById('item-1')!;
    list.removeChild(middle);
    expect(list.childNodes).toHaveLength(2);
  });

  it('should simulate event delegation pattern', () => {
    const doc = new Document();
    const container = doc.createElement('div');
    const btn1 = doc.createElement('button');
    const btn2 = doc.createElement('button');
    btn1.setAttribute('id', 'btn-1');
    btn2.setAttribute('id', 'btn-2');
    container.appendChild(btn1);
    container.appendChild(btn2);
    doc.appendChild(container);

    const clickLog = fn();

    // Attach listeners to individual buttons
    btn1.addEventListener('click', () => clickLog('btn-1'));
    btn2.addEventListener('click', () => clickLog('btn-2'));

    btn1.dispatchEvent(new Event('click'));
    btn2.dispatchEvent(new Event('click'));
    btn1.dispatchEvent(new Event('click'));

    expect(clickLog.mock.calls).toHaveLength(3);
    expect(clickLog.mock.calls[0]).toEqual(['btn-1']);
    expect(clickLog.mock.calls[1]).toEqual(['btn-2']);
    expect(clickLog.mock.calls[2]).toEqual(['btn-1']);
  });
});
