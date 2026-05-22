import { describe, it, expect } from '../../src/index.js';
import { Document } from '../../src/dom/index.js';
import { Range } from '../../src/dom/range.js';
import { Selection } from '../../src/dom/selection.js';
import { Window } from '../../src/dom/window.js';

describe('Range', () => {
  it('setStart/setEnd with correct boundaries', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 5);

    expect(range.startContainer).toBe(text);
    expect(range.startOffset).toBe(0);
    expect(range.endContainer).toBe(text);
    expect(range.endOffset).toBe(5);
  });

  it('collapse collapses to start by default', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 2);
    range.setEnd(text, 8);
    expect(range.collapsed).toBe(false);

    range.collapse();
    expect(range.collapsed).toBe(true);
    expect(range.startOffset).toBe(2);
    expect(range.endOffset).toBe(2);
  });

  it('collapse(false) collapses to end', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 2);
    range.setEnd(text, 8);

    range.collapse(false);
    expect(range.collapsed).toBe(true);
    expect(range.startOffset).toBe(8);
    expect(range.endOffset).toBe(8);
  });

  it('selectNode sets range around the node', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    div.appendChild(span);
    doc.appendChild(div);

    const range = new Range();
    range.selectNode(span);

    expect(range.startContainer).toBe(div);
    expect(range.startOffset).toBe(0);
    expect(range.endContainer).toBe(div);
    expect(range.endOffset).toBe(1);
  });

  it('selectNodeContents sets range to node contents', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text1 = doc.createTextNode('Hello');
    const text2 = doc.createTextNode(' World');
    div.appendChild(text1);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.selectNodeContents(div);

    expect(range.startContainer).toBe(div);
    expect(range.startOffset).toBe(0);
    expect(range.endContainer).toBe(div);
    expect(range.endOffset).toBe(2);
  });

  it('selectNodeContents on text node sets offset to data length', () => {
    const doc = new Document();
    const text = doc.createTextNode('Hello');
    const div = doc.createElement('div');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.selectNodeContents(text);

    expect(range.startContainer).toBe(text);
    expect(range.startOffset).toBe(0);
    expect(range.endContainer).toBe(text);
    expect(range.endOffset).toBe(5);
  });

  it('cloneRange produces independent copy', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 5);

    const clone = range.cloneRange();
    expect(clone.startContainer).toBe(text);
    expect(clone.startOffset).toBe(0);
    expect(clone.endContainer).toBe(text);
    expect(clone.endOffset).toBe(5);

    // Modifying original should not affect clone
    range.setEnd(text, 11);
    expect(clone.endOffset).toBe(5);
    expect(range.endOffset).toBe(11);
  });

  it('toString returns text content', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 5);

    expect(range.toString()).toBe('Hello');
  });

  it('toString returns empty string when collapsed', () => {
    const range = new Range();
    expect(range.toString()).toBe('');
  });

  it('cloneContents returns DocumentFragment', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 5);

    const fragment = range.cloneContents();
    expect(fragment.nodeType).toBe(11);
    expect(fragment.childNodes.length).toBe(1);
    expect(fragment.childNodes[0]!.textContent).toBe('Hello');

    // Original text should be unchanged
    expect(text.data).toBe('Hello World');
  });

  it('cloneContents returns empty fragment when collapsed', () => {
    const range = new Range();
    const fragment = range.cloneContents();
    expect(fragment.nodeType).toBe(11);
    expect(fragment.childNodes.length).toBe(0);
  });

  it('extractContents removes and returns content', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 5);
    range.setEnd(text, 11);

    const fragment = range.extractContents();
    expect(fragment.nodeType).toBe(11);
    expect(fragment.childNodes[0]!.textContent).toBe(' World');
    expect(text.data).toBe('Hello');
  });

  it('deleteContents removes text in range', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 5);
    range.setEnd(text, 11);

    range.deleteContents();
    expect(text.data).toBe('Hello');
    expect(range.collapsed).toBe(true);
  });

  it('insertNode inserts at start of range', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 5);
    range.setEnd(text, 11);

    const span = doc.createElement('span');
    range.insertNode(span);

    // Text should be split: "Hello" + span + " World"
    expect(div.childNodes.length).toBe(3);
    expect(div.childNodes[0]!.textContent).toBe('Hello');
    expect((div.childNodes[1] as typeof span).tagName).toBe('SPAN');
    expect(div.childNodes[2]!.textContent).toBe(' World');
  });

  it('commonAncestorContainer returns correct ancestor', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const p1 = doc.createElement('p');
    const p2 = doc.createElement('p');
    const text1 = doc.createTextNode('First');
    const text2 = doc.createTextNode('Second');
    p1.appendChild(text1);
    p2.appendChild(text2);
    div.appendChild(p1);
    div.appendChild(p2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 0);
    range.setEnd(text2, 6);

    expect(range.commonAncestorContainer).toBe(div);
  });

  it('compareBoundaryPoints compares positions', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello World');
    div.appendChild(text);
    doc.appendChild(div);

    const range1 = new Range();
    range1.setStart(text, 0);
    range1.setEnd(text, 5);

    const range2 = new Range();
    range2.setStart(text, 3);
    range2.setEnd(text, 8);

    // range1 start vs range2 start: 0 < 3 => -1
    expect(range1.compareBoundaryPoints(Range.START_TO_START, range2)).toBe(-1);

    // range1 end vs range2 end: 5 < 8 => -1
    expect(range1.compareBoundaryPoints(Range.END_TO_END, range2)).toBe(-1);
  });

  it('getBoundingClientRect returns empty DOMRect stub', () => {
    const range = new Range();
    const rect = range.getBoundingClientRect();
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });

  it('detach is a no-op', () => {
    const range = new Range();
    range.detach(); // Should not throw
  });

  it('has static constants', () => {
    expect(Range.START_TO_START).toBe(0);
    expect(Range.START_TO_END).toBe(1);
    expect(Range.END_TO_END).toBe(2);
    expect(Range.END_TO_START).toBe(3);
  });

  it('setStartBefore/setStartAfter/setEndBefore/setEndAfter', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span1 = doc.createElement('span');
    const span2 = doc.createElement('span');
    div.appendChild(span1);
    div.appendChild(span2);
    doc.appendChild(div);

    const range = new Range();
    range.setStartBefore(span1);
    range.setEndAfter(span2);

    expect(range.startContainer).toBe(div);
    expect(range.startOffset).toBe(0);
    expect(range.endContainer).toBe(div);
    expect(range.endOffset).toBe(2);

    const range2 = new Range();
    range2.setStartAfter(span1);
    range2.setEndBefore(span2);

    expect(range2.startContainer).toBe(div);
    expect(range2.startOffset).toBe(1);
    expect(range2.endContainer).toBe(div);
    expect(range2.endOffset).toBe(1);
    expect(range2.collapsed).toBe(true);
  });

  it('setStart after end collapses range', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 3);
    range.setStart(text, 5);

    expect(range.collapsed).toBe(true);
    expect(range.startOffset).toBe(5);
    expect(range.endOffset).toBe(5);
  });

  it('setEnd before start collapses range', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 3);
    range.setEnd(text, 5);
    range.setEnd(text, 1);

    expect(range.collapsed).toBe(true);
    expect(range.startOffset).toBe(1);
    expect(range.endOffset).toBe(1);
  });
});

