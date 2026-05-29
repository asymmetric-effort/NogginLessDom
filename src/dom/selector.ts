/**
 * CSS Selector parser and matcher.
 * Supports: tag, #id, .class, *, [attr] variants, descendant/child combinators,
 * compound selectors, comma-separated lists, :first-child, :last-child,
 * :nth-child(n), :not(selector).
 *
 * @module dom/selector
 */

import type { Node } from './index.js';

// We need Element at runtime but can't import it directly due to circular deps.
// Instead, we use duck-typing checks and accept Node, checking for Element shape.

/** A single simple selector component (tag, id, class, attr, pseudo). */
interface SimpleSelector {
  tag?: string; // lowercase tag name, or '*'
  ids: string[];
  classes: string[];
  attrs: AttrSelector[];
  pseudos: PseudoSelector[];
}

interface AttrSelector {
  name: string;
  operator?: string; // '=', '~=', '|=', '^=', '$=', '*='
  value?: string;
}

interface PseudoSelector {
  name: string; // 'first-child', 'last-child', 'nth-child', 'not'
  arg?: string; // for nth-child: the number; for :not: the inner selector string
}

/** A compound selector is a sequence of simple selectors with no combinator. */
type CompoundSelector = SimpleSelector;

/** A complex selector is a chain of compound selectors joined by combinators. */
interface ComplexSelector {
  compounds: CompoundSelector[];
  combinators: string[]; // ' ' (descendant) or '>' (child); length = compounds.length - 1
}

// ---- Parsing ----

function parseSelector(input: string): ComplexSelector[] {
  const selectorList = splitSelectorList(input);
  return selectorList.map(parseComplexSelector);
}

/** Split on commas not inside brackets or parens. */
function splitSelectorList(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function parseComplexSelector(input: string): ComplexSelector {
  const trimmed = input.trim();
  const compounds: CompoundSelector[] = [];
  const combinators: string[] = [];

  let i = 0;
  const len = trimmed.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && trimmed[i] === ' ') i++;
    if (i >= len) break;

    // Parse compound selector
    const [compound, nextI] = parseCompoundSelector(trimmed, i);
    compounds.push(compound);
    i = nextI;

    // Skip whitespace
    const hadSpace = i < len && trimmed[i] === ' ';
    while (i < len && trimmed[i] === ' ') i++;
    if (i >= len) break;

    // Check for combinator
    if (trimmed[i] === '>') {
      combinators.push('>');
      i++;
      // skip whitespace after >
      while (i < len && trimmed[i] === ' ') i++;
    } else if (hadSpace) {
      // Descendant combinator (space)
      combinators.push(' ');
    } else {
      // No combinator — still part of a compound? This shouldn't happen after parseCompound.
      break;
    }
  }

  return { compounds, combinators };
}

function parseCompoundSelector(
  input: string,
  start: number,
): [CompoundSelector, number] {
  const sel: CompoundSelector = {
    ids: [],
    classes: [],
    attrs: [],
    pseudos: [],
  };

  let i = start;
  const len = input.length;

  while (i < len) {
    const ch = input[i]!;

    if (ch === '#') {
      // ID selector
      i++;
      const [name, next] = readIdent(input, i);
      sel.ids.push(name);
      i = next;
    } else if (ch === '.') {
      // Class selector
      i++;
      const [name, next] = readIdent(input, i);
      sel.classes.push(name);
      i = next;
    } else if (ch === '[') {
      // Attribute selector
      const [attr, next] = parseAttrSelector(input, i);
      sel.attrs.push(attr);
      i = next;
    } else if (ch === ':') {
      // Pseudo-class
      const [pseudo, next] = parsePseudo(input, i);
      sel.pseudos.push(pseudo);
      i = next;
    } else if (ch === '*') {
      sel.tag = '*';
      i++;
    } else if (isIdentStart(ch)) {
      // Tag name
      const [name, next] = readIdent(input, i);
      sel.tag = name.toLowerCase();
      i = next;
    } else {
      // Not part of this compound selector (space, >, comma, etc.)
      break;
    }
  }

  return [sel, i];
}

function isIdentStart(ch: string): boolean {
  return /[a-zA-Z_-]/.test(ch);
}

function isIdentChar(ch: string): boolean {
  return /[a-zA-Z0-9_-]/.test(ch);
}

