import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element, TextNode } from '../../src/dom/index.js';
import {
  serializeNode,
  serializeChildren,
} from '../../src/dom/html-serializer.js';
import { parseHTML } from '../../src/dom/html-parser.js';

describe('HTML Serializer', () => {
  it('should serialize a simple element with no children', () => {
    const el = new Element('div');
    assert.strictEqual(serializeNode(el), '<div></div>');
  });

  it('should serialize element with text child', () => {
    const el = new Element('div');
    el.appendChild(new TextNode('Hello'));
    assert.strictEqual(serializeNode(el), '<div>Hello</div>');
  });

  it('should serialize element with attributes', () => {
    const el = new Element('div');
    el.setAttribute('id', 'main');
    el.setAttribute('class', 'container');
    assert.strictEqual(
      serializeNode(el),
      '<div id="main" class="container"></div>',
    );
  });

  it('should serialize nested elements', () => {
    const div = new Element('div');
    const span = new Element('span');
    span.appendChild(new TextNode('inner'));
    div.appendChild(span);
    assert.strictEqual(serializeNode(div), '<div><span>inner</span></div>');
  });

  it('should serialize void elements without closing tag', () => {
    const br = new Element('br');
    assert.strictEqual(serializeNode(br), '<br>');

    const img = new Element('img');
    img.setAttribute('src', 'test.png');
    assert.strictEqual(serializeNode(img), '<img src="test.png">');

    const input = new Element('input');
    input.setAttribute('type', 'text');
    assert.strictEqual(serializeNode(input), '<input type="text">');

    const hr = new Element('hr');
    assert.strictEqual(serializeNode(hr), '<hr>');

    const meta = new Element('meta');
    meta.setAttribute('charset', 'utf-8');
    assert.strictEqual(serializeNode(meta), '<meta charset="utf-8">');

    const link = new Element('link');
    link.setAttribute('rel', 'stylesheet');
    assert.strictEqual(serializeNode(link), '<link rel="stylesheet">');
  });

  it('should serialize text node', () => {
    const text = new TextNode('Hello World');
    assert.strictEqual(serializeNode(text), 'Hello World');
  });

  it('should encode entities in text content', () => {
    const text = new TextNode('a < b & c > d "e"');
    assert.strictEqual(
      serializeNode(text),
      'a &lt; b &amp; c &gt; d &quot;e&quot;',
    );
  });

  it('should encode entities in attribute values', () => {
    const el = new Element('div');
    el.setAttribute('data-val', 'a&b<c>d"e');
    assert.strictEqual(
      serializeNode(el),
      '<div data-val="a&amp;b&lt;c&gt;d&quot;e"></div>',
    );
  });

  it('should serialize children only (for innerHTML)', () => {
    const div = new Element('div');
    div.appendChild(new TextNode('Hello '));
    const span = new Element('span');
    span.appendChild(new TextNode('world'));
    div.appendChild(span);
    // innerHTML should serialize children, not the parent
    const childrenHTML = div.childNodes.map((c) => serializeNode(c)).join('');
    assert.strictEqual(childrenHTML, 'Hello <span>world</span>');
  });

  it('should serialize deeply nested structures', () => {
    const div = new Element('div');
    const ul = new Element('ul');
    const li1 = new Element('li');
    li1.appendChild(new TextNode('Item 1'));
    const li2 = new Element('li');
    li2.appendChild(new TextNode('Item 2'));
    ul.appendChild(li1);
    ul.appendChild(li2);
    div.appendChild(ul);
    assert.strictEqual(
      serializeNode(div),
      '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>',
    );
  });
});

