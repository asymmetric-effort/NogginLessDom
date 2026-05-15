import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element } from '../../src/dom/index.js';

/**
 * Helper: build a small DOM tree for testing.
 *
 *  <div id="root" class="container">
 *    <p class="intro first">Hello</p>
 *    <ul id="list">
 *      <li class="item active" data-index="0">one</li>
 *      <li class="item" data-index="1">two</li>
 *      <li class="item" data-index="2" data-lang="en-US">three</li>
 *    </ul>
 *    <span class="intro">world</span>
 *    <div class="nested">
 *      <div class="deep">
 *        <a href="https://example.com" title="Example Site">link</a>
 *      </div>
 *    </div>
 *  </div>
 */
function buildTree(): { doc: Document; root: Element } {
  const doc = new Document();

  const root = doc.createElement('div');
  root.setAttribute('id', 'root');
  root.setAttribute('class', 'container');
  doc.appendChild(root);

  const p = doc.createElement('p');
  p.setAttribute('class', 'intro first');
  p.textContent = 'Hello';
  root.appendChild(p);

  const ul = doc.createElement('ul');
  ul.setAttribute('id', 'list');
  root.appendChild(ul);

  const li1 = doc.createElement('li');
  li1.setAttribute('class', 'item active');
  li1.setAttribute('data-index', '0');
  li1.textContent = 'one';
  ul.appendChild(li1);

  const li2 = doc.createElement('li');
  li2.setAttribute('class', 'item');
  li2.setAttribute('data-index', '1');
  li2.textContent = 'two';
  ul.appendChild(li2);

  const li3 = doc.createElement('li');
  li3.setAttribute('class', 'item');
  li3.setAttribute('data-index', '2');
  li3.setAttribute('data-lang', 'en-US');
  li3.textContent = 'three';
  ul.appendChild(li3);

  const span = doc.createElement('span');
  span.setAttribute('class', 'intro');
  span.textContent = 'world';
  root.appendChild(span);

  const nestedDiv = doc.createElement('div');
  nestedDiv.setAttribute('class', 'nested');
  root.appendChild(nestedDiv);

  const deepDiv = doc.createElement('div');
  deepDiv.setAttribute('class', 'deep');
  nestedDiv.appendChild(deepDiv);

  const a = doc.createElement('a');
  a.setAttribute('href', 'https://example.com');
  a.setAttribute('title', 'Example Site');
  a.textContent = 'link';
  deepDiv.appendChild(a);

  return { doc, root };
}