function readIdent(input: string, start: number): [string, number] {
  let i = start;
  while (i < input.length && isIdentChar(input[i]!)) i++;
  return [input.slice(start, i), i];
}

function parseAttrSelector(
  input: string,
  start: number,
): [AttrSelector, number] {
  // start is at '['
  let i = start + 1;
  const len = input.length;

  // skip whitespace
  while (i < len && input[i] === ' ') i++;

  // read attribute name
  const [name, afterName] = readIdent(input, i);
  i = afterName;

  // skip whitespace
  while (i < len && input[i] === ' ') i++;

  if (i < len && input[i] === ']') {
    // [attr] — presence only
    return [{ name }, i + 1];
  }

  // Read operator
  let operator = '';
  if (
    input[i] === '~' ||
    input[i] === '|' ||
    input[i] === '^' ||
    input[i] === '$' ||
    input[i] === '*'
  ) {
    operator = input[i]! + '=';
    i += 2; // skip e.g. ~=
  } else if (input[i] === '=') {
    operator = '=';
    i++;
  }

  // skip whitespace
  while (i < len && input[i] === ' ') i++;

  // Read value — may be quoted or unquoted
  let value = '';
  if (input[i] === '"' || input[i] === "'") {
    const quote = input[i]!;
    i++;
    const valStart = i;
    while (i < len && input[i] !== quote) i++;
    value = input.slice(valStart, i);
    i++; // skip closing quote
  } else {
    // unquoted
    const valStart = i;
    while (i < len && input[i] !== ']' && input[i] !== ' ') i++;
    value = input.slice(valStart, i);
  }

  // skip whitespace
  while (i < len && input[i] === ' ') i++;

  // skip ]
  if (i < len && input[i] === ']') i++;

  return [{ name, operator, value }, i];
}

function parsePseudo(input: string, start: number): [PseudoSelector, number] {
  // start is at ':'
  let i = start + 1;
  const [name, afterName] = readIdent(input, i);
  i = afterName;

  if (i < input.length && input[i] === '(') {
    // has argument
    i++; // skip (
    let depth = 1;
    const argStart = i;
    while (i < input.length && depth > 0) {
      if (input[i] === '(') depth++;
      else if (input[i] === ')') depth--;
      if (depth > 0) i++;
    }
    const arg = input.slice(argStart, i).trim();
    i++; // skip )
    return [{ name, arg }, i];
  }

  return [{ name }, i];
}

// ---- Matching ----

function isElement(node: Node): boolean {
  return node.nodeType === 1;
}

function getElementTag(node: Node): string {
  return (node as unknown as { tagName: string }).tagName;
}

function getElementId(node: Node): string {
  return (node as unknown as { id: string }).id;
}

function getElementClassName(node: Node): string {
  return (node as unknown as { className: string }).className;
}

function getElementAttribute(node: Node, name: string): string | null {
  return (
    node as unknown as { getAttribute(n: string): string | null }
  ).getAttribute(name);
}

function hasElementAttribute(node: Node, name: string): boolean {
  return (node as unknown as { hasAttribute(n: string): boolean }).hasAttribute(
    name,
  );
}

/** Check if a compound selector matches a single element node. */
function matchesCompound(node: Node, sel: CompoundSelector): boolean {
  if (!isElement(node)) return false;

  // Tag
  if (sel.tag && sel.tag !== '*') {
    if (getElementTag(node).toLowerCase() !== sel.tag) return false;
  }

  // IDs
  for (const id of sel.ids) {
    if (getElementId(node) !== id) return false;
  }

  // Classes
  for (const cls of sel.classes) {
    const classes = getElementClassName(node).split(/\s+/);
    if (!classes.includes(cls)) return false;
  }

  // Attributes
  for (const attr of sel.attrs) {
    if (!matchesAttr(node, attr)) return false;
  }

  // Pseudos
  for (const pseudo of sel.pseudos) {
    if (!matchesPseudo(node, pseudo)) return false;
  }

  return true;
}

