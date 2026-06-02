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

const RAW_TEXT_ELEMENTS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA']);

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': '\u00A0',
  '&copy;': '\u00A9',
  '&reg;': '\u00AE',
  '&trade;': '\u2122',
  '&mdash;': '\u2014',
  '&ndash;': '\u2013',
  '&laquo;': '\u00AB',
  '&raquo;': '\u00BB',
  '&bull;': '\u2022',
  '&hellip;': '\u2026',
  '&euro;': '\u20AC',
  '&pound;': '\u00A3',
  '&yen;': '\u00A5',
  '&cent;': '\u00A2',
};

function decodeEntities(text: string): string {
  return text.replace(/&(?:#x([0-9a-fA-F]+)|#(\d+)|[a-zA-Z]+);/g, (match) => {
    // Numeric hex entity: &#xHHHH;
    const hexMatch = /^&#x([0-9a-fA-F]+);$/.exec(match);
    if (hexMatch) {
      return String.fromCodePoint(parseInt(hexMatch[1]!, 16));
    }
    // Numeric decimal entity: &#NNN;
    const decMatch = /^&#(\d+);$/.exec(match);
    if (decMatch) {
      return String.fromCodePoint(parseInt(decMatch[1]!, 10));
    }
    // Named entity
    return ENTITY_MAP[match] ?? match;
  });
}

/**
 * Parse an HTML string into an array of DOM nodes.
 */
export function parseHTML(html: string): Node[] {
  const MAX_PARSE_DEPTH = 5000;
  let pos = 0;

  function parseNodes(_parent: Node | null, depth: number): Node[] {
    if (depth > MAX_PARSE_DEPTH) {
      throw new Error(
        `HTML parsing exceeded maximum nesting depth of ${MAX_PARSE_DEPTH}`,
      );
    }
    const result: Node[] = [];

    while (pos < html.length) {
      if (html[pos] === '<') {
        // Check for comment
        if (html.startsWith('<!--', pos)) {
          // Skip HTML comment
          const endIdx = html.indexOf('-->', pos + 4);
          if (endIdx !== -1) {
            pos = endIdx + 3;
          } else {
            pos = html.length;
          }
          continue;
        }

        // Check for DOCTYPE
        if (html.startsWith('<!', pos)) {
          // Skip <!DOCTYPE ...> or any <! ... >
          const endIdx = html.indexOf('>', pos + 2);
          if (endIdx !== -1) {
            pos = endIdx + 1;
          } else {
            pos = html.length;
          }
          continue;
        }

        // Check for closing tag
        if (html[pos + 1] === '/') {
          // This is a closing tag — return to parent
          break;
        }

        // Opening tag
        const tag = parseOpenTag();
        if (tag) {
          if (!tag.selfClosing && !VOID_ELEMENTS.has(tag.element.tagName)) {
            // Raw text elements: capture everything until matching closing tag
            if (RAW_TEXT_ELEMENTS.has(tag.element.tagName)) {
              const rawContent = parseRawTextContent(tag.element.tagName);
              if (rawContent.length > 0) {
                tag.element.appendChild(new TextNode(rawContent));
              }
            } else {
              // Parse children
              const children = parseNodes(tag.element, depth + 1);
              for (const child of children) {
                tag.element.appendChild(child);
              }
              // Consume closing tag
              consumeClosingTag();
            }
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

  function parseRawTextContent(tagName: string): string {
    const closingTag = `</${tagName.toLowerCase()}>`;
    let content = '';
    while (pos < html.length) {
      // Case-insensitive search for closing tag
      const lowerRemainder = html.slice(pos).toLowerCase();
      if (lowerRemainder.startsWith(closingTag)) {
        // Consume the closing tag
        pos += closingTag.length;
        return content;
      }
      content += html[pos];
      pos++;
    }
    // If we hit end without finding closing tag, return what we have
    return content;
  }

  function skipWhitespace(): void {
    while (pos < html.length && /\s/.test(html[pos]!)) {
      pos++;
    }
  }

  return parseNodes(null, 0);
}
