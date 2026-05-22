import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Element, Event } from '../../src/dom/index.js';

describe('Event advanced', () => {
  describe('stopImmediatePropagation', () => {
    it('should prevent other listeners on the same element from firing', () => {
      const el = new Element('div');
      const calls: string[] = [];
      el.addEventListener('click', (e: Event) => {
        calls.push('first');
        e.stopImmediatePropagation();
      });
      el.addEventListener('click', () => {
        calls.push('second');
      });
      el.dispatchEvent(new Event('click'));
      assert.deepStrictEqual(calls, ['first']);
    });

    it('should also prevent bubbling', () => {
      const parent = new Element('div');
      const child = new Element('span');
      parent.appendChild(child);
      const calls: string[] = [];
      child.addEventListener('click', (e: Event) => {
        calls.push('child');
        e.stopImmediatePropagation();
      });
      parent.addEventListener('click', () => {
        calls.push('parent');
      });
      child.dispatchEvent(new Event('click', { bubbles: true }));
      assert.deepStrictEqual(calls, ['child']);
    });
  });

  describe('addEventListener with { once: true }', () => {
    it('should auto-remove listener after first invocation', () => {
      const el = new Element('div');
      const calls: number[] = [];
      el.addEventListener(
        'click',
        () => {
          calls.push(1);
        },
        { once: true },
      );
      el.dispatchEvent(new Event('click'));
      el.dispatchEvent(new Event('click'));
      assert.deepStrictEqual(calls, [1]);
    });
  });

  describe('addEventListener with { capture: true }', () => {
    it('should fire capture listeners during capture phase', () => {
      const parent = new Element('div');
      const child = new Element('span');
      parent.appendChild(child);
      const calls: string[] = [];
      parent.addEventListener(
        'click',
        () => {
          calls.push('parent-capture');
        },
        { capture: true },
      );
      parent.addEventListener('click', () => {
        calls.push('parent-bubble');
      });
      child.addEventListener('click', () => {
        calls.push('child');
      });
      child.dispatchEvent(new Event('click', { bubbles: true }));
      assert.deepStrictEqual(calls, [
        'parent-capture',
        'child',
        'parent-bubble',
      ]);
    });
  });

  describe('capture phase fires before bubble phase', () => {
    it('should fire in order: capture root->target, target, bubble target->root', () => {
      const grandparent = new Element('div');
      const parent = new Element('div');
      const child = new Element('span');
      grandparent.appendChild(parent);
      parent.appendChild(child);
      const calls: string[] = [];
      grandparent.addEventListener(
        'click',
        () => {
          calls.push('gp-capture');
        },
        true,
      );
      parent.addEventListener(
        'click',
        () => {
          calls.push('p-capture');
        },
        true,
      );
      child.addEventListener('click', () => {
        calls.push('child-bubble');
      });
      child.addEventListener(
        'click',
        () => {
          calls.push('child-capture');
        },
        true,
      );
      parent.addEventListener('click', () => {
        calls.push('p-bubble');
      });
      grandparent.addEventListener('click', () => {
        calls.push('gp-bubble');
      });
      child.dispatchEvent(new Event('click', { bubbles: true }));
      assert.deepStrictEqual(calls, [
        'gp-capture',
        'p-capture',
        'child-bubble',
        'child-capture',
        'p-bubble',
        'gp-bubble',
      ]);
    });
  });

  describe('eventPhase values during dispatch', () => {
    it('should report correct phase values', () => {
      const parent = new Element('div');
      const child = new Element('span');
      parent.appendChild(child);
      const phases: number[] = [];
      parent.addEventListener(
        'click',
        (e: Event) => {
          phases.push(e.eventPhase);
        },
        true,
      );
      child.addEventListener('click', (e: Event) => {
        phases.push(e.eventPhase);
      });
      parent.addEventListener('click', (e: Event) => {
        phases.push(e.eventPhase);
      });
      child.dispatchEvent(new Event('click', { bubbles: true }));
      // capture=1, at_target=2, bubbling=3
      assert.deepStrictEqual(phases, [1, 2, 3]);
    });

    it('should be NONE (0) before dispatch', () => {
      const ev = new Event('click');
      assert.strictEqual(ev.eventPhase, 0);
    });
  });

  describe('composedPath', () => {
    it('should return correct path from target to root', () => {
      const grandparent = new Element('div');
      const parent = new Element('div');
      const child = new Element('span');
      grandparent.appendChild(parent);
      parent.appendChild(child);
      let path: Node[] = [];
      child.addEventListener('click', (e: Event) => {
        path = e.composedPath();
      });
      child.dispatchEvent(new Event('click'));
      assert.deepStrictEqual(path, [child, parent, grandparent]);
    });

    it('should return empty array when not dispatched', () => {
      const ev = new Event('click');
      assert.deepStrictEqual(ev.composedPath(), []);
    });
  });

  describe('boolean third arg = capture', () => {
    it('should treat true as { capture: true }', () => {
      const parent = new Element('div');
      const child = new Element('span');
      parent.appendChild(child);
      const calls: string[] = [];
      parent.addEventListener(
        'click',
        () => {
          calls.push('capture');
        },
        true,
      );
      parent.addEventListener(
        'click',
        () => {
          calls.push('bubble');
        },
        false,
      );
      child.dispatchEvent(new Event('click', { bubbles: true }));
      assert.deepStrictEqual(calls, ['capture', 'bubble']);
    });
  });

  describe('isTrusted', () => {
    it('should be false for programmatic events', () => {
      const ev = new Event('click');
      assert.strictEqual(ev.isTrusted, false);
    });
  });

  describe('timeStamp', () => {
    it('should be set at construction time', () => {
      const before = Date.now();
      const ev = new Event('click');
      const after = Date.now();
      assert.ok(ev.timeStamp >= before);
      assert.ok(ev.timeStamp <= after);
    });
  });

  describe('Event phase constants', () => {
    it('should have static phase constants', () => {
      assert.strictEqual(Event.NONE, 0);
      assert.strictEqual(Event.CAPTURING_PHASE, 1);
      assert.strictEqual(Event.AT_TARGET, 2);
      assert.strictEqual(Event.BUBBLING_PHASE, 3);
    });
  });
});