function matchesAttr(node: Node, attr: AttrSelector): boolean {
  if (!hasElementAttribute(node, attr.name)) return false;
  if (!attr.operator) return true; // [attr] presence check

  const actual = getElementAttribute(node, attr.name);
  if (actual === null) return false;
  const expected = attr.value ?? '';

  switch (attr.operator) {
    case '=':
      return actual === expected;
    case '~=':
      return actual.split(/\s+/).includes(expected);
    case '|=':
      return actual === expected || actual.startsWith(expected + '-');
    case '^=':
      return actual.startsWith(expected);
    case '$=':
      return actual.endsWith(expected);
    case '*=':
      return actual.includes(expected);
    default:
      return false;
  }
}

function matchesPseudo(node: Node, pseudo: PseudoSelector): boolean {
  const parent = node.parentNode;

  switch (pseudo.name) {
    case 'first-child': {
      if (!parent) return false;
      const siblings = parent.childNodes.filter(isElement);
      return siblings.length > 0 && siblings[0] === node;
    }
    case 'last-child': {
      if (!parent) return false;
      const siblings = parent.childNodes.filter(isElement);
      return siblings.length > 0 && siblings[siblings.length - 1] === node;
    }
    case 'nth-child': {
      if (!parent || !pseudo.arg) return false;
      const n = parseInt(pseudo.arg, 10);
      const siblings = parent.childNodes.filter(isElement);
      return n >= 1 && n <= siblings.length && siblings[n - 1] === node;
    }
    case 'not': {
      if (!pseudo.arg) return false;
      // Parse the inner selector as a simple/compound selector
      const innerSelectors = parseSelector(pseudo.arg);
      // :not matches if the element does NOT match any of the inner selectors
      return !innerSelectors.some((complex) => {
        if (complex.compounds.length !== 1) return false;
        return matchesCompound(node, complex.compounds[0]!);
      });
    }
    default:
      return false;
  }
}

/** Check if a full complex selector matches an element, considering combinators. */
function matchesComplex(node: Node, sel: ComplexSelector): boolean {
  const { compounds, combinators } = sel;
  if (compounds.length === 0) return false;

  // The last compound must match the node itself
  if (!matchesCompound(node, compounds[compounds.length - 1]!)) return false;

  // Walk backwards through combinators
  let current: Node | null = node;
  for (let i = compounds.length - 2; i >= 0; i--) {
    const combinator = combinators[i]!;
    const compound = compounds[i]!;

    if (combinator === '>') {
      // Parent must match
      current = current!.parentNode;
      if (!current || !matchesCompound(current, compound)) return false;
    } else {
      // Descendant — any ancestor must match
      current = current!.parentNode;
      let found = false;
      while (current) {
        if (matchesCompound(current, compound)) {
          found = true;
          break;
        }
        current = current.parentNode;
      }
      if (!found) return false;
    }
  }

  return true;
}

// ---- Public API ----

/** Collect all element descendants of a node in document order (not including the node itself). */
function collectElements(node: Node): Node[] {
  const result: Node[] = [];
  const stack: Node[] = [];
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    stack.push(node.childNodes[i]!);
  }
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (isElement(n)) {
      result.push(n);
    }
    for (let i = n.childNodes.length - 1; i >= 0; i--) {
      stack.push(n.childNodes[i]!);
    }
  }
  return result;
}

/**
 * Find all elements matching a CSS selector within a root node.
 * Returns elements in document order, deduplicated.
 */
export function querySelectorAll(root: Node, selector: string): Node[] {
  const complexSelectors = parseSelector(selector);
  const allElements = collectElements(root);

  const resultSet = new Set<Node>();
  for (const el of allElements) {
    for (const complex of complexSelectors) {
      if (matchesComplex(el, complex)) {
        resultSet.add(el);
        break; // no need to check other selectors for this element
      }
    }
  }

  // Already in document order since we iterated allElements in order
  return Array.from(resultSet);
}

/**
 * Check if a single element matches a CSS selector.
 */
export function matchesSelector(node: Node, selector: string): boolean {
  const complexSelectors = parseSelector(selector);
  for (const complex of complexSelectors) {
    if (matchesComplex(node, complex)) {
      return true;
    }
  }
  return false;
}

/**
 * Find the first element matching a CSS selector within a root node.
 */
export function querySelector(root: Node, selector: string): Node | null {
  const complexSelectors = parseSelector(selector);
  const allElements = collectElements(root);

  for (const el of allElements) {
    for (const complex of complexSelectors) {
      if (matchesComplex(el, complex)) {
        return el;
      }
    }
  }

  return null;
}