describe('Selection', () => {
  it('addRange/removeAllRanges', () => {
    const selection = new Selection();
    const range = new Range();

    selection.addRange(range);
    expect(selection.rangeCount).toBe(1);

    selection.removeAllRanges();
    expect(selection.rangeCount).toBe(0);
  });

  it('getRangeAt returns correct range', () => {
    const selection = new Selection();
    const range = new Range();
    selection.addRange(range);

    expect(selection.getRangeAt(0)).toBe(range);
  });

  it('getRangeAt throws on invalid index', () => {
    const selection = new Selection();
    expect(() => selection.getRangeAt(0)).toThrow();
    expect(() => selection.getRangeAt(-1)).toThrow();
  });

  it('rangeCount tracks added ranges', () => {
    const selection = new Selection();
    expect(selection.rangeCount).toBe(0);

    const range1 = new Range();
    const range2 = new Range();
    selection.addRange(range1);
    expect(selection.rangeCount).toBe(1);

    selection.addRange(range2);
    expect(selection.rangeCount).toBe(2);
  });

  it('removeRange removes specific range', () => {
    const selection = new Selection();
    const range1 = new Range();
    const range2 = new Range();
    selection.addRange(range1);
    selection.addRange(range2);

    selection.removeRange(range1);
    expect(selection.rangeCount).toBe(1);
    expect(selection.getRangeAt(0)).toBe(range2);
  });

  it('removeRange throws if range not found', () => {
    const selection = new Selection();
    const range = new Range();
    expect(() => selection.removeRange(range)).toThrow();
  });

  it('type reflects selection state', () => {
    const selection = new Selection();
    expect(selection.type).toBe('None');

    const doc = new Document();
    const text = doc.createTextNode('Hello');
    const div = doc.createElement('div');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 0);
    selection.addRange(range);
    expect(selection.type).toBe('Caret');

    selection.removeAllRanges();
    const range2 = new Range();
    range2.setStart(text, 0);
    range2.setEnd(text, 5);
    selection.addRange(range2);
    expect(selection.type).toBe('Range');
  });

  it('isCollapsed reflects collapsed state', () => {
    const selection = new Selection();
    expect(selection.isCollapsed).toBe(true);

    const doc = new Document();
    const text = doc.createTextNode('Hello');
    const div = doc.createElement('div');
    div.appendChild(text);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    selection.addRange(range);
    expect(selection.isCollapsed).toBe(false);
  });

  it('anchorNode/anchorOffset and focusNode/focusOffset', () => {
    const doc = new Document();
    const text = doc.createTextNode('Hello');
    const div = doc.createElement('div');
    div.appendChild(text);
    doc.appendChild(div);

    const selection = new Selection();
    expect(selection.anchorNode).toBe(null);
    expect(selection.anchorOffset).toBe(0);
    expect(selection.focusNode).toBe(null);
    expect(selection.focusOffset).toBe(0);

    const range = new Range();
    range.setStart(text, 1);
    range.setEnd(text, 4);
    selection.addRange(range);

    expect(selection.anchorNode).toBe(text);
    expect(selection.anchorOffset).toBe(1);
    expect(selection.focusNode).toBe(text);
    expect(selection.focusOffset).toBe(4);
  });

  it('collapse sets selection to a single collapsed range', () => {
    const doc = new Document();
    const text = doc.createTextNode('Hello');
    const div = doc.createElement('div');
    div.appendChild(text);
    doc.appendChild(div);

    const selection = new Selection();
    selection.collapse(text, 3);

    expect(selection.rangeCount).toBe(1);
    expect(selection.isCollapsed).toBe(true);
    expect(selection.anchorNode).toBe(text);
    expect(selection.anchorOffset).toBe(3);
  });

  it('collapse(null) removes all ranges', () => {
    const selection = new Selection();
    selection.addRange(new Range());
    selection.collapse(null);
    expect(selection.rangeCount).toBe(0);
  });

  it('collapseToStart/collapseToEnd', () => {
    const doc = new Document();
    const text = doc.createTextNode('Hello');
    const div = doc.createElement('div');
    div.appendChild(text);
    doc.appendChild(div);

    const selection = new Selection();
    const range = new Range();
    range.setStart(text, 1);
    range.setEnd(text, 4);
    selection.addRange(range);

    selection.collapseToStart();
    expect(selection.isCollapsed).toBe(true);
    expect(selection.anchorOffset).toBe(1);

    selection.removeAllRanges();
    const range2 = new Range();
    range2.setStart(text, 1);
    range2.setEnd(text, 4);
    selection.addRange(range2);

    selection.collapseToEnd();
    expect(selection.isCollapsed).toBe(true);
    expect(selection.anchorOffset).toBe(4);
  });

  it('selectAllChildren selects all children of a node', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.appendChild(doc.createTextNode('Hello'));
    div.appendChild(doc.createElement('span'));
    doc.appendChild(div);

    const selection = new Selection();
    selection.selectAllChildren(div);

    expect(selection.rangeCount).toBe(1);
    const range = selection.getRangeAt(0);
    expect(range.startContainer).toBe(div);
    expect(range.startOffset).toBe(0);
    expect(range.endContainer).toBe(div);
    expect(range.endOffset).toBe(2);
  });

  it('toString returns text of all ranges', () => {
    const doc = new Document();
    const text = doc.createTextNode('Hello World');
    const div = doc.createElement('div');
    div.appendChild(text);
    doc.appendChild(div);

    const selection = new Selection();
    const range = new Range();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    selection.addRange(range);

    expect(selection.toString()).toBe('Hello');
  });

  it('empty is alias for removeAllRanges', () => {
    const selection = new Selection();
    selection.addRange(new Range());
    expect(selection.rangeCount).toBe(1);

    selection.empty();
    expect(selection.rangeCount).toBe(0);
  });

  it('containsNode checks if node is in selection', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    const text = doc.createTextNode('Hello');
    span.appendChild(text);
    div.appendChild(span);
    doc.appendChild(div);

    const selection = new Selection();
    const range = new Range();
    range.selectNodeContents(div);
    selection.addRange(range);

    expect(selection.containsNode(span)).toBe(true);
    expect(selection.containsNode(text)).toBe(true);
  });
});

describe('document.createRange', () => {
  it('returns a new Range instance', () => {
    const doc = new Document();
    const range = doc.createRange();
    expect(range).toBeDefined();
    expect(range.collapsed).toBe(true);
    expect(range.startOffset).toBe(0);
  });
});

describe('window.getSelection', () => {
  it('returns a Selection instance', () => {
    const win = new Window();
    const selection = win.getSelection();
    expect(selection).toBeDefined();
    expect(selection.rangeCount).toBe(0);
  });

  it('returns same singleton instance', () => {
    const win = new Window();
    const sel1 = win.getSelection();
    const sel2 = win.getSelection();
    expect(sel1).toBe(sel2);
  });
});
