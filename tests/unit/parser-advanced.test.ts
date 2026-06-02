import { describe, it, expect } from '../../src/index.js';
import { parseHTML } from '../../src/dom/html-parser.js';
import { TextNode, Element } from '../../src/dom/index.js';

describe('HTML Parser — raw text elements', () => {
  it('<script> preserves content as TextNode', () => {
    const nodes = parseHTML('<script>if (a < b) {}</script>');
    expect(nodes.length).toBe(1);
    const script = nodes[0] as Element;
    expect(script.tagName).toBe('SCRIPT');
    expect(script.childNodes.length).toBe(1);
    const text = script.childNodes[0] as TextNode;
    expect(text.nodeType).toBe(3);
    expect(text.data).toBe('if (a < b) {}');
  });

  it('<style> preserves CSS as TextNode', () => {
    const nodes = parseHTML('<style>.foo { color: red; }</style>');
    expect(nodes.length).toBe(1);
    const style = nodes[0] as Element;
    expect(style.tagName).toBe('STYLE');
    expect(style.childNodes.length).toBe(1);
    const text = style.childNodes[0] as TextNode;
    expect(text.nodeType).toBe(3);
    expect(text.data).toBe('.foo { color: red; }');
  });

  it('<script> with nested tags preserves raw HTML', () => {
    const nodes = parseHTML('<script>var x = "<div>hello</div>";</script>');
    const script = nodes[0] as Element;
    expect(script.childNodes.length).toBe(1);
    const text = script.childNodes[0] as TextNode;
    expect(text.data).toBe('var x = "<div>hello</div>";');
  });

  it('<style> with HTML-like content preserves it', () => {
    const nodes = parseHTML(
      '<style>a > b { color: red; } p < span { }</style>',
    );
    const style = nodes[0] as Element;
    const text = style.childNodes[0] as TextNode;
    expect(text.data).toBe('a > b { color: red; } p < span { }');
  });

  it('<textarea> is a raw text element too', () => {
    const nodes = parseHTML('<textarea><b>bold</b></textarea>');
    const textarea = nodes[0] as Element;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.childNodes.length).toBe(1);
    const text = textarea.childNodes[0] as TextNode;
    expect(text.data).toBe('<b>bold</b>');
  });

  it('script with no content creates no child nodes', () => {
    const nodes = parseHTML('<script></script>');
    const script = nodes[0] as Element;
    expect(script.childNodes.length).toBe(0);
  });

  it('script with attributes preserves content', () => {
    const nodes = parseHTML(
      '<script type="text/javascript">alert(1);</script>',
    );
    const script = nodes[0] as Element;
    expect(script.getAttribute('type')).toBe('text/javascript');
    const text = script.childNodes[0] as TextNode;
    expect(text.data).toBe('alert(1);');
  });
});

describe('HTML Parser — DOCTYPE', () => {
  it('<!DOCTYPE html> is silently skipped', () => {
    const nodes = parseHTML('<!DOCTYPE html><div>hello</div>');
    expect(nodes.length).toBe(1);
    const div = nodes[0] as Element;
    expect(div.tagName).toBe('DIV');
    expect(div.textContent).toBe('hello');
  });

  it('DOCTYPE with extra info is skipped', () => {
    const nodes = parseHTML(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML"><p>text</p>',
    );
    expect(nodes.length).toBe(1);
    expect((nodes[0] as Element).tagName).toBe('P');
  });

  it('HTML comment is skipped', () => {
    const nodes = parseHTML('<!-- comment --><span>hi</span>');
    expect(nodes.length).toBe(1);
    expect((nodes[0] as Element).tagName).toBe('SPAN');
  });
});

describe('HTML Parser — named entities', () => {
  it('&nbsp; decodes to \\u00A0', () => {
    const nodes = parseHTML('<span>&nbsp;</span>');
    const span = nodes[0] as Element;
    expect(span.textContent).toBe('\u00A0');
  });

  it('&copy; decodes to \\u00A9', () => {
    const nodes = parseHTML('<span>&copy;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00A9');
  });

  it('&mdash; decodes to \\u2014', () => {
    const nodes = parseHTML('<span>&mdash;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u2014');
  });

  it('&euro; decodes to \\u20AC', () => {
    const nodes = parseHTML('<span>&euro;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u20AC');
  });

  it('&amp; still works', () => {
    const nodes = parseHTML('<span>&amp;</span>');
    expect((nodes[0] as Element).textContent).toBe('&');
  });

  it('&lt; and &gt; still work', () => {
    const nodes = parseHTML('<span>&lt;div&gt;</span>');
    expect((nodes[0] as Element).textContent).toBe('<div>');
  });

  it('&reg; decodes to \\u00AE', () => {
    const nodes = parseHTML('<span>&reg;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00AE');
  });

  it('&trade; decodes to \\u2122', () => {
    const nodes = parseHTML('<span>&trade;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u2122');
  });

  it('&ndash; decodes to \\u2013', () => {
    const nodes = parseHTML('<span>&ndash;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u2013');
  });

  it('&laquo; and &raquo; decode correctly', () => {
    const nodes = parseHTML('<span>&laquo;hello&raquo;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00ABhello\u00BB');
  });

  it('&bull; decodes to \\u2022', () => {
    const nodes = parseHTML('<span>&bull;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u2022');
  });

  it('&hellip; decodes to \\u2026', () => {
    const nodes = parseHTML('<span>&hellip;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u2026');
  });

  it('&pound; decodes to \\u00A3', () => {
    const nodes = parseHTML('<span>&pound;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00A3');
  });

  it('&yen; decodes to \\u00A5', () => {
    const nodes = parseHTML('<span>&yen;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00A5');
  });

  it('&cent; decodes to \\u00A2', () => {
    const nodes = parseHTML('<span>&cent;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00A2');
  });
});

describe('HTML Parser — numeric entities', () => {
  it('&#169; decodes to copyright sign', () => {
    const nodes = parseHTML('<span>&#169;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00A9');
  });

  it('&#x00A9; decodes to copyright sign', () => {
    const nodes = parseHTML('<span>&#x00A9;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00A9');
  });

  it('&#x2014; decodes to em dash', () => {
    const nodes = parseHTML('<span>&#x2014;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u2014');
  });

  it('&#8364; decodes to euro sign', () => {
    const nodes = parseHTML('<span>&#8364;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u20AC');
  });

  it('hex entity is case-insensitive', () => {
    const nodes = parseHTML('<span>&#x00a9;</span>');
    expect((nodes[0] as Element).textContent).toBe('\u00A9');
  });

  it('entity in attribute value is decoded', () => {
    const nodes = parseHTML('<div title="&amp;copy">&nbsp;</div>');
    const div = nodes[0] as Element;
    expect(div.getAttribute('title')).toBe('&copy');
    expect(div.textContent).toBe('\u00A0');
  });
});
