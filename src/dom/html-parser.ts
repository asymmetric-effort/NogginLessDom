/**
 * Simple HTML parser — converts HTML strings to DOM nodes.
 * No eval, no Function(), no third-party deps.
 * @module dom/html-parser
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

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Parse an HTML string into an array of DOM nodes.
 */
export function parseHTML(html: string): Node[] {
  let pos = 0;

  function parseNodes(_parent: Node | null): Node[] {
    const result: Node[] = [];

    while (pos < html.length) {
      if (html[pos] === '<') {
        // Check for closing tag
        if (html[pos + 1] === '/') {
          // This is a closing tag — return to parent
          break;
        }

        // Opening tag
        const tag = parseOpenTag();
        if (tag) {
          if (!tag.selfClosing && !VOID_ELEMENTS.has(tag.element.tagName)) {
            // Parse children
            const children = parseNodes(tag.element);
            for (const child of children) {
              tag.element.appendChild(child);
            }
            // Consume closing tag
            consumeClosingTag();
          }
          result.push(tag.element);
        }
      } else {
        // Text node
        const text = parseText();
        if (text.length > 0) {
          result.push(new TextNode(decodeEntities(text)));
        }
      }
    }

    return result;
  }

  function parseText(): string {
    let text = '';
    while (pos < html.length && html[pos] !== '<') {
      text += html[pos];
      pos++;
    }
    return text;
  }

  function parseOpenTag(): { element: Element; selfClosing: boolean } | null {
    // Skip '<'
    pos++;

    // Read tag name
    let tagName = '';
    while (pos < html.length && !/[\s/>]/.test(html[pos]!)) {
      tagName += html[pos];
      pos++;
    }

    if (!tagName) return null;

    const element = new Element(tagName);
    let selfClosing = false;

    // Parse attributes
    while (pos < html.length) {
      skipWhitespace();

      if (pos >= html.length) break;

      if (html[pos] === '/') {
        selfClosing = true;
        pos++; // skip '/'
        // Expect '>'
        if (pos < html.length && html[pos] === '>') {
          pos++;
        }
        break;
      }

      if (html[pos] === '>') {
        pos++;
        break;
      }

      // Parse attribute
      const attr = parseAttribute();
      if (attr) {
        element.setAttribute(attr.name, attr.value);
      }
    }

    return { element, selfClosing };
  }

  function parseAttribute(): { name: string; value: string } | null {
    let name = '';
    while (pos < html.length && !/[\s=/>]/.test(html[pos]!)) {
      name += html[pos];
      pos++;
    }

    if (!name) return null;

    skipWhitespace();

    // Check for '='
    if (pos < html.length && html[pos] === '=') {
      pos++; // skip '='
      skipWhitespace();

      let value = '';
      if (pos < html.length && (html[pos] === '"' || html[pos] === "'")) {
        // Quoted value
        const quote = html[pos];
        pos++; // skip opening quote
        while (pos < html.length && html[pos] !== quote) {
          value += html[pos];
          pos++;
        }
        if (pos < html.length) pos++; // skip closing quote
      } else {
        // Unquoted value
        while (pos < html.length && !/[\s>]/.test(html[pos]!)) {
          value += html[pos];
          pos++;
        }
      }

      return { name, value: decodeEntities(value) };
    }

    // Boolean attribute (no value)
    return { name, value: '' };
  }

  function consumeClosingTag(): void {
    if (pos >= html.length || html[pos] !== '<' || html[pos + 1] !== '/')
      return;
    // Skip past closing tag: </tagname>
    pos += 2; // skip '</'
    while (pos < html.length && html[pos] !== '>') {
      pos++;
    }
    if (pos < html.length) pos++; // skip '>'
  }

  function skipWhitespace(): void {
    while (pos < html.length && /\s/.test(html[pos]!)) {
      pos++;
    }
  }

  return parseNodes(null);
}
