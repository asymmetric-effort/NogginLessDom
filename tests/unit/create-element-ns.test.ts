import { describe, it, expect } from '../../src/index.js';
import { Document, Element, Event } from '../../src/dom/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XHTML_NS = 'http://www.w3.org/1999/xhtml';

describe('createElementNS', () => {
  it('creates element with correct namespace', () => {
    const doc = new Document();
    const el = doc.createElementNS(SVG_NS, 'svg');
    expect(el).toBeInstanceOf(Element);
    expect(el.namespaceURI).toBe(SVG_NS);
  });

  it('creates XHTML element with correct namespace', () => {
    const doc = new Document();
    const el = doc.createElementNS(XHTML_NS, 'div');
    expect(el).toBeInstanceOf(Element);
    expect(el.namespaceURI).toBe(XHTML_NS);
  });

  it('SVG elements preserve case in tagName', () => {
    const doc = new Document();
    const el = doc.createElementNS(SVG_NS, 'linearGradient');
    expect(el.tagName).toBe('linearGradient');
    expect(el.nodeName).toBe('linearGradient');
  });

  it('XHTML elements uppercase tagName like regular createElement', () => {
    const doc = new Document();
    const el = doc.createElementNS(XHTML_NS, 'div');
    expect(el.tagName).toBe('DIV');
  });

  it('SVG elements support SVG-specific attributes', () => {
    const doc = new Document();
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '200');
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(svg.getAttribute('width')).toBe('200');
    expect(svg.getAttribute('height')).toBe('200');
  });

  it('SVG elements support path attributes', () => {
    const doc = new Document();
    const path = doc.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M10 10 H 90 V 90 H 10 Z');
    path.setAttribute('fill', 'red');
    path.setAttribute('stroke', 'blue');
    expect(path.getAttribute('d')).toBe('M10 10 H 90 V 90 H 10 Z');
    expect(path.getAttribute('fill')).toBe('red');
    expect(path.getAttribute('stroke')).toBe('blue');
  });

  it('SVG circle elements support cx, cy, r attributes', () => {
    const doc = new Document();
    const circle = doc.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '25');
    expect(circle.getAttribute('cx')).toBe('50');
    expect(circle.getAttribute('cy')).toBe('50');
    expect(circle.getAttribute('r')).toBe('25');
  });

  it('createElement still works as before (no regression)', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    expect(div.tagName).toBe('DIV');
    expect(div.namespaceURI).toBeNull();
    div.setAttribute('id', 'test');
    expect(div.getAttribute('id')).toBe('test');
  });

  it('nested SVG elements work', () => {
    const doc = new Document();
    const svg = doc.createElementNS(SVG_NS, 'svg');
    const g = doc.createElementNS(SVG_NS, 'g');
    const rect = doc.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '10');
    rect.setAttribute('width', '80');
    rect.setAttribute('height', '80');

    g.appendChild(rect);
    svg.appendChild(g);

    expect(svg.childNodes.length).toBe(1);
    expect(svg.childNodes[0]).toBe(g);
    expect(g.childNodes[0]).toBe(rect);
    expect(rect.getAttribute('width')).toBe('80');
  });

  it('outerHTML serializes SVG with preserved case', () => {
    const doc = new Document();
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    const circle = doc.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '25');
    svg.appendChild(circle);

    const html = svg.outerHTML;
    // SVG tags should preserve case, not lowercase
    expect(html).toContain('viewBox');
    expect(html).toContain('<svg');
    expect(html).toContain('<circle');
    expect(html).toContain('</svg>');
  });

  it('innerHTML works for SVG elements', () => {
    const doc = new Document();
    const svg = doc.createElementNS(SVG_NS, 'svg');
    const circle = doc.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '50');
    svg.appendChild(circle);

    const inner = svg.innerHTML;
    expect(inner).toContain('<circle');
    expect(inner).toContain('cx="50"');
  });

  it('SVG elements work with event listeners', () => {
    const doc = new Document();
    const svg = doc.createElementNS(SVG_NS, 'svg');
    let clicked = false;
    svg.addEventListener('click', () => {
      clicked = true;
    });
    svg.dispatchEvent(new Event('click'));
    expect(clicked).toBe(true);
  });

  it('cloneNode preserves namespaceURI', () => {
    const doc = new Document();
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    const clone = svg.cloneNode(false);
    expect(clone.namespaceURI).toBe(SVG_NS);
    expect(clone.tagName).toBe('svg');
    expect(clone.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('deep cloneNode preserves namespaceURI on children', () => {
    const doc = new Document();
    const svg = doc.createElementNS(SVG_NS, 'svg');
    const circle = doc.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', '10');
    svg.appendChild(circle);

    const clone = svg.cloneNode(true) as Element;
    expect(clone.namespaceURI).toBe(SVG_NS);
    expect(clone.childNodes.length).toBe(1);
    const clonedCircle = clone.childNodes[0] as Element;
    expect(clonedCircle.namespaceURI).toBe(SVG_NS);
    expect(clonedCircle.tagName).toBe('circle');
    expect(clonedCircle.getAttribute('r')).toBe('10');
  });
});
