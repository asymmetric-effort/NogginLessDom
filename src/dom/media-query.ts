/**
 * Media query parser and evaluator for dynamic matchMedia support.
 * @module dom/media-query
 */

export type MediaCondition =
  | { type: 'min-width'; value: number }
  | { type: 'max-width'; value: number }
  | { type: 'min-height'; value: number }
  | { type: 'max-height'; value: number }
  | { type: 'prefers-color-scheme'; value: string }
  | { type: 'prefers-reduced-motion'; value: string }
  | { type: 'media-type'; value: string }
  | { type: 'unknown' };

export interface ParsedMediaQuery {
  conditions: MediaCondition[];
  negated: boolean;
}

export interface MediaContext {
  width: number;
  height: number;
  colorScheme: 'light' | 'dark';
  reducedMotion: boolean;
  mediaType: string;
}

/**
 * Parse a single parenthesized condition like `(min-width: 768px)`.
 */
function parseCondition(raw: string): MediaCondition {
  const trimmed = raw.trim();
  // Must be wrapped in parens
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
    return { type: 'unknown' };
  }
  const inner = trimmed.slice(1, -1).trim();
  const colonIdx = inner.indexOf(':');
  if (colonIdx === -1) {
    return { type: 'unknown' };
  }
  const property = inner.slice(0, colonIdx).trim().toLowerCase();
  const value = inner.slice(colonIdx + 1).trim();

  switch (property) {
    case 'min-width':
    case 'max-width':
    case 'min-height':
    case 'max-height': {
      const px = parsePxValue(value);
      if (px === null) return { type: 'unknown' };
      return { type: property, value: px };
    }
    case 'prefers-color-scheme':
      return { type: 'prefers-color-scheme', value: value.toLowerCase() };
    case 'prefers-reduced-motion':
      return { type: 'prefers-reduced-motion', value: value.toLowerCase() };
    default:
      return { type: 'unknown' };
  }
}

/**
 * Parse a pixel value like `768px` and return the numeric value, or null.
 */
function parsePxValue(value: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*px$/i.exec(value.trim());
  if (!match) return null;
  return parseFloat(match[1]!);
}

const KNOWN_MEDIA_TYPES = new Set(['all', 'screen', 'print']);

/**
 * Parse a media query string (potentially comma-separated) into structured form.
 */
export function parseMediaQuery(query: string): ParsedMediaQuery[] {
  const queries = query.split(',');
  return queries.map((q) => parseSingleQuery(q.trim()));
}

/**
 * Parse a single media query (no commas).
 */
function parseSingleQuery(query: string): ParsedMediaQuery {
  if (!query) {
    return { conditions: [{ type: 'unknown' }], negated: false };
  }

  let negated = false;
  let rest = query.trim();

  // Check for `not` prefix
  if (/^not\s+/i.test(rest)) {
    negated = true;
    rest = rest.slice(4).trim();
  }

  // Split by ' and ' (case-insensitive, single space boundary)
  const parts = rest.split(/ and /i).map((s) => s.trim());
  const conditions: MediaCondition[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('(')) {
      // Parenthesized condition
      conditions.push(parseCondition(trimmed));
    } else if (KNOWN_MEDIA_TYPES.has(trimmed.toLowerCase())) {
      // Media type
      conditions.push({ type: 'media-type', value: trimmed.toLowerCase() });
    } else {
      // Unknown token
      conditions.push({ type: 'unknown' });
    }
  }

  if (conditions.length === 0) {
    conditions.push({ type: 'unknown' });
  }

  return { conditions, negated };
}

/**
 * Evaluate a single condition against a media context.
 */
function evaluateCondition(
  condition: MediaCondition,
  context: MediaContext,
): boolean {
  switch (condition.type) {
    case 'min-width':
      return context.width >= condition.value;
    case 'max-width':
      return context.width <= condition.value;
    case 'min-height':
      return context.height >= condition.value;
    case 'max-height':
      return context.height <= condition.value;
    case 'prefers-color-scheme':
      return context.colorScheme === condition.value;
    case 'prefers-reduced-motion':
      if (condition.value === 'reduce') return context.reducedMotion;
      if (condition.value === 'no-preference') return !context.reducedMotion;
      return false;
    case 'media-type':
      return condition.value === 'all' || condition.value === context.mediaType;
    case 'unknown':
      return false;
  }
}

/**
 * Evaluate parsed media queries (OR of queries, AND within each query) against context.
 */
export function evaluateMediaQuery(
  parsed: ParsedMediaQuery[],
  context: MediaContext,
): boolean {
  // OR across comma-separated queries
  return parsed.some((query) => {
    // AND across conditions within a single query
    const allMatch = query.conditions.every((cond) =>
      evaluateCondition(cond, context),
    );
    return query.negated ? !allMatch : allMatch;
  });
}
