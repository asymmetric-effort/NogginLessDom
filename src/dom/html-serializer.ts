/**
 * HTML serializer — converts DOM nodes to HTML strings.
 * @module dom/html-serializer
 */

import { Node, Element, TextNode } from './index.js';

const VOID_ELEMENTS = new Set([
  'AREA',
  'BASE',
  'BR',
  'COL',
  'EMBED',
  'HR',
  'IMG',
  'INPUT',
  'LINK',
  'META',
  'PARAM',
  'SOURCE',
  'TRACK',
  'WBR',
]);

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Serialize a DOM node to an HTML string.
 */
export function serializeNode(node: Node): string {
  if (node instanceof TextNode) {
    return escapeText(node.data);
  }

  if (node instanceof Element) {
    const isSVG =
      node.namespaceURI != null &&
      node.namespaceURI !== 'http://www.w3.org/1999/xhtml';
    const tag = isSVG ? node.tagName : node.tagName.toLowerCase();
    let attrs = '';

    const attrEntries = node.getAttributeEntries();
    for (const [name, value] of attrEntries) {
      attrs += ` ${name}="${escapeAttr(value)}"`;
    }

    if (VOID_ELEMENTS.has(node.tagName)) {
      return `<${tag}${attrs}>`;
    }

    const children = node.childNodes.map((c) => serializeNode(c)).join('');
    return `<${tag}${attrs}>${children}</${tag}>`;
  }

  // Generic node — serialize children
  return node.childNodes.map((c) => serializeNode(c)).join('');
}

/**
 * Serialize only the children of a node to HTML.
 */
export function serializeChildren(node: Node): string {
  return node.childNodes.map((c) => serializeNode(c)).join('');
}
