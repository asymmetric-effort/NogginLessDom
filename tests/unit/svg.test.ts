import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element } from '../../src/dom/index.js';
import {
  SVGElement,
  SVGSVGElement,
  SVGPathElement,
  SVGCircleElement,
  SVGRectElement,
  SVGLineElement,
  SVGTextElement,
  SVGGElement,
  SVGDefsElement,
  SVGUseElement,
  SVG_ELEMENT_MAP,
} from '../../src/dom/svg.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('SVG namespace support', () => {
  describe('Document.createElementNS', () => {
    it('should return SVGSVGElement for svg tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'svg');
      assert.ok(el instanceof SVGSVGElement);
      assert.equal(el.namespaceURI, SVG_NS);
    });

    it('should return SVGCircleElement for circle tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'circle');
      assert.ok(el instanceof SVGCircleElement);
    });

    it('should return SVGPathElement for path tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'path');
      assert.ok(el instanceof SVGPathElement);
    });

    it('should return SVGRectElement for rect tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'rect');
      assert.ok(el instanceof SVGRectElement);
    });

    it('should return SVGLineElement for line tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'line');
      assert.ok(el instanceof SVGLineElement);
    });

    it('should return SVGTextElement for text tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'text');
      assert.ok(el instanceof SVGTextElement);
    });

    it('should return SVGGElement for g tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'g');
      assert.ok(el instanceof SVGGElement);
    });

    it('should return SVGDefsElement for defs tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'defs');
      assert.ok(el instanceof SVGDefsElement);
    });

    it('should return SVGUseElement for use tag', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'use');
      assert.ok(el instanceof SVGUseElement);
    });

    it('should return generic SVGElement for unknown SVG tags', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'clipPath');
      assert.ok(el instanceof SVGElement);
      assert.equal(el.namespaceURI, SVG_NS);
      assert.equal(el.tagName, 'clipPath');
    });

    it('should still return regular Element for non-SVG namespace', () => {
      const doc = new Document();
      const el = doc.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      assert.ok(el instanceof Element);
      assert.ok(!(el instanceof SVGElement));
    });

    it('should set ownerDocument on SVG elements', () => {
      const doc = new Document();
      const el = doc.createElementNS(SVG_NS, 'svg');
      assert.equal(el.ownerDocument, doc);
    });
  });

  describe('SVG elements have correct namespace', () => {
    it('should have SVG namespace', () => {
      const svg = new SVGSVGElement();
      assert.equal(svg.namespaceURI, SVG_NS);
      assert.equal(svg.tagName, 'svg');
    });

    it('path should have SVG namespace', () => {
      const path = new SVGPathElement();
      assert.equal(path.namespaceURI, SVG_NS);
      assert.equal(path.tagName, 'path');
    });

    it('circle should have SVG namespace', () => {
      const circle = new SVGCircleElement();
      assert.equal(circle.namespaceURI, SVG_NS);
      assert.equal(circle.tagName, 'circle');
    });
  });

  describe('SVGSVGElement', () => {
    it('should createSVGRect', () => {
      const svg = new SVGSVGElement();
      const rect = svg.createSVGRect();
      assert.equal(rect.x, 0);
      assert.equal(rect.y, 0);
      assert.equal(rect.width, 0);
      assert.equal(rect.height, 0);
    });

    it('should createSVGPoint', () => {
      const svg = new SVGSVGElement();
      const point = svg.createSVGPoint();
      assert.equal(point.x, 0);
      assert.equal(point.y, 0);
    });

    it('should createSVGMatrix (identity)', () => {
      const svg = new SVGSVGElement();
      const matrix = svg.createSVGMatrix();
      assert.equal(matrix.a, 1);
      assert.equal(matrix.b, 0);
      assert.equal(matrix.c, 0);
      assert.equal(matrix.d, 1);
      assert.equal(matrix.e, 0);
      assert.equal(matrix.f, 0);
    });
  });

  describe('SVGElement viewBox', () => {
    it('should parse viewBox attribute', () => {
      const svg = new SVGSVGElement();
      svg.setAttribute('viewBox', '0 0 100 200');
      const vb = svg.viewBox;
      assert.equal(vb.baseVal.x, 0);
      assert.equal(vb.baseVal.y, 0);
      assert.equal(vb.baseVal.width, 100);
      assert.equal(vb.baseVal.height, 200);
    });

    it('should return zeros for no viewBox', () => {
      const svg = new SVGSVGElement();
      const vb = svg.viewBox;
      assert.equal(vb.baseVal.x, 0);
      assert.equal(vb.baseVal.y, 0);
      assert.equal(vb.baseVal.width, 0);
      assert.equal(vb.baseVal.height, 0);
    });

    it('should handle comma-separated viewBox', () => {
      const svg = new SVGSVGElement();
      svg.setAttribute('viewBox', '10,20,300,400');
      const vb = svg.viewBox;
      assert.equal(vb.baseVal.x, 10);
      assert.equal(vb.baseVal.y, 20);
      assert.equal(vb.baseVal.width, 300);
      assert.equal(vb.baseVal.height, 400);
    });
  });

  describe('SVGCircleElement', () => {
    it('should have cx, cy, r properties', () => {
      const circle = new SVGCircleElement();
      circle.setAttribute('cx', '50');
      circle.setAttribute('cy', '60');
      circle.setAttribute('r', '25');
      assert.equal(circle.cx.baseVal.value, 50);
      assert.equal(circle.cy.baseVal.value, 60);
      assert.equal(circle.r.baseVal.value, 25);
    });

    it('should default to 0', () => {
      const circle = new SVGCircleElement();
      assert.equal(circle.cx.baseVal.value, 0);
      assert.equal(circle.cy.baseVal.value, 0);
      assert.equal(circle.r.baseVal.value, 0);
    });
  });

  describe('SVGUseElement', () => {
    it('should have href property from href attribute', () => {
      const use = new SVGUseElement();
      use.setAttribute('href', '#myShape');
      assert.equal(use.href.baseVal, '#myShape');
    });

    it('should fall back to xlink:href', () => {
      const use = new SVGUseElement();
      use.setAttribute('xlink:href', '#legacy');
      assert.equal(use.href.baseVal, '#legacy');
    });

    it('should return empty string for no href', () => {
      const use = new SVGUseElement();
      assert.equal(use.href.baseVal, '');
    });
  });

  describe('Attribute get/set on SVG elements', () => {
    it('should get and set attributes', () => {
      const path = new SVGPathElement();
      path.setAttribute('d', 'M10 10 L20 20');
      assert.equal(path.getAttribute('d'), 'M10 10 L20 20');
    });

    it('should work with setAttributeNS', () => {
      const el = new SVGGElement();
      el.setAttributeNS(null, 'id', 'my-group');
      assert.equal(el.getAttribute('id'), 'my-group');
    });

    it('should support class attribute on SVG', () => {
      const rect = new SVGRectElement();
      rect.setAttribute('class', 'highlight');
      assert.equal(rect.getAttribute('class'), 'highlight');
    });
  });

  describe('SVG serialization', () => {
    it('should preserve namespace in tagName (lowercase)', () => {
      const doc = new Document();
      const svg = doc.createElementNS(SVG_NS, 'svg');
      assert.equal(svg.tagName, 'svg');
    });

    it('should preserve child structure', () => {
      const doc = new Document();
      const svg = doc.createElementNS(SVG_NS, 'svg');
      const circle = doc.createElementNS(SVG_NS, 'circle');
      svg.appendChild(circle);
      assert.equal(svg.childNodes.length, 1);
      assert.ok(svg.childNodes[0] instanceof SVGCircleElement);
    });

    it('should have correct outerHTML', () => {
      const doc = new Document();
      const svg = doc.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('width', '100');
      const html = svg.outerHTML;
      assert.ok(html.includes('svg'));
      assert.ok(html.includes('width="100"'));
    });
  });

  describe('SVG group and defs elements', () => {
    it('should create g element', () => {
      const g = new SVGGElement();
      assert.equal(g.tagName, 'g');
      assert.equal(g.namespaceURI, SVG_NS);
    });

    it('should create defs element', () => {
      const defs = new SVGDefsElement();
      assert.equal(defs.tagName, 'defs');
      assert.equal(defs.namespaceURI, SVG_NS);
    });

    it('should allow nesting SVG elements', () => {
      const svg = new SVGSVGElement();
      const g = new SVGGElement();
      const circle = new SVGCircleElement();
      g.appendChild(circle);
      svg.appendChild(g);
      assert.equal(svg.childNodes.length, 1);
      assert.equal(g.childNodes.length, 1);
    });
  });

  describe('SVG_ELEMENT_MAP', () => {
    it('should contain expected tags', () => {
      assert.equal(SVG_ELEMENT_MAP['svg'], SVGSVGElement);
      assert.equal(SVG_ELEMENT_MAP['path'], SVGPathElement);
      assert.equal(SVG_ELEMENT_MAP['circle'], SVGCircleElement);
      assert.equal(SVG_ELEMENT_MAP['rect'], SVGRectElement);
      assert.equal(SVG_ELEMENT_MAP['line'], SVGLineElement);
      assert.equal(SVG_ELEMENT_MAP['text'], SVGTextElement);
      assert.equal(SVG_ELEMENT_MAP['g'], SVGGElement);
      assert.equal(SVG_ELEMENT_MAP['defs'], SVGDefsElement);
      assert.equal(SVG_ELEMENT_MAP['use'], SVGUseElement);
    });
  });
});
