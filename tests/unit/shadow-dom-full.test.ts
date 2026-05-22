import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element, Event } from '../../src/dom/index.js';
import { HTMLSlotElement } from '../../src/dom/html-elements.js';

describe('Shadow DOM Full Support', () => {
  describe('HTMLSlotElement', () => {
    it('should exist and have default name property', () => {
      const slot = new HTMLSlotElement();
      assert.ok(slot instanceof HTMLSlotElement);
      assert.ok(slot instanceof Element);
      assert.strictEqual(slot.name, '');
      assert.strictEqual(slot.tagName, 'SLOT');
    });

    it('should allow setting name property', () => {
      const slot = new HTMLSlotElement();
      slot.name = 'content';
      assert.strictEqual(slot.name, 'content');
    });

    it('should be creatable via document.createElement', () => {
      const doc = new Document();
      const slot = doc.createElement('slot');
      assert.ok(slot instanceof HTMLSlotElement);
    });

    it('assignedNodes returns light DOM children assigned to default slot', () => {
      const doc = new Document();
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      const slot = doc.createElement('slot') as HTMLSlotElement;
      shadow.appendChild(slot);

      const lightChild = doc.createElement('span');
      host.appendChild(lightChild);
      const textChild = doc.createTextNode('hello');
      host.appendChild(textChild);

      const assigned = slot.assignedNodes();
      assert.strictEqual(assigned.length, 2);
      assert.strictEqual(assigned[0], lightChild);
      assert.strictEqual(assigned[1], textChild);
    });

    it('assignedNodes returns light DOM children for named slots', () => {
      const doc = new Document();
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      const slot = doc.createElement('slot') as HTMLSlotElement;
      slot.name = 'header';
      shadow.appendChild(slot);

      const child1 = doc.createElement('span');
      child1.slot = 'header';
      host.appendChild(child1);

      const child2 = doc.createElement('div');
      child2.slot = 'footer';
      host.appendChild(child2);

      const assigned = slot.assignedNodes();
      assert.strictEqual(assigned.length, 1);
      assert.strictEqual(assigned[0], child1);
    });

    it('assignedElements returns only element nodes', () => {
      const doc = new Document();
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      const slot = doc.createElement('slot') as HTMLSlotElement;
      shadow.appendChild(slot);

      const lightChild = doc.createElement('span');
      host.appendChild(lightChild);
      const textChild = doc.createTextNode('hello');
      host.appendChild(textChild);

      const assigned = slot.assignedElements();
      assert.strictEqual(assigned.length, 1);
      assert.strictEqual(assigned[0], lightChild);
    });

    it('assignedNodes returns empty array if no host', () => {
      const slot = new HTMLSlotElement();
      const assigned = slot.assignedNodes();
      assert.strictEqual(assigned.length, 0);
    });
  });

  describe('Element.slot property', () => {
    it('should have default empty string slot property', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.slot, '');
    });

    it('should allow setting slot property', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.slot = 'main';
      assert.strictEqual(el.slot, 'main');
    });

    it('should reflect the slot attribute', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttribute('slot', 'header');
      assert.strictEqual(el.slot, 'header');
    });

    it('should update the slot attribute when slot property is set', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.slot = 'footer';
      assert.strictEqual(el.getAttribute('slot'), 'footer');
    });
  });

  describe('Element.assignedSlot', () => {
    it('should return null when element is not in a shadow host', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.assignedSlot, null);
    });

    it('should return the correct slot element for default slot', () => {
      const doc = new Document();
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      const slot = doc.createElement('slot') as HTMLSlotElement;
      shadow.appendChild(slot);

      const child = doc.createElement('span');
      host.appendChild(child);

      assert.strictEqual(child.assignedSlot, slot);
    });

    it('should return the correct named slot element', () => {
      const doc = new Document();
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      const slot = doc.createElement('slot') as HTMLSlotElement;
      slot.name = 'content';
      shadow.appendChild(slot);

      const child = doc.createElement('span');
      child.slot = 'content';
      host.appendChild(child);

      assert.strictEqual(child.assignedSlot, slot);
    });

    it('should return null if no matching slot exists', () => {
      const doc = new Document();
      const host = doc.createElement('div');
      host.attachShadow({ mode: 'open' });

      const child = doc.createElement('span');
      child.slot = 'nonexistent';
      host.appendChild(child);

      assert.strictEqual(child.assignedSlot, null);
    });

    it('should return null for closed shadow root', () => {
      const doc = new Document();
      const host = doc.createElement('div');
      host.attachShadow({ mode: 'closed' });

      const child = doc.createElement('span');
      host.appendChild(child);

      assert.strictEqual(child.assignedSlot, null);
    });
  });

  describe('Event.composed property', () => {
    it('should default to false', () => {
      const event = new Event('test');
      assert.strictEqual(event.composed, false);
    });

    it('should be settable via constructor options', () => {
      const event = new Event('test', { composed: true });
      assert.strictEqual(event.composed, true);
    });

    it('should be false when not specified', () => {
      const event = new Event('click', { bubbles: true });
      assert.strictEqual(event.composed, false);
    });
  });

  describe('Composed events cross shadow boundaries', () => {
    it('composed event should bubble from shadow DOM to host ancestor', () => {
      const doc = new Document();
      const container = doc.createElement('div');
      const host = doc.createElement('div');
      container.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const inner = doc.createElement('span');
      shadow.appendChild(inner);

      const events: string[] = [];
      container.addEventListener('test', () => {
        events.push('container');
      });

      // Dispatch a composed, bubbling event from inside the shadow
      const event = new Event('test', { bubbles: true, composed: true });
      inner.dispatchEvent(event);

      assert.ok(events.includes('container'));
    });

    it('non-composed event should NOT cross shadow boundary', () => {
      const doc = new Document();
      const container = doc.createElement('div');
      const host = doc.createElement('div');
      container.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const inner = doc.createElement('span');
      shadow.appendChild(inner);

      const events: string[] = [];
      container.addEventListener('test', () => {
        events.push('container');
      });

      // Dispatch a non-composed, bubbling event from inside the shadow
      const event = new Event('test', { bubbles: true, composed: false });
      inner.dispatchEvent(event);

      assert.strictEqual(events.length, 0);
    });

    it('composed event should include host in event path', () => {
      const doc = new Document();
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      const inner = doc.createElement('span');
      shadow.appendChild(inner);

      const event = new Event('test', { bubbles: true, composed: true });
      inner.dispatchEvent(event);

      const path = event.composedPath();
      assert.ok(path.includes(inner));
      assert.ok(path.includes(host));
    });
  });
});
