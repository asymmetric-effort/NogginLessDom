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
      // Check for @media
      const remaining = cleaned.slice(i);
      const mediaMatch = /^@media\s+([^{]+)\{/.exec(remaining);
      if (mediaMatch) {
        const mediaQuery = mediaMatch[1]!.trim();
        const mediaBlockStart = i + mediaMatch[0].length;
        // Find the matching closing brace
        let depth = 1;
        let j = mediaBlockStart;
        while (j < cleaned.length && depth > 0) {
          if (cleaned[j] === '{') depth++;
          else if (cleaned[j] === '}') depth--;
          if (depth > 0) j++;
        }
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

    const braceEnd = cleaned.indexOf('}', braceStart);
    if (braceEnd === -1) break;

    const declarationBlock = cleaned.slice(braceStart + 1, braceEnd).trim();

    const properties = new Map<string, string>();
    const importantProperties = new Set<string>();
    if (declarationBlock) {
      const declarations = declarationBlock
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const decl of declarations) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) continue;
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
            // Keep original shorthand for getPropertyValue compatibility
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
    }

    const selectors = splitSelectors(selectorText);
    for (const sel of selectors) {
      const trimmedSel = sel.trim();
      if (trimmedSel) {
        // Check for pseudo-element in selector (e.g. div::before)
        const pseudoMatch = trimmedSel.match(/(::(?:before|after))\s*$/);
        let baseSelector = trimmedSel;
        let pseudo: string | undefined;
        if (pseudoMatch) {
          pseudo = pseudoMatch[1];
          baseSelector = trimmedSel.slice(0, -pseudoMatch[0].length).trim();
          // If selector is just ::before with no element, it applies to any element
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
          pseudo,
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