describe('HTML Parser', () => {
  it('should parse a simple element', () => {
    const nodes = parseHTML('<div></div>');
    assert.strictEqual(nodes.length, 1);
    assert.ok(nodes[0] instanceof Element);
    assert.strictEqual((nodes[0] as Element).tagName, 'DIV');
  });

  it('should parse text content', () => {
    const nodes = parseHTML('Hello World');
    assert.strictEqual(nodes.length, 1);
    assert.ok(nodes[0] instanceof TextNode);
    assert.strictEqual((nodes[0] as TextNode).data, 'Hello World');
  });

  it('should parse element with text child', () => {
    const nodes = parseHTML('<div>Hello</div>');
    assert.strictEqual(nodes.length, 1);
    const div = nodes[0] as Element;
    assert.strictEqual(div.tagName, 'DIV');
    assert.strictEqual(div.childNodes.length, 1);
    assert.ok(div.childNodes[0] instanceof TextNode);
    assert.strictEqual((div.childNodes[0] as TextNode).data, 'Hello');
  });

  it('should parse element with attributes (double quoted)', () => {
    const nodes = parseHTML('<div id="main" class="container"></div>');
    const div = nodes[0] as Element;
    assert.strictEqual(div.getAttribute('id'), 'main');
    assert.strictEqual(div.getAttribute('class'), 'container');
  });

  it('should parse element with single quoted attributes', () => {
    const nodes = parseHTML("<div id='main' class='container'></div>");
    const div = nodes[0] as Element;
    assert.strictEqual(div.getAttribute('id'), 'main');
    assert.strictEqual(div.getAttribute('class'), 'container');
  });

  it('should parse element with unquoted attributes', () => {
    const nodes = parseHTML('<div id=main class=container></div>');
    const div = nodes[0] as Element;
    assert.strictEqual(div.getAttribute('id'), 'main');
    assert.strictEqual(div.getAttribute('class'), 'container');
  });

  it('should parse boolean attributes', () => {
    const nodes = parseHTML('<input disabled>');
    const input = nodes[0] as Element;
    assert.strictEqual(input.hasAttribute('disabled'), true);
    assert.strictEqual(input.getAttribute('disabled'), '');
  });

  it('should parse data attributes', () => {
    const nodes = parseHTML('<div data-val="z" data-name="test"></div>');
    const div = nodes[0] as Element;
    assert.strictEqual(div.getAttribute('data-val'), 'z');
    assert.strictEqual(div.getAttribute('data-name'), 'test');
  });

  it('should parse self-closing tags', () => {
    const nodes = parseHTML('<br/>');
    assert.strictEqual(nodes.length, 1);
    assert.ok(nodes[0] instanceof Element);
    assert.strictEqual((nodes[0] as Element).tagName, 'BR');
  });

  it('should parse self-closing tags with space', () => {
    const nodes = parseHTML('<br />');
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual((nodes[0] as Element).tagName, 'BR');
  });

  it('should parse void elements without closing tag', () => {
    const nodes = parseHTML('<br>');
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual((nodes[0] as Element).tagName, 'BR');
  });

  it('should parse img void element with attributes', () => {
    const nodes = parseHTML('<img src="test.png" alt="Test">');
    const img = nodes[0] as Element;
    assert.strictEqual(img.tagName, 'IMG');
    assert.strictEqual(img.getAttribute('src'), 'test.png');
    assert.strictEqual(img.getAttribute('alt'), 'Test');
  });

  it('should parse void elements: hr, meta, link, input', () => {
    for (const tag of ['hr', 'meta', 'link', 'input']) {
      const nodes = parseHTML(`<${tag}>`);
      assert.strictEqual(nodes.length, 1);
      assert.strictEqual((nodes[0] as Element).tagName, tag.toUpperCase());
    }
  });

  it('should parse nested elements', () => {
    const nodes = parseHTML('<div><span>text</span></div>');
    assert.strictEqual(nodes.length, 1);
    const div = nodes[0] as Element;
    assert.strictEqual(div.tagName, 'DIV');
    assert.strictEqual(div.childNodes.length, 1);
    const span = div.childNodes[0] as Element;
    assert.strictEqual(span.tagName, 'SPAN');
    assert.strictEqual(span.childNodes.length, 1);
    assert.strictEqual((span.childNodes[0] as TextNode).data, 'text');
  });

  it('should parse mixed text and elements', () => {
    const nodes = parseHTML('Hello <b>world</b> foo');
    assert.strictEqual(nodes.length, 3);
    assert.ok(nodes[0] instanceof TextNode);
    assert.strictEqual((nodes[0] as TextNode).data, 'Hello ');
    assert.ok(nodes[1] instanceof Element);
    assert.strictEqual((nodes[1] as Element).tagName, 'B');
    assert.ok(nodes[2] instanceof TextNode);
    assert.strictEqual((nodes[2] as TextNode).data, ' foo');
  });

  it('should decode basic entities', () => {
    const nodes = parseHTML('&amp; &lt; &gt; &quot;');
    assert.strictEqual(nodes.length, 1);
    assert.strictEqual((nodes[0] as TextNode).data, '& < > "');
  });

  it('should decode entities in attribute values', () => {
    const nodes = parseHTML('<div data-val="a&amp;b&lt;c"></div>');
    const div = nodes[0] as Element;
    assert.strictEqual(div.getAttribute('data-val'), 'a&b<c');
  });

  it('should parse empty string', () => {
    const nodes = parseHTML('');
    assert.strictEqual(nodes.length, 0);
  });

  it('should parse whitespace-only string', () => {
    const nodes = parseHTML('   ');
    assert.strictEqual(nodes.length, 1);
    assert.ok(nodes[0] instanceof TextNode);
    assert.strictEqual((nodes[0] as TextNode).data, '   ');
  });

  it('should parse deeply nested structure', () => {
    const nodes = parseHTML(
      '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>',
    );
    const div = nodes[0] as Element;
    const ul = div.childNodes[0] as Element;
    assert.strictEqual(ul.tagName, 'UL');
    assert.strictEqual(ul.childNodes.length, 2);
    assert.strictEqual((ul.childNodes[0] as Element).tagName, 'LI');
    assert.strictEqual(ul.childNodes[0].textContent, 'Item 1');
    assert.strictEqual(ul.childNodes[1].textContent, 'Item 2');
  });

  it('should parse multiple sibling elements', () => {
    const nodes = parseHTML('<p>One</p><p>Two</p>');
    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(nodes[0].textContent, 'One');
    assert.strictEqual(nodes[1].textContent, 'Two');
  });

  it('should handle self-closing img with attributes', () => {
    const nodes = parseHTML('<img src="a.png" alt="pic"/>');
    const img = nodes[0] as Element;
    assert.strictEqual(img.tagName, 'IMG');
    assert.strictEqual(img.getAttribute('src'), 'a.png');
    assert.strictEqual(img.getAttribute('alt'), 'pic');
  });
});

