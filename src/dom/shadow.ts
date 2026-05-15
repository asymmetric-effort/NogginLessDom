/**
 * Shadow DOM implementation.
 * @module dom/shadow
 */

import { Node, Element } from './index.js';
import { NodeList } from './collections.js';
import {
  querySelector as selectorQuerySelector,
  querySelectorAll as selectorQuerySelectorAll,
} from './selector.js';
import { serializeChildren } from './html-serializer.js';
import { parseHTML } from './html-parser.js';

/**
 * ShadowRoot — a shadow tree root node.
 */
export class ShadowRoot extends Node {
  public readonly mode: 'open' | 'closed';
  public readonly host: Element;

  constructor(host: Element, init: { mode: 'open' | 'closed' }) {
    super(11, '#document-fragment');
    this.mode = init.mode;
    this.host = host;
  }

  get innerHTML(): string {
    return serializeChildren(this);
  }

  set innerHTML(value: string) {
    this.childNodes = [];
    if (value) {
      const nodes = parseHTML(value);
      for (const node of nodes) {
        this.appendChild(node);
      }
    }
  }

  getElementById(id: string): Element | null {
    const search = (node: Node): Element | null => {
      if (node instanceof Element && node.id === id) return node;
      for (const child of node.childNodes) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this);
  }

  querySelector(selector: string): Element | null {
    return selectorQuerySelector(this, selector) as Element | null;
  }

  querySelectorAll(selector: string): NodeList {
    const results = selectorQuerySelectorAll(this, selector);
    return new NodeList(results);
  }
}