describe('CSS Selector Engine', () => {
  // ---- Tag name selector ----
  describe('tag name selector', () => {
    it('should find elements by tag name', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('li');
      assert.strictEqual(result.length, 3);
      for (const el of result) {
        assert.strictEqual(el.tagName, 'LI');
      }
    });

    it('should be case-insensitive for tag names', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('LI');
      assert.strictEqual(result.length, 3);
    });

    it('querySelector should return first match', () => {
      const { doc } = buildTree();
      const el = doc.querySelector('li');
      assert.ok(el);
      assert.strictEqual(el.textContent, 'one');
    });

    it('should return null / empty when no match', () => {
      const { doc } = buildTree();
      assert.strictEqual(doc.querySelector('table'), null);
      assert.strictEqual(doc.querySelectorAll('table').length, 0);
    });
  });

  // ---- ID selector ----
  describe('ID selector', () => {
    it('should find element by id', () => {
      const { doc } = buildTree();
      const el = doc.querySelector('#list');
      assert.ok(el);
      assert.strictEqual(el.tagName, 'UL');
    });

    it('should return null for non-existent id', () => {
      const { doc } = buildTree();
      assert.strictEqual(doc.querySelector('#nope'), null);
    });
  });

  // ---- Class selector ----
  describe('class selector', () => {
    it('should find elements by class', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('.item');
      assert.strictEqual(result.length, 3);
    });

    it('should match one of multiple classes', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('.intro');
      assert.strictEqual(result.length, 2); // p.intro and span.intro
    });

    it('should match element with specific class among many', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('.active');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.textContent, 'one');
    });
  });

  // ---- Universal selector ----
  describe('universal selector', () => {
    it('should match all elements', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('*');
      // root(div), p, ul, li*3, span, nested(div), deep(div), a = 10
      assert.strictEqual(result.length, 10);
    });
  });

  // ---- Attribute selectors ----
  describe('attribute selectors', () => {
    it('[attr] should match elements with attribute present', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('[data-index]');
      assert.strictEqual(result.length, 3);
    });

    it('[attr=value] should match exact value', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('[data-index="1"]');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.textContent, 'two');
    });

    it('[attr~=value] should match space-separated word', () => {
      const { doc } = buildTree();
      // class="item active" — should match ~=item
      const result = doc.querySelectorAll('[class~="item"]');
      assert.strictEqual(result.length, 3);
    });

    it('[attr|=value] should match value or value- prefix', () => {
      const { doc } = buildTree();
      // data-lang="en-US" — should match |=en
      const result = doc.querySelectorAll('[data-lang|="en"]');
      assert.strictEqual(result.length, 1);
    });

    it('[attr^=value] should match prefix', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('[href^="https"]');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.tagName, 'A');
    });

    it('[attr$=value] should match suffix', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('[href$=".com"]');
      assert.strictEqual(result.length, 1);
    });

    it('[attr*=value] should match substring', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('[title*="ample"]');
      assert.strictEqual(result.length, 1);
    });

    it('attribute value without quotes', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('[data-index=0]');
      assert.strictEqual(result.length, 1);
    });
  });

  // ---- Descendant combinator ----
  describe('descendant combinator', () => {
    it('should find descendants', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('ul li');
      assert.strictEqual(result.length, 3);
    });

    it('should find deeply nested descendants', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('div a');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.tagName, 'A');
    });

    it('should work with multiple levels', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('div div a');
      assert.strictEqual(result.length, 1);
    });
  });

  // ---- Child combinator ----
  describe('child combinator', () => {
    it('should find direct children only', () => {
      const { doc } = buildTree();
      // div > div should match nested and deep (nested is child of root, deep is child of nested)
      const result = doc.querySelectorAll('div > div');
      assert.strictEqual(result.length, 2); // .nested, .deep
    });

    it('should not find non-direct descendants', () => {
      const { doc } = buildTree();
      // div > a should NOT match — a is not a direct child of root div
      const result = doc.querySelectorAll('#root > a');
      assert.strictEqual(result.length, 0);
    });

    it('should find direct children with class', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('ul > .item');
      assert.strictEqual(result.length, 3);
    });
  });

  // ---- Compound selectors ----
  describe('compound selectors', () => {
    it('should match tag + class', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('p.intro');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.tagName, 'P');
    });

    it('should match tag + id', () => {
      const { doc } = buildTree();
      const el = doc.querySelector('ul#list');
      assert.ok(el);
      assert.strictEqual(el.tagName, 'UL');
    });

    it('should match tag + multiple classes', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('li.item.active');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.textContent, 'one');
    });

    it('should match tag + class + attribute', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('li.item[data-index="0"]');
      assert.strictEqual(result.length, 1);
    });

    it('should match class + id together', () => {
      const { doc } = buildTree();
      const el = doc.querySelector('.container#root');
      assert.ok(el);
      assert.strictEqual(el.tagName, 'DIV');
    });
  });

  // ---- Comma-separated selector list ----
  describe('selector list (comma)', () => {
    it('should match union of selectors', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('p, span');
      assert.strictEqual(result.length, 2);
    });

    it('should deduplicate and maintain document order', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('.intro, p');
      // p.intro and span.intro — p is .intro AND p, so 2 unique elements
      assert.strictEqual(result.length, 2);
    });

    it('querySelector with list returns first overall match', () => {
      const { doc } = buildTree();
      const el = doc.querySelector('span, p');
      // p comes before span in doc order
      assert.ok(el);
      assert.strictEqual(el.tagName, 'P');
    });
  });

  // ---- Pseudo-classes ----
  describe(':first-child', () => {
    it('should match first child elements', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('li:first-child');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.textContent, 'one');
    });

    it('should match first child of each parent', () => {
      const { doc } = buildTree();
      // root div (first child of doc), p (first child of root), li[0] (first child of ul),
      // div.deep (first of .nested), a (first of .deep)
      const result = doc.querySelectorAll(':first-child');
      assert.strictEqual(result.length, 5);
    });
  });

  describe(':last-child', () => {
    it('should match last child elements', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('li:last-child');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.textContent, 'three');
    });
  });

  describe(':nth-child(n)', () => {
    it('should match nth child (1-indexed)', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('li:nth-child(2)');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.textContent, 'two');
    });

    it('should handle nth-child(1) same as first-child', () => {
      const { doc } = buildTree();
      const r1 = doc.querySelectorAll('li:nth-child(1)');
      const r2 = doc.querySelectorAll('li:first-child');
      assert.strictEqual(r1.length, r2.length);
      assert.strictEqual(r1[0], r2[0]);
    });
  });

  describe(':not(selector)', () => {
    it('should exclude matching elements', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('li:not(.active)');
      assert.strictEqual(result.length, 2);
    });

    it('should work with tag name negation', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll(':not(div)');
      // p, ul, li*3, span, a = 7
      assert.strictEqual(result.length, 7);
    });

    it('should work with id negation', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('div:not(#root)');
      // .nested and .deep
      assert.strictEqual(result.length, 2);
    });
  });

  // ---- Element.querySelector / querySelectorAll ----
  describe('Element.querySelector / querySelectorAll', () => {
    it('should scope queries to the element subtree', () => {
      const { doc } = buildTree();
      const ul = doc.querySelector('ul');
      assert.ok(ul);
      const items = ul.querySelectorAll('li');
      assert.strictEqual(items.length, 3);
    });

    it('should not find elements outside the subtree', () => {
      const { doc } = buildTree();
      const ul = doc.querySelector('ul');
      assert.ok(ul);
      assert.strictEqual(ul.querySelector('p'), null);
      assert.strictEqual(ul.querySelector('a'), null);
    });

    it('should not match the element itself', () => {
      const { doc } = buildTree();
      const ul = doc.querySelector('ul');
      assert.ok(ul);
      assert.strictEqual(ul.querySelector('ul'), null);
    });
  });

  // ---- Edge cases ----
  describe('edge cases', () => {
    it('should handle empty document', () => {
      const doc = new Document();
      assert.strictEqual(doc.querySelector('div'), null);
      assert.strictEqual(doc.querySelectorAll('div').length, 0);
    });

    it('should handle deeply nested elements', () => {
      const doc = new Document();
      let current: Element = doc.createElement('div');
      doc.appendChild(current);
      for (let i = 0; i < 20; i++) {
        const child = doc.createElement('span');
        current.appendChild(child);
        current = child;
      }
      current.setAttribute('class', 'target');
      const found = doc.querySelector('.target');
      assert.ok(found);
      assert.strictEqual(found, current);
    });

    it('should return elements in document order for querySelectorAll', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('.intro');
      // p.intro comes before span.intro
      assert.strictEqual(result[0]!.tagName, 'P');
      assert.strictEqual(result[1]!.tagName, 'SPAN');
    });

    it('should handle whitespace in selectors', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll('  li.item  ');
      assert.strictEqual(result.length, 3);
    });

    it('should handle mixed combinators', () => {
      const { doc } = buildTree();
      // div > div a  — direct child div, then descendant a
      const result = doc.querySelectorAll('div > div a');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]!.tagName, 'A');
    });
  });

  describe('edge cases for coverage', () => {
    it('should return false for unknown pseudo-class', () => {
      const { doc } = buildTree();
      const result = doc.querySelectorAll(':hover');
      assert.strictEqual(result.length, 0);
    });

    it('should handle descendant combinator across multiple levels', () => {
      const doc = new Document();
      const a = doc.createElement('div');
      const b = doc.createElement('section');
      const c = doc.createElement('article');
      const target = doc.createElement('span');
      a.appendChild(b);
      b.appendChild(c);
      c.appendChild(target);
      doc.appendChild(a);
      // div span — must traverse through section and article
      const result = doc.querySelectorAll('div span');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], target);
    });

    it('should handle descendant combinator that fails to find ancestor', () => {
      const doc = new Document();
      const a = doc.createElement('div');
      const b = doc.createElement('span');
      a.appendChild(b);
      doc.appendChild(a);
      // section span — no section ancestor
      const result = doc.querySelectorAll('section span');
      assert.strictEqual(result.length, 0);
    });
  });
});
