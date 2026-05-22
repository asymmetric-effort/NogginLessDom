import { describe, it, expect } from '../../src/index.js';
import { Node, Document } from '../../src/dom/index.js';

describe('Node type constants', () => {
  describe('all 12 constants have correct values', () => {
    it('ELEMENT_NODE equals 1', () => {
      expect(Node.ELEMENT_NODE).toBe(1);
    });

    it('ATTRIBUTE_NODE equals 2', () => {
      expect(Node.ATTRIBUTE_NODE).toBe(2);
    });

    it('TEXT_NODE equals 3', () => {
      expect(Node.TEXT_NODE).toBe(3);
    });

    it('CDATA_SECTION_NODE equals 4', () => {
      expect(Node.CDATA_SECTION_NODE).toBe(4);
    });

    it('ENTITY_REFERENCE_NODE equals 5', () => {
      expect(Node.ENTITY_REFERENCE_NODE).toBe(5);
    });

    it('ENTITY_NODE equals 6', () => {
      expect(Node.ENTITY_NODE).toBe(6);
    });

    it('PROCESSING_INSTRUCTION_NODE equals 7', () => {
      expect(Node.PROCESSING_INSTRUCTION_NODE).toBe(7);
    });

    it('COMMENT_NODE equals 8', () => {
      expect(Node.COMMENT_NODE).toBe(8);
    });

    it('DOCUMENT_NODE equals 9', () => {
      expect(Node.DOCUMENT_NODE).toBe(9);
    });

    it('DOCUMENT_TYPE_NODE equals 10', () => {
      expect(Node.DOCUMENT_TYPE_NODE).toBe(10);
    });

    it('DOCUMENT_FRAGMENT_NODE equals 11', () => {
      expect(Node.DOCUMENT_FRAGMENT_NODE).toBe(11);
    });

    it('NOTATION_NODE equals 12', () => {
      expect(Node.NOTATION_NODE).toBe(12);
    });
  });

  describe('constants are accessible on Node class (static)', () => {
    it('constants are defined as static readonly properties', () => {
      const constants: Array<[string, number]> = [
        ['ELEMENT_NODE', 1],
        ['ATTRIBUTE_NODE', 2],
        ['TEXT_NODE', 3],
        ['CDATA_SECTION_NODE', 4],
        ['ENTITY_REFERENCE_NODE', 5],
        ['ENTITY_NODE', 6],
        ['PROCESSING_INSTRUCTION_NODE', 7],
        ['COMMENT_NODE', 8],
        ['DOCUMENT_NODE', 9],
        ['DOCUMENT_TYPE_NODE', 10],
        ['DOCUMENT_FRAGMENT_NODE', 11],
        ['NOTATION_NODE', 12],
      ];

      for (const [name, value] of constants) {
        expect((Node as Record<string, unknown>)[name]).toBe(value);
      }
    });
  });

  describe('constants match the nodeType of created nodes', () => {
    it('Element nodeType matches Node.ELEMENT_NODE', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      expect(el.nodeType).toBe(Node.ELEMENT_NODE);
    });

    it('TextNode nodeType matches Node.TEXT_NODE', () => {
      const doc = new Document();
      const text = doc.createTextNode('hello');
      expect(text.nodeType).toBe(Node.TEXT_NODE);
    });

    it('Comment nodeType matches Node.COMMENT_NODE', () => {
      const doc = new Document();
      const comment = doc.createComment('a comment');
      expect(comment.nodeType).toBe(Node.COMMENT_NODE);
    });

    it('Document nodeType matches Node.DOCUMENT_NODE', () => {
      const doc = new Document();
      expect(doc.nodeType).toBe(Node.DOCUMENT_NODE);
    });

    it('DocumentFragment nodeType matches Node.DOCUMENT_FRAGMENT_NODE', () => {
      const doc = new Document();
      const frag = doc.createDocumentFragment();
      expect(frag.nodeType).toBe(Node.DOCUMENT_FRAGMENT_NODE);
    });
  });
});
