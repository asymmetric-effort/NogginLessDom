import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element, getImplicitRole } from '../../src/dom/index.js';
import { HTMLInputElement } from '../../src/dom/html-elements.js';

describe('ARIA property accessors', () => {
  const ariaProperties: Array<{
    prop: string;
    attr: string;
  }> = [
    { prop: 'ariaLabel', attr: 'aria-label' },
    { prop: 'ariaHidden', attr: 'aria-hidden' },
    { prop: 'ariaDisabled', attr: 'aria-disabled' },
    { prop: 'ariaExpanded', attr: 'aria-expanded' },
    { prop: 'ariaSelected', attr: 'aria-selected' },
    { prop: 'ariaChecked', attr: 'aria-checked' },
    { prop: 'ariaRequired', attr: 'aria-required' },
    { prop: 'ariaPressed', attr: 'aria-pressed' },
    { prop: 'ariaLive', attr: 'aria-live' },
    { prop: 'ariaDescribedBy', attr: 'aria-describedby' },
    { prop: 'ariaLabelledBy', attr: 'aria-labelledby' },
    { prop: 'ariaControls', attr: 'aria-controls' },
    { prop: 'ariaValueNow', attr: 'aria-valuenow' },
    { prop: 'ariaValueMin', attr: 'aria-valuemin' },
    { prop: 'ariaValueMax', attr: 'aria-valuemax' },
    { prop: 'ariaValueText', attr: 'aria-valuetext' },
  ];

  for (const { prop, attr } of ariaProperties) {
    describe(prop, () => {
      it(`should return null when ${attr} attribute is not set`, () => {
        const el = new Element('div');
        assert.strictEqual(
          (el as unknown as Record<string, unknown>)[prop],
          null,
        );
      });

      it(`should get the value from ${attr} attribute`, () => {
        const el = new Element('div');
        el.setAttribute(attr, 'test-value');
        assert.strictEqual(
          (el as unknown as Record<string, unknown>)[prop],
          'test-value',
        );
      });

      it(`should set the ${attr} attribute`, () => {
        const el = new Element('div');
        (el as unknown as Record<string, string | null>)[prop] = 'new-value';
        assert.strictEqual(el.getAttribute(attr), 'new-value');
      });

      it(`should remove attribute when set to null`, () => {
        const el = new Element('div');
        el.setAttribute(attr, 'value');
        (el as unknown as Record<string, string | null>)[prop] = null;
        assert.strictEqual(el.getAttribute(attr), null);
        assert.strictEqual(el.hasAttribute(attr), false);
      });

      it(`should sync between attribute and property`, () => {
        const el = new Element('div');
        (el as unknown as Record<string, string | null>)[prop] = 'synced';
        assert.strictEqual(el.getAttribute(attr), 'synced');
        el.setAttribute(attr, 'updated');
        assert.strictEqual(
          (el as unknown as Record<string, unknown>)[prop],
          'updated',
        );
      });
    });
  }

  describe('role', () => {
    it('should return null when role attribute is not set', () => {
      const el = new Element('div');
      assert.strictEqual(el.role, null);
    });

    it('should get the value from role attribute', () => {
      const el = new Element('div');
      el.setAttribute('role', 'button');
      assert.strictEqual(el.role, 'button');
    });

    it('should set the role attribute', () => {
      const el = new Element('div');
      el.role = 'navigation';
      assert.strictEqual(el.getAttribute('role'), 'navigation');
    });

    it('should remove role attribute when set to null', () => {
      const el = new Element('div');
      el.role = 'banner';
      el.role = null;
      assert.strictEqual(el.hasAttribute('role'), false);
    });
  });
});

describe('getImplicitRole', () => {
  it('should return "button" for button elements', () => {
    const doc = new Document();
    const el = doc.createElement('button');
    assert.strictEqual(getImplicitRole(el), 'button');
  });

  it('should return "link" for anchor elements with href', () => {
    const doc = new Document();
    const el = doc.createElement('a');
    el.setAttribute('href', '/page');
    assert.strictEqual(getImplicitRole(el), 'link');
  });

  it('should return null for anchor elements without href', () => {
    const doc = new Document();
    const el = doc.createElement('a');
    assert.strictEqual(getImplicitRole(el), null);
  });

  it('should return "checkbox" for input[type=checkbox]', () => {
    const doc = new Document();
    const el = doc.createElement('input') as HTMLInputElement;
    el.setAttribute('type', 'checkbox');
    assert.strictEqual(getImplicitRole(el), 'checkbox');
  });

  it('should return "radio" for input[type=radio]', () => {
    const doc = new Document();
    const el = doc.createElement('input') as HTMLInputElement;
    el.setAttribute('type', 'radio');
    assert.strictEqual(getImplicitRole(el), 'radio');
  });

  it('should return null for input[type=text]', () => {
    const doc = new Document();
    const el = doc.createElement('input') as HTMLInputElement;
    el.setAttribute('type', 'text');
    assert.strictEqual(getImplicitRole(el), null);
  });

  it('should return null for input without type attribute (defaults to text)', () => {
    const doc = new Document();
    const el = doc.createElement('input') as HTMLInputElement;
    assert.strictEqual(getImplicitRole(el), null);
  });

  it('should return "navigation" for nav', () => {
    const el = new Element('nav');
    assert.strictEqual(getImplicitRole(el), 'navigation');
  });

  it('should return "main" for main', () => {
    const el = new Element('main');
    assert.strictEqual(getImplicitRole(el), 'main');
  });

  it('should return "banner" for header', () => {
    const el = new Element('header');
    assert.strictEqual(getImplicitRole(el), 'banner');
  });

  it('should return "contentinfo" for footer', () => {
    const el = new Element('footer');
    assert.strictEqual(getImplicitRole(el), 'contentinfo');
  });

  it('should return null for elements with no implicit role', () => {
    const el = new Element('div');
    assert.strictEqual(getImplicitRole(el), null);
  });

  it('should return null for span', () => {
    const el = new Element('span');
    assert.strictEqual(getImplicitRole(el), null);
  });

  it('should return explicit role when set, overriding implicit', () => {
    const doc = new Document();
    const el = doc.createElement('button');
    el.setAttribute('role', 'tab');
    assert.strictEqual(getImplicitRole(el), 'tab');
  });

  it('should return explicit role for a div', () => {
    const el = new Element('div');
    el.setAttribute('role', 'dialog');
    assert.strictEqual(getImplicitRole(el), 'dialog');
  });
});
