import { describe, it, expect } from '../../src/index.js';
import { Document, TextNode } from '../../src/dom/index.js';
import { Range } from '../../src/dom/range.js';

describe('Range - toString across multiple nodes', () => {
  it('collects text from range spanning multiple text nodes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text1 = doc.createTextNode('Hello ');
    const text2 = doc.createTextNode('World');
    div.appendChild(text1);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 0);
    range.setEnd(text2, 5);
    expect(range.toString()).toBe('Hello World');
  });

  it('collects partial text from start and end nodes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text1 = doc.createTextNode('Hello ');
    const text2 = doc.createTextNode('World');
    div.appendChild(text1);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 2);
    range.setEnd(text2, 3);
    expect(range.toString()).toBe('llo Wor');
  });

  it('collects text from nested elements', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    const text1 = doc.createTextNode('Hello ');
    const text2 = doc.createTextNode('World');
    span.appendChild(text2);
    div.appendChild(text1);
    div.appendChild(span);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 0);
    range.setEnd(text2, 5);
    expect(range.toString()).toBe('Hello World');
  });

  it('skips nodes outside the range boundaries', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text1 = doc.createTextNode('Before');
    const text2 = doc.createTextNode('Inside');
    const text3 = doc.createTextNode('After');
    div.appendChild(text1);
    div.appendChild(text2);
    div.appendChild(text3);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text2, 0);
    range.setEnd(text2, 6);
    expect(range.toString()).toBe('Inside');
  });
});

describe('Range - _traverseContents (cloneContents/extractContents multi-node)', () => {
  it('cloneContents across multiple text nodes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text1 = doc.createTextNode('Hello ');
    const text2 = doc.createTextNode('World');
    div.appendChild(text1);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 3);
    range.setEnd(text2, 3);

    const fragment = range.cloneContents();
    expect(fragment.nodeType).toBe(11);
    // Should have partial start text, and partial end text
    expect(fragment.childNodes.length).toBeGreaterThan(0);
    // Original text should be unchanged
    expect(text1.data).toBe('Hello ');
    expect(text2.data).toBe('World');
  });

  it('extractContents across multiple text nodes modifies original', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text1 = doc.createTextNode('Hello ');
    const text2 = doc.createTextNode('World');
    div.appendChild(text1);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 3);
    range.setEnd(text2, 3);

    const fragment = range.extractContents();
    expect(fragment.nodeType).toBe(11);
    // Original texts should be modified
    expect(text1.data).toBe('Hel');
    expect(text2.data).toBe('ld');
    // Range should be collapsed
    expect(range.collapsed).toBe(true);
  });

  it('extractContents returns empty fragment when collapsed', () => {
    const range = new Range();
    const fragment = range.extractContents();
    expect(fragment.nodeType).toBe(11);
    expect(fragment.childNodes.length).toBe(0);
  });

  it('cloneContents with element nodes fully contained', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    const innerText = doc.createTextNode('inner');
    span.appendChild(innerText);
    const text1 = doc.createTextNode('Before');
    const text2 = doc.createTextNode('After');
    div.appendChild(text1);
    div.appendChild(span);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 3);
    range.setEnd(text2, 3);

    const fragment = range.cloneContents();
    expect(fragment.childNodes.length).toBeGreaterThan(0);
    // The span should be cloned fully
    expect(text1.data).toBe('Before'); // unchanged
  });

  it('extractContents with fully contained element nodes removes them', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    const innerText = doc.createTextNode('inner');
    span.appendChild(innerText);
    const text1 = doc.createTextNode('Before');
    const text2 = doc.createTextNode('After');
    div.appendChild(text1);
    div.appendChild(span);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 3);
    range.setEnd(text2, 3);

    const fragment = range.extractContents();
    expect(fragment.childNodes.length).toBeGreaterThan(0);
    // text1 stays but truncated, span and text2 fully contained and removed
    expect(text1.data).toBe('Bef');
    expect(text2.data).toBe('er');
  });
});

describe('Range - deleteContents multi-node', () => {
  it('deleteContents across multiple text nodes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text1 = doc.createTextNode('Hello ');
    const text2 = doc.createTextNode('World');
    div.appendChild(text1);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 3);
    range.setEnd(text2, 3);

    range.deleteContents();
    expect(text1.data).toBe('Hel');
    expect(text2.data).toBe('ld');
    expect(range.collapsed).toBe(true);
  });

  it('deleteContents removes fully contained element nodes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text1 = doc.createTextNode('Before');
    const span = doc.createElement('span');
    span.appendChild(doc.createTextNode('middle'));
    const text2 = doc.createTextNode('After');
    div.appendChild(text1);
    div.appendChild(span);
    div.appendChild(text2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(text1, 3);
    range.setEnd(text2, 3);

    range.deleteContents();
    expect(text1.data).toBe('Bef');
    expect(text2.data).toBe('er');
    // span and text2 fully contained and removed, only text1 remains
    expect(div.childNodes.length).toBe(1);
  });

  it('deleteContents is no-op when collapsed', () => {
    const range = new Range();
    range.deleteContents(); // should not throw
  });
});

