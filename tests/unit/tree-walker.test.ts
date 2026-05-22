import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Document,
  Node,
  NodeFilter,
  TreeWalker,
  NodeIterator,
} from '../../src/dom/index.js';

/**
 * Build a simple tree:
 *   root (div)
 *   ├── p1 (p)
 *   │   ├── "Hello"
 *   │   └── span
 *   │       └── "World"
 *   ├── p2 (p)
 *   │   └── "Foo"
 *   └── <!-- comment -->
 */
function buildTree() {
  const doc = new Document();
  const root = doc.createElement('div');
  const p1 = doc.createElement('p');
  const span = doc.createElement('span');
  const textHello = doc.createTextNode('Hello');
  const textWorld = doc.createTextNode('World');
  const p2 = doc.createElement('p');
  const textFoo = doc.createTextNode('Foo');
  const comment = doc.createComment('comment');

  root.appendChild(p1);
  p1.appendChild(textHello);
  p1.appendChild(span);
  span.appendChild(textWorld);
  root.appendChild(p2);
  p2.appendChild(textFoo);
  root.appendChild(comment);

  return { doc, root, p1, p2, span, textHello, textWorld, textFoo, comment };
}

describe('NodeFilter constants', () => {
  it('should have correct filter result values', () => {
    assert.equal(NodeFilter.FILTER_ACCEPT, 1);
    assert.equal(NodeFilter.FILTER_REJECT, 2);
    assert.equal(NodeFilter.FILTER_SKIP, 3);
  });

  it('should have correct SHOW_ bitmask values', () => {
    assert.equal(NodeFilter.SHOW_ALL, 0xffffffff);
    assert.equal(NodeFilter.SHOW_ELEMENT, 0x1);
    assert.equal(NodeFilter.SHOW_ATTRIBUTE, 0x2);
    assert.equal(NodeFilter.SHOW_TEXT, 0x4);
    assert.equal(NodeFilter.SHOW_CDATA_SECTION, 0x8);
    assert.equal(NodeFilter.SHOW_PROCESSING_INSTRUCTION, 0x40);
    assert.equal(NodeFilter.SHOW_COMMENT, 0x80);
    assert.equal(NodeFilter.SHOW_DOCUMENT, 0x100);
    assert.equal(NodeFilter.SHOW_DOCUMENT_TYPE, 0x200);
    assert.equal(NodeFilter.SHOW_DOCUMENT_FRAGMENT, 0x400);
  });
});

