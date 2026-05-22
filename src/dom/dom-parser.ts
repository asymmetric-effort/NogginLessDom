/**
 * DOMParser and XMLSerializer implementations.
 * @module dom/dom-parser
 */

import { Document } from './index.js';
import { parseHTML } from './html-parser.js';
import { serializeNode } from './html-serializer.js';
import type { Node } from './index.js';

type SupportedMIMEType = 'text/html' | 'text/xml' | 'application/xml';

const SUPPORTED_TYPES = new Set<string>([
  'text/html',
  'text/xml',
  'application/xml',
]);

/**
 * Parses an HTML or XML string into a Document.
 */
export class DOMParser {
  parseFromString(source: string, mimeType: SupportedMIMEType): Document {
    if (!SUPPORTED_TYPES.has(mimeType)) {
      throw new TypeError(`Unsupported MIME type: ${mimeType}`);
    }

    const doc = new Document();
    const nodes = parseHTML(source);
    for (const node of nodes) {
      doc.appendChild(node);
    }
    return doc;
  }
}

/**
 * Serializes a DOM node to an HTML/XML string.
 */
export class XMLSerializer {
  serializeToString(node: Node): string {
    return serializeNode(node);
  }
}
