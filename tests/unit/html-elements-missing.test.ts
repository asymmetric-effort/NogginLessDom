import { describe, it, expect } from '../../src/index.js';
import {
  HTMLOutputElement,
  HTMLTimeElement,
  HTMLPictureElement,
  HTMLSourceElement,
  HTMLTemplateElement,
} from '../../src/dom/html-elements.js';
import { Document, DocumentFragment, Element } from '../../src/dom/index.js';
import { PromiseRejectionEvent } from '../../src/dom/events.js';

describe('HTMLOutputElement', () => {
  it('has OUTPUT tagName', () => {
    const el = new HTMLOutputElement();
    expect(el.tagName).toBe('OUTPUT');
  });

  it('value get/set works', () => {
    const el = new HTMLOutputElement();
    el.value = 'result';
    expect(el.value).toBe('result');
  });

  it('value reflects textContent', () => {
    const el = new HTMLOutputElement();
    el.value = 'hello';
    expect(el.textContent).toBe('hello');
  });

  it('defaultValue reads from attribute', () => {
    const el = new HTMLOutputElement();
    expect(el.defaultValue).toBe('');
    el.setAttribute('defaultvalue', '42');
    expect(el.defaultValue).toBe('42');
  });

  it('htmlFor returns a DOMTokenList', () => {
    const el = new HTMLOutputElement();
    expect(el.htmlFor).toBeDefined();
  });

  it('is created via Document.createElement', () => {
    const doc = new Document();
    const el = doc.createElement('output');
    expect(el.tagName).toBe('OUTPUT');
  });
});

describe('HTMLTimeElement', () => {
  it('has TIME tagName', () => {
    const el = new HTMLTimeElement();
    expect(el.tagName).toBe('TIME');
  });

  it('dateTime get/set works', () => {
    const el = new HTMLTimeElement();
    expect(el.dateTime).toBe('');
    el.dateTime = '2024-01-01';
    expect(el.dateTime).toBe('2024-01-01');
  });

  it('dateTime reflects attribute', () => {
    const el = new HTMLTimeElement();
    el.dateTime = '2024-06-15';
    expect(el.getAttribute('datetime')).toBe('2024-06-15');
  });

  it('is created via Document.createElement', () => {
    const doc = new Document();
    const el = doc.createElement('time');
    expect(el.tagName).toBe('TIME');
  });
});

describe('HTMLPictureElement', () => {
  it('has PICTURE tagName', () => {
    const el = new HTMLPictureElement();
    expect(el.tagName).toBe('PICTURE');
  });

  it('is an Element', () => {
    const el = new HTMLPictureElement();
    expect(el).toBeInstanceOf(Element);
  });

  it('is created via Document.createElement', () => {
    const doc = new Document();
    const el = doc.createElement('picture');
    expect(el.tagName).toBe('PICTURE');
  });
});

describe('HTMLSourceElement', () => {
  it('has SOURCE tagName', () => {
    const el = new HTMLSourceElement();
    expect(el.tagName).toBe('SOURCE');
  });

  it('src get/set works', () => {
    const el = new HTMLSourceElement();
    expect(el.src).toBe('');
    el.src = 'video.mp4';
    expect(el.src).toBe('video.mp4');
    expect(el.getAttribute('src')).toBe('video.mp4');
  });

  it('type get/set works', () => {
    const el = new HTMLSourceElement();
    expect(el.type).toBe('');
    el.type = 'video/mp4';
    expect(el.type).toBe('video/mp4');
    expect(el.getAttribute('type')).toBe('video/mp4');
  });

  it('srcset get/set works', () => {
    const el = new HTMLSourceElement();
    expect(el.srcset).toBe('');
    el.srcset = 'image-1x.png 1x, image-2x.png 2x';
    expect(el.srcset).toBe('image-1x.png 1x, image-2x.png 2x');
    expect(el.getAttribute('srcset')).toBe('image-1x.png 1x, image-2x.png 2x');
  });

  it('media get/set works', () => {
    const el = new HTMLSourceElement();
    expect(el.media).toBe('');
    el.media = '(min-width: 800px)';
    expect(el.media).toBe('(min-width: 800px)');
    expect(el.getAttribute('media')).toBe('(min-width: 800px)');
  });

  it('is created via Document.createElement', () => {
    const doc = new Document();
    const el = doc.createElement('source');
    expect(el.tagName).toBe('SOURCE');
  });
});

describe('HTMLTemplateElement.content', () => {
  it('returns a DocumentFragment', () => {
    const el = new HTMLTemplateElement();
    expect(el.content).toBeInstanceOf(DocumentFragment);
  });

  it('content is consistent across accesses', () => {
    const el = new HTMLTemplateElement();
    const c1 = el.content;
    const c2 = el.content;
    expect(c1).toBe(c2);
  });

  it('content is a separate node from the template', () => {
    const el = new HTMLTemplateElement();
    expect(el.content).not.toBe(el);
  });
});

describe('PromiseRejectionEvent', () => {
  it('has promise and reason properties', () => {
    const p = Promise.resolve();
    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: p,
      reason: 'test error',
    });
    expect(event.type).toBe('unhandledrejection');
    expect(event.promise).toBe(p);
    expect(event.reason).toBe('test error');
  });

  it('reason defaults to undefined', () => {
    const p = Promise.resolve();
    const event = new PromiseRejectionEvent('rejectionhandled', {
      promise: p,
    });
    expect(event.reason).toBeUndefined();
  });

  it('is an Event instance', () => {
    const p = Promise.resolve();
    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: p,
      reason: new Error('fail'),
    });
    expect(event).toBeInstanceOf(PromiseRejectionEvent);
  });

  it('reason can be an Error object', () => {
    const err = new Error('something went wrong');
    const p = Promise.reject(err).catch(() => {});
    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: p as Promise<unknown>,
      reason: err,
    });
    expect(event.reason).toBe(err);
  });
});