describe('TreeWalker', () => {
  it('should traverse elements only with SHOW_ELEMENT', () => {
    const { root, p1, span, p2 } = buildTree();
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT);

    assert.equal(walker.currentNode, root);
    assert.equal(walker.nextNode(), p1);
    assert.equal(walker.nextNode(), span);
    assert.equal(walker.nextNode(), p2);
    assert.equal(walker.nextNode(), null);
  });

  it('should traverse text nodes only with SHOW_TEXT', () => {
    const { root, textHello, textWorld, textFoo } = buildTree();
    const walker = new TreeWalker(root, NodeFilter.SHOW_TEXT);

    assert.equal(walker.nextNode(), textHello);
    assert.equal(walker.nextNode(), textWorld);
    assert.equal(walker.nextNode(), textFoo);
    assert.equal(walker.nextNode(), null);
  });

  it('should apply a custom filter', () => {
    const { root, p1, p2 } = buildTree();
    // Only accept <p> elements
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT, (node) => {
      if (node instanceof Node && node.nodeName === 'P') {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    });

    assert.equal(walker.nextNode(), p1);
    assert.equal(walker.nextNode(), p2);
    assert.equal(walker.nextNode(), null);
  });

  it('should support firstChild and lastChild', () => {
    const { root, p1, comment } = buildTree();
    const walker = new TreeWalker(root, NodeFilter.SHOW_ALL);

    const first = walker.firstChild();
    assert.equal(first, p1);

    walker.currentNode = root;
    const last = walker.lastChild();
    assert.equal(last, comment);
  });

  it('should support nextSibling and previousSibling', () => {
    const { root, p1, p2, comment } = buildTree();
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT);

    walker.currentNode = p1;
    assert.equal(walker.nextSibling(), p2);
    assert.equal(walker.nextSibling(), null);

    walker.currentNode = p2;
    assert.equal(walker.previousSibling(), p1);
    assert.equal(walker.previousSibling(), null);

    // With SHOW_ALL, comment is a sibling
    const walkerAll = new TreeWalker(root, NodeFilter.SHOW_ALL);
    walkerAll.currentNode = p2;
    assert.equal(walkerAll.nextSibling(), comment);
  });

  it('should support parentNode', () => {
    const { root, span, p1 } = buildTree();
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT);

    walker.currentNode = span;
    assert.equal(walker.parentNode(), p1);
    assert.equal(walker.parentNode(), root);
    // root is the root; parentNode should return null
    assert.equal(walker.parentNode(), null);
  });

  it('should support previousNode', () => {
    const { root, p1, span, p2 } = buildTree();
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT);

    // Move to end
    walker.currentNode = p2;
    assert.equal(walker.previousNode(), span);
    assert.equal(walker.previousNode(), p1);
    assert.equal(walker.previousNode(), root);
    assert.equal(walker.previousNode(), null);
  });

  it('should expose root, whatToShow, and filter properties', () => {
    const { root } = buildTree();
    const filterFn = () => NodeFilter.FILTER_ACCEPT;
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT, filterFn);

    assert.equal(walker.root, root);
    assert.equal(walker.whatToShow, NodeFilter.SHOW_ELEMENT);
    assert.equal(walker.filter, filterFn);
  });

  it('should handle SHOW_ALL showing everything', () => {
    const { root, p1, textHello, span, textWorld, p2, textFoo, comment } =
      buildTree();
    const walker = new TreeWalker(root, NodeFilter.SHOW_ALL);

    const collected: Node[] = [];
    let node = walker.nextNode();
    while (node !== null) {
      collected.push(node);
      node = walker.nextNode();
    }

    assert.deepEqual(collected, [
      p1,
      textHello,
      span,
      textWorld,
      p2,
      textFoo,
      comment,
    ]);
  });

  it('should handle SHOW_COMMENT', () => {
    const { root, comment } = buildTree();
    const walker = new TreeWalker(root, NodeFilter.SHOW_COMMENT);

    assert.equal(walker.nextNode(), comment);
    assert.equal(walker.nextNode(), null);
  });

  it('should handle empty tree', () => {
    const doc = new Document();
    const root = doc.createElement('div');
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT);

    assert.equal(walker.firstChild(), null);
    assert.equal(walker.lastChild(), null);
    assert.equal(walker.nextNode(), null);
    assert.equal(walker.nextSibling(), null);
    assert.equal(walker.previousSibling(), null);
    assert.equal(walker.parentNode(), null);
  });

  it('should handle FILTER_REJECT in custom filter', () => {
    const { root, p1, p2 } = buildTree();
    // Reject span (and its children), accept other elements
    const walker = new TreeWalker(root, NodeFilter.SHOW_ELEMENT, (node) => {
      if (node.nodeName === 'SPAN') {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    });

    assert.equal(walker.nextNode(), p1);
    assert.equal(walker.nextNode(), p2);
    assert.equal(walker.nextNode(), null);
  });
});