describe('Element innerHTML', () => {
  it('getter should return empty string for element with no children', () => {
    const el = new Element('div');
    assert.strictEqual(el.innerHTML, '');
  });

  it('getter should serialize text children', () => {
    const el = new Element('div');
    el.appendChild(new TextNode('Hello'));
    assert.strictEqual(el.innerHTML, 'Hello');
  });

  it('getter should serialize element children', () => {
    const el = new Element('div');
    const span = new Element('span');
    span.appendChild(new TextNode('text'));
    el.appendChild(span);
    assert.strictEqual(el.innerHTML, '<span>text</span>');
  });

  it('getter should serialize mixed children', () => {
    const el = new Element('div');
    el.appendChild(new TextNode('Hello '));
    const b = new Element('b');
    b.appendChild(new TextNode('world'));
    el.appendChild(b);
    assert.strictEqual(el.innerHTML, 'Hello <b>world</b>');
  });

  it('setter should parse HTML and replace children', () => {
    const el = new Element('div');
    el.appendChild(new TextNode('old'));
    el.innerHTML = '<span>new</span>';
    assert.strictEqual(el.childNodes.length, 1);
    assert.ok(el.childNodes[0] instanceof Element);
    assert.strictEqual((el.childNodes[0] as Element).tagName, 'SPAN');
    assert.strictEqual(el.childNodes[0].textContent, 'new');
  });

  it('setter should set parentNode on new children', () => {
    const el = new Element('div');
    el.innerHTML = '<span>child</span>';
    assert.strictEqual(el.childNodes[0].parentNode, el);
  });

  it('setter with empty string should clear children', () => {
    const el = new Element('div');
    el.appendChild(new TextNode('content'));
    el.innerHTML = '';
    assert.strictEqual(el.childNodes.length, 0);
  });

  it('round-trip: set then get should preserve HTML', () => {
    const el = new Element('div');
    el.innerHTML = '<p>Hello <b>world</b></p>';
    assert.strictEqual(el.innerHTML, '<p>Hello <b>world</b></p>');
  });

  it('round-trip with attributes', () => {
    const el = new Element('div');
    el.innerHTML = '<a href="http://example.com" class="link">Click</a>';
    assert.strictEqual(
      el.innerHTML,
      '<a href="http://example.com" class="link">Click</a>',
    );
  });

  it('round-trip with void elements', () => {
    const el = new Element('div');
    el.innerHTML = 'Line 1<br>Line 2';
    assert.strictEqual(el.innerHTML, 'Line 1<br>Line 2');
  });

  it('round-trip with entities', () => {
    const el = new Element('div');
    el.innerHTML = '&lt;script&gt;';
    // After parsing, text is <script>, serialized back it should be &lt;script&gt;
    assert.strictEqual(el.textContent, '<script>');
    assert.strictEqual(el.innerHTML, '&lt;script&gt;');
  });
});

describe('Element outerHTML', () => {
  it('should include the element itself', () => {
    const el = new Element('div');
    assert.strictEqual(el.outerHTML, '<div></div>');
  });

  it('should include attributes', () => {
    const el = new Element('div');
    el.setAttribute('id', 'main');
    assert.strictEqual(el.outerHTML, '<div id="main"></div>');
  });

  it('should include children', () => {
    const el = new Element('div');
    el.appendChild(new TextNode('Hello'));
    assert.strictEqual(el.outerHTML, '<div>Hello</div>');
  });

  it('should serialize void element', () => {
    const el = new Element('br');
    assert.strictEqual(el.outerHTML, '<br>');
  });

  it('should serialize complex tree', () => {
    const div = new Element('div');
    div.setAttribute('class', 'wrapper');
    const p = new Element('p');
    p.appendChild(new TextNode('Hello '));
    const b = new Element('b');
    b.appendChild(new TextNode('world'));
    p.appendChild(b);
    div.appendChild(p);
    assert.strictEqual(
      div.outerHTML,
      '<div class="wrapper"><p>Hello <b>world</b></p></div>',
    );
  });

  it('should serialize children directly via serializeChildren', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    span.appendChild(new TextNode('Hello'));
    div.appendChild(span);
    div.appendChild(new TextNode(' World'));
    assert.strictEqual(serializeChildren(div), '<span>Hello</span> World');
  });

  it('should serialize a generic Node (non-Element, non-TextNode)', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.appendChild(new TextNode('content'));
    doc.appendChild(div);
    // Document itself is a generic Node (nodeType 9), not Element or TextNode
    assert.strictEqual(serializeNode(doc), '<div>content</div>');
  });
});
