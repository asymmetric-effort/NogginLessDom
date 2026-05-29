/**
 * CSS Cascade — stylesheet parsing, specificity calculation, and style collection.
 * @module dom/css-cascade
 */

import { matchesSelector } from './selector.js';
import type { Node } from './index.js';

/**
 * A parsed CSS rule with selector, properties, and computed specificity.
 */
export interface CSSRule {
  selector: string;
  properties: Map<string, string>;
  specificity: [number, number, number]; // [id, class, element]
}

/**
 * Set of CSS properties that are inherited from parent elements.
 */
export const INHERITED_PROPERTIES = new Set([
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'text-align',
  'text-indent',
  'text-transform',
  'visibility',
  'cursor',
  'direction',
  'letter-spacing',
  'word-spacing',
  'white-space',
  'list-style-type',
  'list-style-position',
  'list-style-image',
  'border-collapse',
  'border-spacing',
  'caption-side',
  'empty-cells',
  'quotes',
  'speak',
  'orphans',
  'widows',
]);

/**
 * Compute the specificity of a CSS selector.
 * Returns [id-count, class/attr/pseudo-count, element/pseudo-element-count].
 */
export function computeSpecificity(selector: string): [number, number, number] {
  let ids = 0;
  let classes = 0;
  let elements = 0;

  const notRegex = /:not\(([^)]*)\)/g;
  let processed = selector;
  let notMatch: RegExpExecArray | null;
  while ((notMatch = notRegex.exec(selector)) !== null) {
    const inner = notMatch[1]!;
    const [a, b, c] = computeSpecificity(inner);
    ids += a;
    classes += b;
    elements += c;
  }
  processed = processed.replace(/:not\([^)]*\)/g, '');

  const idMatches = processed.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g);
  if (idMatches) ids += idMatches.length;

  const pseudoElementMatches = processed.match(/::[a-zA-Z_-][a-zA-Z0-9_-]*/g);
  if (pseudoElementMatches) elements += pseudoElementMatches.length;
  processed = processed.replace(/::[a-zA-Z_-][a-zA-Z0-9_-]*/g, '');

  const classMatches = processed.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g);
  if (classMatches) classes += classMatches.length;

  const attrMatches = processed.match(/\[[^\]]*\]/g);
  if (attrMatches) classes += attrMatches.length;

  const pseudoClassMatches = processed.match(
    /:[a-zA-Z_-][a-zA-Z0-9_-]*(\([^)]*\))?/g,
  );
  if (pseudoClassMatches) classes += pseudoClassMatches.length;

  let stripped = processed;
  stripped = stripped.replace(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g, '');
  stripped = stripped.replace(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g, '');
  stripped = stripped.replace(/\[[^\]]*\]/g, '');
  stripped = stripped.replace(/:[a-zA-Z_-][a-zA-Z0-9_-]*(\([^)]*\))?/g, '');
  const tagMatches = stripped.match(/[a-zA-Z][a-zA-Z0-9]*/g);
  if (tagMatches) elements += tagMatches.length;

  return [ids, classes, elements];
}

function removeComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function skipAtRule(css: string, start: number): number {
  let i = start;
  let depth = 0;
  let foundBrace = false;
  while (i < css.length) {
    if (css[i] === '{') {
      depth++;
      foundBrace = true;
    } else if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    } else if (css[i] === ';' && !foundBrace) {
      return i + 1;
    }
    i++;
  }
  return i;
}

/**
 * Parse a CSS stylesheet string into an array of CSSRule objects.
 */
export function parseStyleSheet(css: string): CSSRule[] {
  const rules: CSSRule[] = [];
  const cleaned = removeComments(css);

  let i = 0;
  while (i < cleaned.length) {
    while (i < cleaned.length && /\s/.test(cleaned[i]!)) i++;
    if (i >= cleaned.length) break;

    if (cleaned[i] === '@') {
      i = skipAtRule(cleaned, i);
      continue;
    }

    const braceStart = cleaned.indexOf('{', i);
    if (braceStart === -1) break;

    const selectorText = cleaned.slice(i, braceStart).trim();

    const braceEnd = cleaned.indexOf('}', braceStart);
    if (braceEnd === -1) break;

    const declarationBlock = cleaned.slice(braceStart + 1, braceEnd).trim();

    const properties = new Map<string, string>();
    if (declarationBlock) {
      const declarations = declarationBlock
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const decl of declarations) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) continue;
        const prop = decl.slice(0, colonIdx).trim();
        const val = decl.slice(colonIdx + 1).trim();
        if (prop && val) {
          properties.set(prop, val);
        }
      }
    }

    const selectors = splitSelectors(selectorText);
    for (const sel of selectors) {
      const trimmedSel = sel.trim();
      if (trimmedSel) {
        rules.push({
          selector: trimmedSel,
          properties: new Map(properties),
          specificity: computeSpecificity(trimmedSel),
        });
      }
    }

    i = braceEnd + 1;
  }

  return rules;
}

function splitSelectors(selectorText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < selectorText.length; i++) {
    const ch = selectorText[i]!;
    if (ch === '(' || ch === '[') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === ']') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function compareSpecificity(
  a: [number, number, number],
  b: [number, number, number],
): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

/**
 * Collect all applicable styles for an element from the given stylesheet rules.
 */
export function collectApplicableStyles(
  element: Node,
  stylesheets: CSSRule[],
): Map<string, string> {
  const matching: Array<{ rule: CSSRule; index: number }> = [];

  for (let idx = 0; idx < stylesheets.length; idx++) {
    const rule = stylesheets[idx]!;
    if (matchesSelector(element, rule.selector)) {
      matching.push({ rule, index: idx });
    }
  }

  matching.sort((a, b) => {
    const specCmp = compareSpecificity(a.rule.specificity, b.rule.specificity);
    if (specCmp !== 0) return specCmp;
    return a.index - b.index;
  });

  const result = new Map<string, string>();
  for (const { rule } of matching) {
    for (const [prop, val] of rule.properties) {
      result.set(prop, val);
    }
  }

  return result;
}