describe('NodeIterator', () => {
  it('should iterate forward with nextNode', () => {
    const { root, p1, textHello, span, textWorld, p2, textFoo, comment } =
      buildTree();
    const iter = new NodeIterator(root, NodeFilter.SHOW_ALL);

    const collected: Node[] = [];
    let node = iter.nextNode();
    while (node !== null) {
      collected.push(node);
      node = iter.nextNode();
    }

    // Includes root as first result (pointer starts before reference)
    assert.deepEqual(collected, [
      root,
      p1,
      textHello,
      span,
      textWorld,
      p2,
      textFoo,
      comment,
    ]);
  });

  it('should iterate backward with previousNode', () => {
    const { root, p1, textHello, span, textWorld, p2, textFoo, comment } =
      buildTree();
    const iter = new NodeIterator(root, NodeFilter.SHOW_ALL);

    // First, move to end
    while (iter.nextNode() !== null) {
      // drain
    }

    const collected: Node[] = [];
    let node = iter.previousNode();
    while (node !== null) {
      collected.push(node);
      node = iter.previousNode();
    }

    assert.deepEqual(collected, [
      comment,
      textFoo,
      p2,
      textWorld,
      span,
      textHello,
      p1,
      root,
    ]);
  });

  it('should filter with SHOW_ELEMENT', () => {
    const { root, p1, span, p2 } = buildTree();
    const iter = new NodeIterator(root, NodeFilter.SHOW_ELEMENT);

    const collected: Node[] = [];
    let node = iter.nextNode();
    while (node !== null) {
      collected.push(node);
      node = iter.nextNode();
    }

    // root is an element, so it's included
    assert.deepEqual(collected, [root, p1, span, p2]);
  });

  it('should support custom filter', () => {
    const { root, p1, p2 } = buildTree();
    const iter = new NodeIterator(root, NodeFilter.SHOW_ELEMENT, (node) => {
      if (node.nodeName === 'P') {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    });

    const collected: Node[] = [];
    let node = iter.nextNode();
    while (node !== null) {
      collected.push(node);
      node = iter.nextNode();
    }

    assert.deepEqual(collected, [p1, p2]);
  });

  it('should expose referenceNode and pointerBeforeReferenceNode', () => {
    const { root } = buildTree();
    const iter = new NodeIterator(root, NodeFilter.SHOW_ALL);

    assert.equal(iter.referenceNode, root);
    assert.equal(iter.pointerBeforeReferenceNode, true);
  });

  it('should have a detach method (no-op)', () => {
    const { root } = buildTree();
    const iter = new NodeIterator(root, NodeFilter.SHOW_ALL);
    // Should not throw
    iter.detach();
    assert.ok(true);
  });

  it('should expose root, whatToShow, and filter properties', () => {
    const { root } = buildTree();
    const filterFn = () => NodeFilter.FILTER_ACCEPT;
    const iter = new NodeIterator(root, NodeFilter.SHOW_TEXT, filterFn);

    assert.equal(iter.root, root);
    assert.equal(iter.whatToShow, NodeFilter.SHOW_TEXT);
    assert.equal(iter.filter, filterFn);
  });
});

describe('document.createTreeWalker', () => {
  it('should create a TreeWalker from the document', () => {
    const doc = new Document();
    const root = doc.createElement('div');
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

    assert.ok(walker instanceof TreeWalker);
    assert.equal(walker.root, root);
    assert.equal(walker.whatToShow, NodeFilter.SHOW_ELEMENT);
    assert.equal(walker.filter, null);
  });

  it('should create a TreeWalker with default whatToShow', () => {
    const doc = new Document();
    const root = doc.createElement('div');
    const walker = doc.createTreeWalker(root);

    assert.equal(walker.whatToShow, NodeFilter.SHOW_ALL);
  });

  it('should create a TreeWalker with a filter', () => {
    const doc = new Document();
    const root = doc.createElement('div');
    const p = doc.createElement('p');
    const span = doc.createElement('span');
    root.appendChild(p);
    root.appendChild(span);

    const walker = doc.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      (node) =>
        node.nodeName === 'P'
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP,
    );

    assert.equal(walker.nextNode(), p);
    assert.equal(walker.nextNode(), null);
  });
});

describe('document.createNodeIterator', () => {
  it('should create a NodeIterator from the document', () => {
    const doc = new Document();
    const root = doc.createElement('div');
    const iter = doc.createNodeIterator(root, NodeFilter.SHOW_ELEMENT);

    assert.ok(iter instanceof NodeIterator);
    assert.equal(iter.root, root);
    assert.equal(iter.whatToShow, NodeFilter.SHOW_ELEMENT);
    assert.equal(iter.filter, null);
  });

  it('should create a NodeIterator with default whatToShow', () => {
    const doc = new Document();
    const root = doc.createElement('div');
    const iter = doc.createNodeIterator(root);

    assert.equal(iter.whatToShow, NodeFilter.SHOW_ALL);
  });
});
