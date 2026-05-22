import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';

describe('Document collection properties', () => {
  describe('document.forms', () => {
    it('should return all form elements', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);

      const form1 = doc.createElement('form');
      const form2 = doc.createElement('form');
      body.appendChild(form1);
      body.appendChild(form2);

      const forms = doc.forms;
      assert.strictEqual(forms.length, 2);
      assert.strictEqual(forms[0], form1);
      assert.strictEqual(forms[1], form2);
    });
  });

  describe('document.images', () => {
    it('should return all img elements', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);

      const img1 = doc.createElement('img');
      const img2 = doc.createElement('img');
      body.appendChild(img1);
      body.appendChild(img2);

      const images = doc.images;
      assert.strictEqual(images.length, 2);
      assert.strictEqual(images[0], img1);
      assert.strictEqual(images[1], img2);
    });
  });

  describe('document.links', () => {
    it('should return a and area elements with href attribute', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);

      const a1 = doc.createElement('a');
      a1.setAttribute('href', 'https://example.com');
      const a2 = doc.createElement('a'); // no href — should NOT be included
      const area = doc.createElement('area');
      area.setAttribute('href', '/map');
      body.appendChild(a1);
      body.appendChild(a2);
      body.appendChild(area);

      const links = doc.links;
      assert.strictEqual(links.length, 2);
      assert.strictEqual(links[0], a1);
      assert.strictEqual(links[1], area);
    });
  });

  describe('document.scripts', () => {
    it('should return all script elements', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const head = doc.createElement('head');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(head);
      html.appendChild(body);

      const script1 = doc.createElement('script');
      const script2 = doc.createElement('script');
      head.appendChild(script1);
      body.appendChild(script2);

      const scripts = doc.scripts;
      assert.strictEqual(scripts.length, 2);
      assert.strictEqual(scripts[0], script1);
      assert.strictEqual(scripts[1], script2);
    });
  });

  describe('document.embeds', () => {
    it('should return all embed elements', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);

      const embed1 = doc.createElement('embed');
      const embed2 = doc.createElement('embed');
      body.appendChild(embed1);
      body.appendChild(embed2);

      const embeds = doc.embeds;
      assert.strictEqual(embeds.length, 2);
      assert.strictEqual(embeds[0], embed1);
      assert.strictEqual(embeds[1], embed2);
    });
  });

  describe('document.anchors', () => {
    it('should return a elements with name attribute', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);

      const a1 = doc.createElement('a');
      a1.setAttribute('name', 'top');
      const a2 = doc.createElement('a');
      a2.setAttribute('href', 'https://example.com'); // no name — should NOT be included
      const a3 = doc.createElement('a');
      a3.setAttribute('name', 'bottom');
      body.appendChild(a1);
      body.appendChild(a2);
      body.appendChild(a3);

      const anchors = doc.anchors;
      assert.strictEqual(anchors.length, 2);
      assert.strictEqual(anchors[0], a1);
      assert.strictEqual(anchors[1], a3);
    });
  });

  describe('empty document', () => {
    it('should return empty collections for all properties', () => {
      const doc = new Document();

      assert.strictEqual(doc.forms.length, 0);
      assert.strictEqual(doc.images.length, 0);
      assert.strictEqual(doc.links.length, 0);
      assert.strictEqual(doc.scripts.length, 0);
      assert.strictEqual(doc.embeds.length, 0);
      assert.strictEqual(doc.anchors.length, 0);
    });
  });

  describe('collections reflect current DOM', () => {
    it('should reflect added elements', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);

      assert.strictEqual(doc.forms.length, 0);

      const form = doc.createElement('form');
      body.appendChild(form);

      assert.strictEqual(doc.forms.length, 1);
      assert.strictEqual(doc.forms[0], form);
    });

    it('should reflect removed elements', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);

      const img = doc.createElement('img');
      body.appendChild(img);
      assert.strictEqual(doc.images.length, 1);

      body.removeChild(img);
      assert.strictEqual(doc.images.length, 0);
    });

    it('should reflect changes to links when href is added or removed', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);

      const a = doc.createElement('a');
      body.appendChild(a);
      assert.strictEqual(doc.links.length, 0);

      a.setAttribute('href', '/page');
      assert.strictEqual(doc.links.length, 1);
    });
  });
});
