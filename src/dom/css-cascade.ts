/**
 * CSS Cascade — stylesheet parsing, specificity calculation, and style collection.
 * @module dom/css-cascade
 */

import { matchesSelector } from './selector.js';
import type { Node } from './index.js';
import {
  parseMediaQuery,
  evaluateMediaQuery,
  type MediaContext,
} from './media-query.js';

/**
 * A parsed CSS rule with selector, properties, and computed specificity.
 */
export interface CSSRule {
  selector: string;
  properties: Map<string, string>;
  specificity: [number, number, number]; // [id, class, element]
  importantProperties?: Set<string>;
  mediaQuery?: string;
  pseudo?: string; // e.g. '::before', '::after'
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
/**
 * Extract the contents and end position of a functional pseudo-class
 * starting at `startIdx` in `selector`.  `startIdx` points at the `(`.
 */
function extractFunctionalPseudoContents(
  selector: string,
  startIdx: number,
): { inner: string; end: number } {
  let depth = 1;
  let i = startIdx + 1;
  while (i < selector.length && depth > 0) {
    if (selector[i] === '(') depth++;
    else if (selector[i] === ')') depth--;
    i++;
  }
  return { inner: selector.slice(startIdx + 1, i - 1), end: i };
}

/**
 * Compute the highest specificity among comma-separated selector arguments.
 */
function maxSpecificityOfList(selectorList: string): [number, number, number] {
  const selectors = splitSelectors(selectorList);
  let maxSpec: [number, number, number] = [0, 0, 0];
  for (const sel of selectors) {
    const spec = computeSpecificity(sel.trim());
    if (compareSpecificityTuple(spec, maxSpec) > 0) {
      maxSpec = spec;
    }
  }
  return maxSpec;
}

function compareSpecificityTuple(
  a: [number, number, number],
  b: [number, number, number],
): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

export function computeSpecificity(selector: string): [number, number, number] {
  let ids = 0;
  let classes = 0;
  let elements = 0;

  let processed = selector;

  // Process functional pseudo-classes iteratively: :not(), :is(), :has(), :where()
  // Each takes the specificity of its most specific argument, except
  // :where() which contributes zero specificity.
  const functionalPseudos = [':not(', ':is(', ':has(', ':where('];
  for (const pseudo of functionalPseudos) {
    let searchStart = processed.indexOf(pseudo);
    while (searchStart !== -1) {
      const parenStart = searchStart + pseudo.length - 1;
      const { inner, end } = extractFunctionalPseudoContents(
        processed,
        parenStart,
      );

      if (pseudo !== ':where(') {
        // :not, :is, :has — take specificity of most specific argument
        const [a, b, c] = maxSpecificityOfList(inner);
        ids += a;
        classes += b;
        elements += c;
      }
      // :where() contributes zero specificity — just remove it

      processed = processed.slice(0, searchStart) + processed.slice(end);
      searchStart = processed.indexOf(pseudo);
    }
  }

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
  let result = '';
  let i = 0;
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') {
      // Skip until closing */
      i += 2;
      while (i < css.length - 1) {
        if (css[i] === '*' && css[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      if (i >= css.length - 1 && !(css[i - 2] === '*' && css[i - 1] === '/')) {
        i = css.length;
      }
    } else {
      result += css[i];
      i++;
    }
  }
  return result;
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
 * Find the matching closing brace for a block starting just after an
 * opening brace at position `afterOpen`, handling nested braces correctly.
 * Returns the index of the matching `}`, or -1 if not found.
 */
function findMatchingBrace(css: string, afterOpen: number): number {
  let depth = 1;
  let i = afterOpen;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    if (depth > 0) i++;
  }
  return depth === 0 ? i : -1;
}

/**
 * Parse declarations (property: value pairs) from a block that may also
 * contain nested rule blocks.  Returns only the top-level declarations,
 * stopping at or skipping nested blocks.
 */
function parseDeclarations(block: string): {
  properties: Map<string, string>;
  importantProperties: Set<string>;
} {
  const properties = new Map<string, string>();
  const importantProperties = new Set<string>();

  // Extract only top-level declarations (not inside nested blocks)
  let i = 0;
  let currentDecl = '';
  let depth = 0;
  while (i < block.length) {
    const ch = block[i]!;
    if (ch === '{') {
      depth++;
      // Skip the entire nested block
      i++;
      while (i < block.length && depth > 0) {
        if (block[i] === '{') depth++;
        else if (block[i] === '}') depth--;
        i++;
      }
      currentDecl = '';
      continue;
    }
    if (ch === ';' && depth === 0) {
      processDeclaration(currentDecl.trim(), properties, importantProperties);
      currentDecl = '';
      i++;
      continue;
    }
    currentDecl += ch;
    i++;
  }
  // Process any trailing declaration without semicolon
  if (currentDecl.trim()) {
    processDeclaration(currentDecl.trim(), properties, importantProperties);
  }

  return { properties, importantProperties };
}

function processDeclaration(
  decl: string,
  properties: Map<string, string>,
  importantProperties: Set<string>,
): void {
  if (!decl) return;
  const colonIdx = decl.indexOf(':');
  if (colonIdx === -1) return;
  const prop = decl.slice(0, colonIdx).trim();
  let val = decl.slice(colonIdx + 1).trim();
  let isImportant = false;
  if (val.endsWith('!important')) {
    val = val.slice(0, -10).trim();
    isImportant = true;
  }
  if (prop && val) {
    const expanded = expandShorthand(prop, val);
    if (expanded.size > 0) {
      properties.set(prop, val);
      if (isImportant) importantProperties.add(prop);
      for (const [lhProp, lhVal] of expanded) {
        properties.set(lhProp, lhVal);
        if (isImportant) importantProperties.add(lhProp);
      }
    } else {
      properties.set(prop, val);
      if (isImportant) importantProperties.add(prop);
    }
  }
}

/**
 * Resolve a nested selector relative to its parent selector.
 * Handles `&` (explicit parent reference) and implicit nesting (prepend parent).
 */
export function resolveNestedSelector(
  parentSelector: string,
  nestedSelector: string,
): string {
  const trimmed = nestedSelector.trim();
  if (trimmed.includes('&')) {
    // Replace & with the parent selector
    return trimmed.replace(/&/g, parentSelector);
  }
  // Implicit nesting: prepend parent with a space
  return `${parentSelector} ${trimmed}`;
}

/**
 * Extract nested rule blocks from a CSS block body.
 * Returns an array of { selector, body } for each nested rule.
 */
function extractNestedRules(
  block: string,
): Array<{ selector: string; body: string }> {
  const nested: Array<{ selector: string; body: string }> = [];
  let i = 0;
  while (i < block.length) {
    // Skip whitespace
    while (i < block.length && /\s/.test(block[i]!)) i++;
    if (i >= block.length) break;

    // Look for a nested block (selector { ... })
    const braceIdx = block.indexOf('{', i);
    if (braceIdx === -1) break;

    // Check if there's a semicolon before the brace (= just a declaration, not a nested rule)
    const semiIdx = block.indexOf(';', i);
    if (semiIdx !== -1 && semiIdx < braceIdx) {
      // This is a declaration, skip it
      i = semiIdx + 1;
      continue;
    }

    const selectorText = block.slice(i, braceIdx).trim();
    if (!selectorText) {
      i = braceIdx + 1;
      continue;
    }

    // Check if this looks like a selector (not a property: value)
    // A selector won't have a colon followed by a non-pseudo value before the brace
    // Simple heuristic: if the part before '{' contains ':' and no pseudo-class patterns,
    // it's a declaration without a semicolon
    const colonIdx = selectorText.indexOf(':');
    if (
      colonIdx !== -1 &&
      !selectorText.startsWith(':') &&
      !selectorText.includes('::') &&
      !/:[a-zA-Z-]+\(/.test(selectorText.slice(colonIdx))
    ) {
      // Looks like a declaration missing semicolon, skip past the brace block
      const endBrace = findMatchingBrace(block, braceIdx + 1);
      i = endBrace === -1 ? block.length : endBrace + 1;
      continue;
    }

    const endBrace = findMatchingBrace(block, braceIdx + 1);
    if (endBrace === -1) break;

    const body = block.slice(braceIdx + 1, endBrace);
    nested.push({ selector: selectorText, body });
    i = endBrace + 1;
  }

  return nested;
}

/**
 * Emit CSS rules for a selector and its block, handling nesting recursively.
 */
function emitRules(
  selectorText: string,
  blockContent: string,
  rules: CSSRule[],
  mediaQuery?: string,
): void {
  const { properties, importantProperties } = parseDeclarations(blockContent);

  // Emit rules for each selector in a comma-separated list
  const selectors = splitSelectors(selectorText);
  for (const sel of selectors) {
    const trimmedSel = sel.trim();
    if (!trimmedSel) continue;

    if (properties.size > 0) {
      const pseudoMatch = trimmedSel.match(/(::(?:before|after))\s*$/);
      let baseSelector = trimmedSel;
      let pseudo: string | undefined;
      if (pseudoMatch) {
        pseudo = pseudoMatch[1];
        baseSelector = trimmedSel.slice(0, -pseudoMatch[0].length).trim();
        if (!baseSelector) baseSelector = '*';
      }
      rules.push({
        selector: baseSelector,
        properties: new Map(properties),
        specificity: computeSpecificity(trimmedSel),
        importantProperties:
          importantProperties.size > 0
            ? new Set(importantProperties)
            : undefined,
        mediaQuery,
        pseudo,
      });
    }

    // Process nested rules
    const nestedRules = extractNestedRules(blockContent);
    for (const nested of nestedRules) {
      const nestedSelectors = splitSelectors(nested.selector);
      for (const nestedSel of nestedSelectors) {
        const resolved = resolveNestedSelector(trimmedSel, nestedSel);
        emitRules(resolved, nested.body, rules, mediaQuery);
      }
    }
  }
}

/**
 * Parse a CSS stylesheet string into an array of CSSRule objects.
 * Supports CSS nesting (& selector and implicit nesting).
 */
export function parseStyleSheet(css: string): CSSRule[] {
  const rules: CSSRule[] = [];
  const cleaned = removeComments(css);

  let i = 0;
  while (i < cleaned.length) {
    while (i < cleaned.length && /\s/.test(cleaned[i]!)) i++;
    if (i >= cleaned.length) break;

    if (cleaned[i] === '@') {
      // Check for @media
      const remaining = cleaned.slice(i);
      const mediaMatch = /^@media\s+([^{]+)\{/.exec(remaining);
      if (mediaMatch) {
        const mediaQuery = mediaMatch[1]!.trim();
        const mediaBlockStart = i + mediaMatch[0].length;
        const j = findMatchingBrace(cleaned, mediaBlockStart);
        if (j === -1) break;
        const innerCSS = cleaned.slice(mediaBlockStart, j);
        const innerRules = parseStyleSheet(innerCSS);
        for (const rule of innerRules) {
          rules.push({
            ...rule,
            mediaQuery: rule.mediaQuery
              ? `${mediaQuery} and ${rule.mediaQuery}`
              : mediaQuery,
          });
        }
        i = j + 1;
        continue;
      }
      i = skipAtRule(cleaned, i);
      continue;
    }

    const braceStart = cleaned.indexOf('{', i);
    if (braceStart === -1) break;

    const selectorText = cleaned.slice(i, braceStart).trim();

    const braceEnd = findMatchingBrace(cleaned, braceStart + 1);
    if (braceEnd === -1) break;

    const blockContent = cleaned.slice(braceStart + 1, braceEnd);

    emitRules(selectorText, blockContent, rules);

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

/**
 * Expand a CSS shorthand property into its longhand equivalents.
 */
export function expandShorthand(
  property: string,
  value: string,
): Map<string, string> {
  const result = new Map<string, string>();
  const prop = property.toLowerCase();

  if (prop === 'margin' || prop === 'padding') {
    const parts = value.trim().split(/\s+/);
    let top: string, right: string, bottom: string, left: string;
    if (parts.length === 1) {
      top = right = bottom = left = parts[0]!;
    } else if (parts.length === 2) {
      top = bottom = parts[0]!;
      right = left = parts[1]!;
    } else if (parts.length === 3) {
      top = parts[0]!;
      right = left = parts[1]!;
      bottom = parts[2]!;
    } else {
      top = parts[0]!;
      right = parts[1]!;
      bottom = parts[2]!;
      left = parts[3]!;
    }
    result.set(`${prop}-top`, top);
    result.set(`${prop}-right`, right);
    result.set(`${prop}-bottom`, bottom);
    result.set(`${prop}-left`, left);
    return result;
  }

  if (prop === 'border') {
    const parts = value.trim().split(/\s+/);
    for (const part of parts) {
      if (
        /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/.test(
          part,
        )
      ) {
        result.set('border-style', part);
      } else if (
        /^[0-9]/.test(part) ||
        part === 'thin' ||
        part === 'medium' ||
        part === 'thick'
      ) {
        result.set('border-width', part);
      } else {
        result.set('border-color', part);
      }
    }
    return result;
  }

  if (prop === 'background') {
    result.set('background-color', value.trim());
    return result;
  }

  if (prop === 'font') {
    const parts = value.trim().split(/\s+/);
    let idx = 0;
    if (
      parts.length > 2 &&
      /^(bold|bolder|lighter|normal|[1-9]00)$/.test(parts[0]!)
    ) {
      result.set('font-weight', parts[0]!);
      idx = 1;
    }
    if (idx < parts.length) {
      const sizeToken = parts[idx]!;
      if (sizeToken.includes('/')) {
        const [size, lineHeight] = sizeToken.split('/');
        result.set('font-size', size!);
        result.set('line-height', lineHeight!);
      } else {
        result.set('font-size', sizeToken);
      }
      idx++;
    }
    if (idx < parts.length) {
      result.set('font-family', parts.slice(idx).join(' '));
    }
    return result;
  }

  return result;
}

/**
 * Check whether a CSS property name is a custom property (starts with --).
 */
export function isCustomProperty(property: string): boolean {
  return property.startsWith('--');
}

/**
 * Resolve CSS variable references in a value string.
 * Replaces `var(--name)` with the value from variableMap.
 * Replaces `var(--name, fallback)` with value or fallback if undefined.
 * Supports one level of nested var() references.
 */
export function resolveVariables(
  value: string,
  variableMap: Map<string, string>,
): string {
  // Iteratively resolve var() references (handles nested vars)
  let result = value;
  const maxIterations = 10; // prevent infinite loops
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Find innermost var() first (no nested var inside)
    const varRegex = /var\(([^()]*)\)/g;
    let match: RegExpExecArray | null;
    let replaced = false;
    let output = '';
    let lastIndex = 0;

    while ((match = varRegex.exec(result)) !== null) {
      replaced = true;
      output += result.slice(lastIndex, match.index);
      const inner = match[1]!.trim();
      // Split on the first comma for fallback
      const commaIdx = inner.indexOf(',');
      let varName: string;
      let fallback: string | undefined;
      if (commaIdx !== -1) {
        varName = inner.slice(0, commaIdx).trim();
        fallback = inner.slice(commaIdx + 1).trim();
      } else {
        varName = inner;
      }
      const resolved = variableMap.get(varName);
      if (resolved !== undefined) {
        output += resolved;
      } else if (fallback !== undefined) {
        output += fallback;
      } else {
        output += match[0]; // leave as-is if unresolvable
      }
      lastIndex = match.index + match[0].length;
    }
    if (!replaced) break;
    output += result.slice(lastIndex);
    result = output;
  }
  return result;
}

/**
 * Resolve CSS calc() expressions.
 * Only resolves when all units match (px with px, etc).
 * Leaves mixed-unit expressions as-is.
 */
export function resolveCalc(expression: string): string {
  // Resolve innermost calc() expressions first
  let result = expression;
  const maxIterations = 10;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Find innermost calc() (no nested calc inside)
    const calcRegex = /calc\(([^()]*)\)/g;
    let match: RegExpExecArray | null;
    let replaced = false;
    let output = '';
    let lastIndex = 0;

    while ((match = calcRegex.exec(result)) !== null) {
      replaced = true;
      output += result.slice(lastIndex, match.index);
      const inner = match[1]!.trim();
      const resolved = evaluateCalcExpression(inner);
      output += resolved;
      lastIndex = match.index + match[0].length;
    }
    if (!replaced) break;
    output += result.slice(lastIndex);
    result = output;
  }
  return result;
}

/**
 * Evaluate a simple calc expression (no nested calc).
 * Supports +, -, *, / with same-unit operands.
 */
function evaluateCalcExpression(expr: string): string {
  const trimmed = expr.trim();

  // Parse tokens: numbers with optional units
  // We support: number unit, operators +, -, *, /
  const tokenRegex =
    /(-?\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)?|([+\-*/])/g;
  const tokens: Array<
    | {
        type: 'number';
        value: number;
        unit: string;
      }
    | { type: 'operator'; op: string }
  > = [];

  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenRegex.exec(trimmed)) !== null) {
    if (tokenMatch[3]) {
      tokens.push({ type: 'operator', op: tokenMatch[3] });
    } else if (tokenMatch[1]) {
      tokens.push({
        type: 'number',
        value: parseFloat(tokenMatch[1]),
        unit: tokenMatch[2] ?? '',
      });
    }
  }

  if (tokens.length === 0) return `calc(${expr})`;

  // Handle * and / first (higher precedence)
  const intermediate: typeof tokens = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.type === 'operator' && (token.op === '*' || token.op === '/')) {
      const left = intermediate.pop();
      const right = tokens[++i];
      if (
        !left ||
        !right ||
        left.type !== 'number' ||
        right.type !== 'number'
      ) {
        return `calc(${expr})`;
      }
      // For multiplication: one operand must be unitless
      if (token.op === '*') {
        let resultVal: number;
        let resultUnit: string;
        if (left.unit === '' && right.unit !== '') {
          resultVal = left.value * right.value;
          resultUnit = right.unit;
        } else if (left.unit !== '' && right.unit === '') {
          resultVal = left.value * right.value;
          resultUnit = left.unit;
        } else if (left.unit === '' && right.unit === '') {
          resultVal = left.value * right.value;
          resultUnit = '';
        } else {
          return `calc(${expr})`; // can't multiply two units
        }
        intermediate.push({
          type: 'number',
          value: resultVal,
          unit: resultUnit,
        });
      } else {
        // Division: right operand should be unitless
        if (right.unit !== '' && left.unit !== right.unit) {
          return `calc(${expr})`;
        }
        const resultUnit = right.unit === '' ? left.unit : '';
        intermediate.push({
          type: 'number',
          value: left.value / right.value,
          unit: resultUnit,
        });
      }
    } else {
      intermediate.push(token);
    }
  }

  // Handle + and -
  if (intermediate.length === 0) return `calc(${expr})`;
  if (intermediate[0]!.type !== 'number') return `calc(${expr})`;

  let resultValue = (
    intermediate[0] as { type: 'number'; value: number; unit: string }
  ).value;
  let resultUnit = (
    intermediate[0] as { type: 'number'; value: number; unit: string }
  ).unit;

  for (let i = 1; i < intermediate.length; i += 2) {
    const op = intermediate[i];
    const operand = intermediate[i + 1];
    if (
      !op ||
      !operand ||
      op.type !== 'operator' ||
      operand.type !== 'number'
    ) {
      return `calc(${expr})`;
    }
    // For + and -, units must match
    if (operand.unit !== resultUnit) {
      // Mixed units: can't resolve
      return `calc(${expr})`;
    }
    if (op.op === '+') {
      resultValue += operand.value;
    } else if (op.op === '-') {
      resultValue -= operand.value;
    } else {
      return `calc(${expr})`;
    }
  }

  // Format result: remove trailing .0
  const formatted =
    resultValue === Math.floor(resultValue)
      ? resultValue.toString()
      : resultValue.toString();
  return `${formatted}${resultUnit}`;
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
  mediaContext?: MediaContext,
  pseudo?: string | null,
): Map<string, string> {
  const matching: Array<{ rule: CSSRule; index: number }> = [];
  const targetPseudo = pseudo || undefined;

  for (let idx = 0; idx < stylesheets.length; idx++) {
    const rule = stylesheets[idx]!;
    // Filter by pseudo-element: only match rules with same pseudo
    if (targetPseudo) {
      if (rule.pseudo !== targetPseudo) continue;
    } else {
      if (rule.pseudo) continue;
    }
    // Skip rules with media queries that don't match
    if (rule.mediaQuery) {
      if (!mediaContext) continue;
      const parsed = parseMediaQuery(rule.mediaQuery);
      if (!evaluateMediaQuery(parsed, mediaContext)) continue;
    }
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
  const resultImportant = new Set<string>();
  for (const { rule } of matching) {
    for (const [prop, val] of rule.properties) {
      const isImportant = rule.importantProperties?.has(prop) ?? false;
      const alreadyImportant = resultImportant.has(prop);
      if (alreadyImportant && !isImportant) {
        continue;
      }
      result.set(prop, val);
      if (isImportant) {
        resultImportant.add(prop);
      }
    }
  }

  // Resolve CSS variables
  const variableMap = new Map<string, string>();
  for (const [prop, val] of result) {
    if (isCustomProperty(prop)) {
      variableMap.set(prop, val);
    }
  }
  // Resolve var() references in all values
  if (variableMap.size > 0) {
    for (const [prop, val] of result) {
      if (!isCustomProperty(prop) && val.includes('var(')) {
        result.set(prop, resolveVariables(val, variableMap));
      }
    }
  }

  // Resolve calc() expressions
  for (const [prop, val] of result) {
    if (val.includes('calc(')) {
      result.set(prop, resolveCalc(val));
    }
  }

  return result;
}

/**
 * Collect applicable styles and return both values and importance flags.
 */
export function collectApplicableStylesWithImportance(
  element: Node,
  stylesheets: CSSRule[],
  mediaContext?: MediaContext,
  pseudo?: string | null,
): { styles: Map<string, string>; important: Set<string> } {
  const matching: Array<{ rule: CSSRule; index: number }> = [];
  const targetPseudo = pseudo || undefined;

  for (let idx = 0; idx < stylesheets.length; idx++) {
    const rule = stylesheets[idx]!;
    // Filter by pseudo-element
    if (targetPseudo) {
      if (rule.pseudo !== targetPseudo) continue;
    } else {
      if (rule.pseudo) continue;
    }
    // Skip rules with media queries that don't match
    if (rule.mediaQuery) {
      if (!mediaContext) continue;
      const parsed = parseMediaQuery(rule.mediaQuery);
      if (!evaluateMediaQuery(parsed, mediaContext)) continue;
    }
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
  const resultImportant = new Set<string>();
  for (const { rule } of matching) {
    for (const [prop, val] of rule.properties) {
      const isImportant = rule.importantProperties?.has(prop) ?? false;
      const alreadyImportant = resultImportant.has(prop);
      if (alreadyImportant && !isImportant) {
        continue;
      }
      result.set(prop, val);
      if (isImportant) {
        resultImportant.add(prop);
      }
    }
  }

  // Resolve CSS variables
  const variableMap = new Map<string, string>();
  for (const [prop, val] of result) {
    if (isCustomProperty(prop)) {
      variableMap.set(prop, val);
    }
  }
  if (variableMap.size > 0) {
    for (const [prop, val] of result) {
      if (!isCustomProperty(prop) && val.includes('var(')) {
        result.set(prop, resolveVariables(val, variableMap));
      }
    }
  }

  // Resolve calc() expressions
  for (const [prop, val] of result) {
    if (val.includes('calc(')) {
      result.set(prop, resolveCalc(val));
    }
  }

  return { styles: result, important: resultImportant };
}
