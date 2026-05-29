import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element, Node } from '../../src/dom/index.js';
import {
  HTMLDialogElement,
  HTMLCanvasElement,
  HTMLTemplateElement,
  HTMLIFrameElement,
  HTMLVideoElement,
  HTMLAudioElement,
  HTMLProgressElement,
  HTMLMeterElement,
  HTMLDetailsElement,
  HTMLTableElement,
  HTMLTableRowElement,
  HTMLTableCellElement,
  HTMLFieldSetElement,
  HTMLScriptElement,
  HTML_ELEMENT_MAP,
} from '../../src/dom/html-elements.js';

describe('Additional HTML Element Classes', () => {
  describe('HTMLDialogElement', () => {
    it('should have tagName DIALOG', () => {
      const el = new HTMLDialogElement();
      assert.strictEqual(el.tagName, 'DIALOG');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLDialogElement();
      assert.ok(el instanceof Element);
    });

    it('should have open default false', () => {
      const el = new HTMLDialogElement();
      assert.strictEqual(el.open, false);
    });

    it('should have returnValue default empty string', () => {
      const el = new HTMLDialogElement();
      assert.strictEqual(el.returnValue, '');
    });

    it('show() should set open to true', () => {
      const el = new HTMLDialogElement();
      el.show();
      assert.strictEqual(el.open, true);
    });

    it('showModal() should set open to true', () => {
      const el = new HTMLDialogElement();
      el.showModal();
      assert.strictEqual(el.open, true);
    });

    it('close() should set open to false', () => {
      const el = new HTMLDialogElement();
      el.show();
      el.close();
      assert.strictEqual(el.open, false);
    });

    it('close(returnValue) should set returnValue', () => {
      const el = new HTMLDialogElement();
      el.show();
      el.close('submitted');
      assert.strictEqual(el.returnValue, 'submitted');
      assert.strictEqual(el.open, false);
    });
  });

  describe('HTMLCanvasElement', () => {
    it('should have tagName CANVAS', () => {
      const el = new HTMLCanvasElement();
      assert.strictEqual(el.tagName, 'CANVAS');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLCanvasElement();
      assert.ok(el instanceof Element);
    });

    it('should have default width 300 and height 150', () => {
      const el = new HTMLCanvasElement();
      assert.strictEqual(el.width, 300);
      assert.strictEqual(el.height, 150);
    });

    it('getContext("2d") should return CanvasRenderingContext2D', () => {
      const el = new HTMLCanvasElement();
      const ctx = el.getContext('2d');
      assert.ok(ctx !== null);
      assert.strictEqual(el.getContext('webgl'), null);
    });

    it('toDataURL() should return data URI with default image/png', () => {
      const el = new HTMLCanvasElement();
      const url = el.toDataURL();
      assert.strictEqual(url, 'data:image/png;base64,');
    });

    it('toDataURL(type) should return data URL with type', () => {
      const el = new HTMLCanvasElement();
      const url = el.toDataURL('image/png');
      assert.strictEqual(url, 'data:image/png;base64,');
    });

    it('toDataURL(type, quality) should return data URL', () => {
      const el = new HTMLCanvasElement();
      const url = el.toDataURL('image/jpeg', 0.5);
      assert.strictEqual(url, 'data:image/jpeg;base64,');
    });
  });

  describe('HTMLTemplateElement', () => {
    it('should have tagName TEMPLATE', () => {
      const el = new HTMLTemplateElement();
      assert.strictEqual(el.tagName, 'TEMPLATE');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLTemplateElement();
      assert.ok(el instanceof Element);
    });

    it('should have content as a DocumentFragment', () => {
      const el = new HTMLTemplateElement();
      assert.ok(el.content instanceof Node);
      assert.strictEqual(el.content.nodeType, 11);
      assert.strictEqual(el.content.nodeName, '#document-fragment');
    });
  });

  describe('HTMLIFrameElement', () => {
    it('should have tagName IFRAME', () => {
      const el = new HTMLIFrameElement();
      assert.strictEqual(el.tagName, 'IFRAME');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLIFrameElement();
      assert.ok(el instanceof Element);
    });

    it('should have default empty string properties', () => {
      const el = new HTMLIFrameElement();
      assert.strictEqual(el.src, '');
      assert.strictEqual(el.width, '');
      assert.strictEqual(el.height, '');
      assert.strictEqual(el.name, '');
    });

    it('should have contentDocument and contentWindow as null', () => {
      const el = new HTMLIFrameElement();
      assert.strictEqual(el.contentDocument, null);
      assert.strictEqual(el.contentWindow, null);
    });
  });

  describe('HTMLVideoElement', () => {
    it('should have tagName VIDEO', () => {
      const el = new HTMLVideoElement();
      assert.strictEqual(el.tagName, 'VIDEO');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLVideoElement();
      assert.ok(el instanceof Element);
    });

    it('should have default properties', () => {
      const el = new HTMLVideoElement();
      assert.strictEqual(el.src, '');
      assert.strictEqual(el.controls, false);
      assert.strictEqual(el.autoplay, false);
      assert.strictEqual(el.loop, false);
      assert.strictEqual(el.muted, false);
      assert.strictEqual(el.width, 0);
      assert.strictEqual(el.height, 0);
      assert.strictEqual(el.currentTime, 0);
      assert.strictEqual(el.duration, 0);
      assert.strictEqual(el.paused, true);
      assert.strictEqual(el.ended, false);
    });

    it('play() should return a Promise and set paused to false', async () => {
      const el = new HTMLVideoElement();
      const result = el.play();
      assert.ok(result instanceof Promise);
      await result;
      assert.strictEqual(el.paused, false);
    });

    it('pause() should set paused to true', () => {
      const el = new HTMLVideoElement();
      el.play();
      el.pause();
      assert.strictEqual(el.paused, true);
    });
  });

  describe('HTMLAudioElement', () => {
    it('should have tagName AUDIO', () => {
      const el = new HTMLAudioElement();
      assert.strictEqual(el.tagName, 'AUDIO');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLAudioElement();
      assert.ok(el instanceof Element);
    });

    it('should have default properties (no width/height)', () => {
      const el = new HTMLAudioElement();
      assert.strictEqual(el.src, '');
      assert.strictEqual(el.controls, false);
      assert.strictEqual(el.autoplay, false);
      assert.strictEqual(el.loop, false);
      assert.strictEqual(el.muted, false);
      assert.strictEqual(el.currentTime, 0);
      assert.strictEqual(el.duration, 0);
      assert.strictEqual(el.paused, true);
      assert.strictEqual(el.ended, false);
    });

    it('play() should return a Promise and set paused to false', async () => {
      const el = new HTMLAudioElement();
      const result = el.play();
      assert.ok(result instanceof Promise);
      await result;
      assert.strictEqual(el.paused, false);
    });

    it('pause() should set paused to true', () => {
      const el = new HTMLAudioElement();
      el.play();
      el.pause();
      assert.strictEqual(el.paused, true);
    });

    it('should not have width or height properties', () => {
      const el = new HTMLAudioElement();
      assert.strictEqual('width' in el, false);
      assert.strictEqual('height' in el, false);
    });
  });

  describe('HTMLProgressElement', () => {
    it('should have tagName PROGRESS', () => {
      const el = new HTMLProgressElement();
      assert.strictEqual(el.tagName, 'PROGRESS');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLProgressElement();
      assert.ok(el instanceof Element);
    });

    it('should have default properties', () => {
      const el = new HTMLProgressElement();
      assert.strictEqual(el.value, 0);
      assert.strictEqual(el.max, 1);
    });
  });

  describe('HTMLMeterElement', () => {
    it('should have tagName METER', () => {
      const el = new HTMLMeterElement();
      assert.strictEqual(el.tagName, 'METER');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLMeterElement();
      assert.ok(el instanceof Element);
    });

    it('should have default properties', () => {
      const el = new HTMLMeterElement();
      assert.strictEqual(el.value, 0);
      assert.strictEqual(el.min, 0);
      assert.strictEqual(el.max, 1);
      assert.strictEqual(el.low, 0);
      assert.strictEqual(el.high, 1);
      assert.strictEqual(el.optimum, 0.5);
    });
  });

  describe('HTMLDetailsElement', () => {
    it('should have tagName DETAILS', () => {
      const el = new HTMLDetailsElement();
      assert.strictEqual(el.tagName, 'DETAILS');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLDetailsElement();
      assert.ok(el instanceof Element);
    });

    it('should have open default false', () => {
      const el = new HTMLDetailsElement();
      assert.strictEqual(el.open, false);
    });
  });

  describe('HTMLTableElement', () => {
    it('should have tagName TABLE', () => {
      const el = new HTMLTableElement();
      assert.strictEqual(el.tagName, 'TABLE');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLTableElement();
      assert.ok(el instanceof Element);
    });

    it('rows should return all TR descendants', () => {
      const table = new HTMLTableElement();
      const tr1 = new HTMLTableRowElement();
      const tr2 = new HTMLTableRowElement();
      table.appendChild(tr1);
      table.appendChild(tr2);
      assert.strictEqual(table.rows.length, 2);
    });

    it('tBodies should return all TBODY descendants', () => {
      const table = new HTMLTableElement();
      const tbody = new Element('tbody');
      table.appendChild(tbody);
      assert.strictEqual(table.tBodies.length, 1);
    });

    it('tHead should return first THEAD or null', () => {
      const table = new HTMLTableElement();
      assert.strictEqual(table.tHead, null);
      const thead = new Element('thead');
      table.appendChild(thead);
      assert.strictEqual(table.tHead, thead);
    });

    it('tFoot should return first TFOOT or null', () => {
      const table = new HTMLTableElement();
      assert.strictEqual(table.tFoot, null);
      const tfoot = new Element('tfoot');
      table.appendChild(tfoot);
      assert.strictEqual(table.tFoot, tfoot);
    });

    it('insertRow() should add a TR', () => {
      const table = new HTMLTableElement();
      const row = table.insertRow();
      assert.ok(row instanceof HTMLTableRowElement);
      assert.strictEqual(table.rows.length, 1);
    });

    it('insertRow(index) should insert at position', () => {
      const table = new HTMLTableElement();
      const row1 = table.insertRow();
      const row2 = table.insertRow(0);
      assert.strictEqual(table.childNodes[0], row2);
      assert.strictEqual(table.childNodes[1], row1);
    });

    it('deleteRow(index) should remove row at index', () => {
      const table = new HTMLTableElement();
      table.insertRow();
      table.insertRow();
      table.deleteRow(0);
      assert.strictEqual(table.rows.length, 1);
    });

    it('createTBody() should create and append TBODY', () => {
      const table = new HTMLTableElement();
      const tbody = table.createTBody();
      assert.strictEqual(tbody.tagName, 'TBODY');
      assert.strictEqual(table.tBodies.length, 1);
    });

    it('createTHead() should create and append THEAD', () => {
      const table = new HTMLTableElement();
      const thead = table.createTHead();
      assert.strictEqual(thead.tagName, 'THEAD');
      assert.strictEqual(table.tHead, thead);
    });

    it('createTFoot() should create and append TFOOT', () => {
      const table = new HTMLTableElement();
      const tfoot = table.createTFoot();
      assert.strictEqual(tfoot.tagName, 'TFOOT');
      assert.strictEqual(table.tFoot, tfoot);
    });
  });

  describe('HTMLTableRowElement', () => {
    it('should have tagName TR', () => {
      const el = new HTMLTableRowElement();
      assert.strictEqual(el.tagName, 'TR');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLTableRowElement();
      assert.ok(el instanceof Element);
    });

    it('cells should return TD/TH children', () => {
      const tr = new HTMLTableRowElement();
      const td = new HTMLTableCellElement('td');
      const th = new HTMLTableCellElement('th');
      tr.appendChild(td);
      tr.appendChild(th);
      assert.strictEqual(tr.cells.length, 2);
    });

    it('insertCell() should add a TD', () => {
      const tr = new HTMLTableRowElement();
      const cell = tr.insertCell();
      assert.ok(cell instanceof HTMLTableCellElement);
      assert.strictEqual(cell.tagName, 'TD');
      assert.strictEqual(tr.cells.length, 1);
    });

    it('insertCell(index) should insert at position', () => {
      const tr = new HTMLTableRowElement();
      const cell1 = tr.insertCell();
      const cell2 = tr.insertCell(0);
      assert.strictEqual(tr.childNodes[0], cell2);
      assert.strictEqual(tr.childNodes[1], cell1);
    });

    it('deleteCell(index) should remove cell at index', () => {
      const tr = new HTMLTableRowElement();
      tr.insertCell();
      tr.insertCell();
      tr.deleteCell(0);
      assert.strictEqual(tr.cells.length, 1);
    });

    it('rowIndex should return -1 when not in table', () => {
      const tr = new HTMLTableRowElement();
      assert.strictEqual(tr.rowIndex, -1);
    });

    it('rowIndex should return index in parent table', () => {
      const table = new HTMLTableElement();
      const tr1 = table.insertRow();
      const tr2 = table.insertRow();
      assert.strictEqual(tr1.rowIndex, 0);
      assert.strictEqual(tr2.rowIndex, 1);
    });
  });

  describe('HTMLTableCellElement', () => {
    it('should have tagName TD by default', () => {
      const el = new HTMLTableCellElement();
      assert.strictEqual(el.tagName, 'TD');
    });

    it('should accept th tagName', () => {
      const el = new HTMLTableCellElement('th');
      assert.strictEqual(el.tagName, 'TH');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLTableCellElement();
      assert.ok(el instanceof Element);
    });

    it('should have default properties', () => {
      const el = new HTMLTableCellElement();
      assert.strictEqual(el.colSpan, 1);
      assert.strictEqual(el.rowSpan, 1);
    });

    it('cellIndex should return -1 when not in row', () => {
      const td = new HTMLTableCellElement();
      assert.strictEqual(td.cellIndex, -1);
    });

    it('cellIndex should return index in parent row', () => {
      const tr = new HTMLTableRowElement();
      const td1 = tr.insertCell();
      const td2 = tr.insertCell();
      assert.strictEqual(td1.cellIndex, 0);
      assert.strictEqual(td2.cellIndex, 1);
    });
  });

  describe('HTMLFieldSetElement', () => {
    it('should have tagName FIELDSET', () => {
      const el = new HTMLFieldSetElement();
      assert.strictEqual(el.tagName, 'FIELDSET');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLFieldSetElement();
      assert.ok(el instanceof Element);
    });

    it('should have default properties', () => {
      const el = new HTMLFieldSetElement();
      assert.strictEqual(el.disabled, false);
      assert.strictEqual(el.name, '');
    });
  });

  describe('HTMLScriptElement', () => {
    it('should have tagName SCRIPT', () => {
      const el = new HTMLScriptElement();
      assert.strictEqual(el.tagName, 'SCRIPT');
    });

    it('should be an instance of Element', () => {
      const el = new HTMLScriptElement();
      assert.ok(el instanceof Element);
    });

    it('should have default properties', () => {
      const el = new HTMLScriptElement();
      assert.strictEqual(el.src, '');
      assert.strictEqual(el.type, '');
      assert.strictEqual(el.async, false);
      assert.strictEqual(el.defer, false);
      assert.strictEqual(el.text, '');
    });
  });

  describe('HTML_ELEMENT_MAP', () => {
    it('should map DIALOG to HTMLDialogElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['DIALOG'], HTMLDialogElement);
    });

    it('should map CANVAS to HTMLCanvasElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['CANVAS'], HTMLCanvasElement);
    });

    it('should map TEMPLATE to HTMLTemplateElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['TEMPLATE'], HTMLTemplateElement);
    });

    it('should map IFRAME to HTMLIFrameElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['IFRAME'], HTMLIFrameElement);
    });

    it('should map VIDEO to HTMLVideoElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['VIDEO'], HTMLVideoElement);
    });

    it('should map AUDIO to HTMLAudioElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['AUDIO'], HTMLAudioElement);
    });

    it('should map PROGRESS to HTMLProgressElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['PROGRESS'], HTMLProgressElement);
    });

    it('should map METER to HTMLMeterElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['METER'], HTMLMeterElement);
    });

    it('should map DETAILS to HTMLDetailsElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['DETAILS'], HTMLDetailsElement);
    });

    it('should map TABLE to HTMLTableElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['TABLE'], HTMLTableElement);
    });

    it('should map TR to HTMLTableRowElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['TR'], HTMLTableRowElement);
    });

    it('should map TD to HTMLTableCellElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['TD'], HTMLTableCellElement);
    });

    it('should map TH to HTMLTableCellElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['TH'], HTMLTableCellElement);
    });

    it('should map FIELDSET to HTMLFieldSetElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['FIELDSET'], HTMLFieldSetElement);
    });

    it('should map SCRIPT to HTMLScriptElement', () => {
      assert.strictEqual(HTML_ELEMENT_MAP['SCRIPT'], HTMLScriptElement);
    });
  });

  describe('Document.createElement integration', () => {
    it('should create typed elements via document.createElement', () => {
      const doc = new Document();
      const dialog = doc.createElement('dialog');
      assert.ok(dialog instanceof HTMLDialogElement);

      const canvas = doc.createElement('canvas');
      assert.ok(canvas instanceof HTMLCanvasElement);

      const template = doc.createElement('template');
      assert.ok(template instanceof HTMLTemplateElement);

      const iframe = doc.createElement('iframe');
      assert.ok(iframe instanceof HTMLIFrameElement);

      const video = doc.createElement('video');
      assert.ok(video instanceof HTMLVideoElement);

      const audio = doc.createElement('audio');
      assert.ok(audio instanceof HTMLAudioElement);

      const progress = doc.createElement('progress');
      assert.ok(progress instanceof HTMLProgressElement);

      const meter = doc.createElement('meter');
      assert.ok(meter instanceof HTMLMeterElement);

      const details = doc.createElement('details');
      assert.ok(details instanceof HTMLDetailsElement);

      const table = doc.createElement('table');
      assert.ok(table instanceof HTMLTableElement);

      const tr = doc.createElement('tr');
      assert.ok(tr instanceof HTMLTableRowElement);

      const td = doc.createElement('td');
      assert.ok(td instanceof HTMLTableCellElement);

      const th = doc.createElement('th');
      assert.ok(th instanceof HTMLTableCellElement);

      const fieldset = doc.createElement('fieldset');
      assert.ok(fieldset instanceof HTMLFieldSetElement);

      const script = doc.createElement('script');
      assert.ok(script instanceof HTMLScriptElement);
    });
  });
});