describe('Range - compareBoundaryPoints additional cases', () => {
  it('START_TO_END comparison', () => {
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

    // START_TO_END: this.end vs source.start -> 5 vs 3 -> 1
    expect(range1.compareBoundaryPoints(Range.START_TO_END, range2)).toBe(1);
  });

  it('END_TO_START comparison', () => {
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

    // END_TO_START: this.start vs source.end -> 0 vs 8 -> -1
    expect(range1.compareBoundaryPoints(Range.END_TO_START, range2)).toBe(-1);
  });

  it('throws on invalid comparison type', () => {
    const range1 = new Range();
    const range2 = new Range();
    expect(() => range1.compareBoundaryPoints(99, range2)).toThrow(
      'NotSupportedError',
    );
  });

  it('instance-level constants match static constants', () => {
    const range = new Range();
    expect(range.START_TO_START).toBe(Range.START_TO_START);
    expect(range.START_TO_END).toBe(Range.START_TO_END);
    expect(range.END_TO_END).toBe(Range.END_TO_END);
    expect(range.END_TO_START).toBe(Range.END_TO_START);
  });
});

describe('Range - setStartBefore/setEndBefore/selectNode errors', () => {
  it('setStartBefore throws when node has no parent', () => {
    const doc = new Document();
    const orphan = doc.createElement('div');
    const range = new Range();
    expect(() => range.setStartBefore(orphan)).toThrow('InvalidNodeTypeError');
  });

  it('setStartAfter throws when node has no parent', () => {
    const doc = new Document();
    const orphan = doc.createElement('div');
    const range = new Range();
    expect(() => range.setStartAfter(orphan)).toThrow('InvalidNodeTypeError');
  });

  it('setEndBefore throws when node has no parent', () => {
    const doc = new Document();
    const orphan = doc.createElement('div');
    const range = new Range();
    expect(() => range.setEndBefore(orphan)).toThrow('InvalidNodeTypeError');
  });

  it('setEndAfter throws when node has no parent', () => {
    const doc = new Document();
    const orphan = doc.createElement('div');
    const range = new Range();
    expect(() => range.setEndAfter(orphan)).toThrow('InvalidNodeTypeError');
  });

  it('selectNode throws when node has no parent', () => {
    const doc = new Document();
    const orphan = doc.createElement('div');
    const range = new Range();
    expect(() => range.selectNode(orphan)).toThrow('InvalidNodeTypeError');
  });
});

describe('Range - insertNode into element container', () => {
  it('inserts node at element offset', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span1 = doc.createElement('span');
    const span2 = doc.createElement('span');
    div.appendChild(span1);
    div.appendChild(span2);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(div, 1);
    range.setEnd(div, 2);

    const inserted = doc.createElement('em');
    range.insertNode(inserted);
    expect(div.childNodes[1]!.nodeName).toBe('EM');
  });

  it('inserts node at end of element children', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    div.appendChild(span);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(div, 1); // past all children
    range.setEnd(div, 1);

    const inserted = doc.createElement('em');
    range.insertNode(inserted);
    expect(div.childNodes.length).toBe(2);
    expect(div.childNodes[1]!.nodeName).toBe('EM');
  });

  it('insertNode into text node with no parent throws', () => {
    const text = new TextNode('hello');
    const range = new Range();
    range.setStart(text, 2);
    range.setEnd(text, 4);

    const doc = new Document();
    const node = doc.createElement('span');
    expect(() => range.insertNode(node)).toThrow('HierarchyRequestError');
  });
});

describe('Range - boundary point positions across different branches', () => {
  it('compareBoundaryPoints across different branches uses document position', () => {
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

    const range1 = new Range();
    range1.setStart(text1, 0);
    range1.setEnd(text1, 5);

    const range2 = new Range();
    range2.setStart(text2, 0);
    range2.setEnd(text2, 6);

    // text1 is before text2 in document order
    expect(range1.compareBoundaryPoints(Range.START_TO_START, range2)).toBe(-1);
  });

  it('setStart with container being ancestor of end', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    const text = doc.createTextNode('Hello');
    span.appendChild(text);
    div.appendChild(span);
    doc.appendChild(div);

    const range = new Range();
    range.setStart(div, 0);
    range.setEnd(text, 3);
    expect(range.collapsed).toBe(false);
    expect(range.startContainer).toBe(div);
    expect(range.endContainer).toBe(text);
  });
});

describe('Range - compareBoundaryPoints equal positions', () => {
  it('returns 0 for equal boundary points', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('Hello');
    div.appendChild(text);
    doc.appendChild(div);

    const range1 = new Range();
    range1.setStart(text, 2);
    range1.setEnd(text, 5);

    const range2 = new Range();
    range2.setStart(text, 2);
    range2.setEnd(text, 5);

    expect(range1.compareBoundaryPoints(Range.START_TO_START, range2)).toBe(0);
    expect(range1.compareBoundaryPoints(Range.END_TO_END, range2)).toBe(0);
  });
});
