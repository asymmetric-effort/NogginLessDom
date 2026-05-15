import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element } from '../../src/dom/index.js';
import { CustomElementRegistry } from '../../src/dom/custom-elements.js';

describe('Custom Elements', () => {
  describe('CustomElementRegistry', () => {
    it('should define and get a custom element', () => {
      const registry = new CustomElementRegistry();
      class MyEl extends Element {
        constructor() {
          super('my-el');
        }
      }
      registry.define('my-el', MyEl);
      assert.strictEqual(registry.get('my-el'), MyEl);
    });

    it('should throw if name does not contain a hyphen', () => {
      const registry = new CustomElementRegistry();
      class Bad extends Element {
        constructor() {
          super('bad');
        }
      }
      assert.throws(() => registry.define('bad', Bad));
    });

    it('should throw if name is already defined', () => {
      const registry = new CustomElementRegistry();
      class MyEl extends Element {
        constructor() {
          super('my-el');
        }
      }
      class MyEl2 extends Element {
        constructor() {
          super('my-el');
        }
      }
      registry.define('my-el', MyEl);
      assert.throws(() => registry.define('my-el', MyEl2));
    });

    it('should return undefined for unknown elements', () => {
      const registry = new CustomElementRegistry();
      assert.strictEqual(registry.get('unknown-el'), undefined);
    });

    it('should return name for constructor via getName', () => {
      const registry = new CustomElementRegistry();
      class MyEl extends Element {
        constructor() {
          super('my-el');
        }
      }
      registry.define('my-el', MyEl);
      assert.strictEqual(registry.getName(MyEl), 'my-el');
    });

    it('should return undefined from getName for unknown constructor', () => {
      const registry = new CustomElementRegistry();
      class Unknown extends Element {
        constructor() {
          super('x-y');
        }
      }
      assert.strictEqual(registry.getName(Unknown), undefined);
    });

    it('should resolve whenDefined immediately if already defined', async () => {
      const registry = new CustomElementRegistry();
      class MyEl extends Element {
        constructor() {
          super('my-el');
        }
      }
      registry.define('my-el', MyEl);
      const ctor = await registry.whenDefined('my-el');
      assert.strictEqual(ctor, MyEl);
    });

    it('should resolve whenDefined when element is later defined', async () => {
      const registry = new CustomElementRegistry();
      class MyEl extends Element {
        constructor() {
          super('my-el');
        }
      }
      const promise = registry.whenDefined('my-el');
      registry.define('my-el', MyEl);
      const ctor = await promise;
      assert.strictEqual(ctor, MyEl);
    });

    it('should upgrade (noop)', () => {
      const registry = new CustomElementRegistry();
      const doc = new Document();
      const el = doc.createElement('div');
      // Should not throw
      registry.upgrade(el);
    });
  });

  describe('Document.createElement with custom elements', () => {
    it('should instantiate registered custom element constructor', () => {
      const doc = new Document();
      class MyWidget extends Element {
        public customProp = 'hello';
        constructor() {
          super('my-widget');
        }
      }
      doc.customElements.define('my-widget', MyWidget);
      const el = doc.createElement('my-widget');
      assert.ok(el instanceof MyWidget);
      assert.strictEqual((el as MyWidget).customProp, 'hello');
    });

    it('should return regular Element for unregistered tag', () => {
      const doc = new Document();
      const el = doc.createElement('x-unknown');
      assert.ok(el instanceof Element);
      assert.strictEqual(el.tagName, 'X-UNKNOWN');
    });
  });

  describe('Document.customElements property', () => {
    it('should be a CustomElementRegistry', () => {
      const doc = new Document();
      assert.ok(doc.customElements instanceof CustomElementRegistry);
    });

    it('should be the same instance on repeated access', () => {
      const doc = new Document();
      assert.strictEqual(doc.customElements, doc.customElements);
    });
  });
});
