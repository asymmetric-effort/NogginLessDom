/**
 * Assertion diff engine — produces colored, human-readable diffs for assertion errors.
 * @module assertions/diff
 */

export interface DiffOptions {
  maxLength?: number;
  colorize?: boolean;
}

const DEFAULT_MAX_LENGTH = 1000;

let globalDiffConfig: DiffOptions = {};

/** Set global diff configuration. */
export function configureDiff(options: DiffOptions): void {
  globalDiffConfig = { ...options };
}

/** Get the current global diff configuration. */
export function getDiffConfig(): DiffOptions {
  return { ...globalDiffConfig };
}

function resolveOptions(options?: DiffOptions): {
  maxLength: number;
  colorize: boolean;
} {
  const merged = { ...globalDiffConfig, ...options };
  return {
    maxLength: merged.maxLength ?? DEFAULT_MAX_LENGTH,
    colorize:
      merged.colorize ??
      (typeof process !== 'undefined' && process.stdout?.isTTY === true),
  };
}

// --- ANSI color helpers ---

/** Wrap string in green ANSI codes. Returns plain text if not TTY. */
export function green(s: string): string {
  if (typeof process !== 'undefined' && process.stdout?.isTTY === true) {
    return `\x1b[32m${s}\x1b[39m`;
  }
  return s;
}

/** Wrap string in red ANSI codes. Returns plain text if not TTY. */
export function red(s: string): string {
  if (typeof process !== 'undefined' && process.stdout?.isTTY === true) {
    return `\x1b[31m${s}\x1b[39m`;
  }
  return s;
}

/** Wrap string in dim ANSI codes. Returns plain text if not TTY. */
export function dim(s: string): string {
  if (typeof process !== 'undefined' && process.stdout?.isTTY === true) {
    return `\x1b[2m${s}\x1b[22m`;
  }
  return s;
}

/** Wrap string in bold ANSI codes. Returns plain text if not TTY. */
export function bold(s: string): string {
  if (typeof process !== 'undefined' && process.stdout?.isTTY === true) {
    return `\x1b[1m${s}\x1b[22m`;
  }
  return s;
}

/** Remove all ANSI escape sequences from a string. */
export function stripAnsi(s: string): string {
  return s.replace(new RegExp('\x1b\\[[0-9;]*m', 'g'), '');
}

// --- Internal color helpers that respect the resolved colorize option ---

function greenC(s: string, colorize: boolean): string {
  return colorize ? `\x1b[32m${s}\x1b[39m` : s;
}

function redC(s: string, colorize: boolean): string {
  return colorize ? `\x1b[31m${s}\x1b[39m` : s;
}

function dimC(s: string, colorize: boolean): string {
  return colorize ? `\x1b[2m${s}\x1b[22m` : s;
}

// --- Truncation ---

function truncate(s: string, maxLength: number): string {
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength) + '...';
}

// --- Serialization ---

function serialize(value: unknown, maxLength: number): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string')
    return truncate(JSON.stringify(value), maxLength);
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  try {
    return truncate(JSON.stringify(value, null, 2), maxLength);
  } catch {
    return truncate(String(value), maxLength);
  }
}

// --- Object Diff ---

function objectDiffLines(
  expected: unknown,
  received: unknown,
  indent: string,
  maxLength: number,
  colorize: boolean,
  depth: number,
): string[] {
  if (depth > 50) return [indent + dimC('(max depth reached)', colorize)];

  // Both primitives or one is primitive
  if (
    expected === null ||
    received === null ||
    typeof expected !== 'object' ||
    typeof received !== 'object'
  ) {
    if (Object.is(expected, received)) return [];
    return [
      greenC(
        `${indent}- Expected: ${truncate(serialize(expected, maxLength), maxLength)}`,
        colorize,
      ),
      redC(
        `${indent}+ Received: ${truncate(serialize(received, maxLength), maxLength)}`,
        colorize,
      ),
    ];
  }

  // Array handling
  if (Array.isArray(expected) && Array.isArray(received)) {
    const lines: string[] = [];
    const maxLen = Math.max(expected.length, received.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= expected.length) {
        lines.push(
          redC(
            `${indent}+ [${i}]: ${truncate(serialize(received[i], maxLength), maxLength)}`,
            colorize,
          ),
        );
      } else if (i >= received.length) {
        lines.push(
          greenC(
            `${indent}- [${i}]: ${truncate(serialize(expected[i], maxLength), maxLength)}`,
            colorize,
          ),
        );
      } else if (!deepEqual(expected[i], received[i])) {
        const nested = objectDiffLines(
          expected[i],
          received[i],
          indent + '  ',
          maxLength,
          colorize,
          depth + 1,
        );
        if (nested.length > 0) {
          lines.push(dimC(`${indent}[${i}]:`, colorize));
          lines.push(...nested);
        }
      }
    }
    return lines;
  }

  // If only one is an array
  if (Array.isArray(expected) || Array.isArray(received)) {
    return [
      greenC(
        `${indent}- Expected: ${truncate(serialize(expected, maxLength), maxLength)}`,
        colorize,
      ),
      redC(
        `${indent}+ Received: ${truncate(serialize(received, maxLength), maxLength)}`,
        colorize,
      ),
    ];
  }

  // Object handling
  const expObj = expected as Record<string, unknown>;
  const recObj = received as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(expObj), ...Object.keys(recObj)]);
  const lines: string[] = [];

  for (const key of allKeys) {
    const inExp = key in expObj;
    const inRec = key in recObj;

    if (inExp && !inRec) {
      lines.push(
        greenC(
          `${indent}- ${key}: ${truncate(serialize(expObj[key], maxLength), maxLength)}`,
          colorize,
        ),
      );
    } else if (!inExp && inRec) {
      lines.push(
        redC(
          `${indent}+ ${key}: ${truncate(serialize(recObj[key], maxLength), maxLength)}`,
          colorize,
        ),
      );
    } else if (inExp && inRec && !deepEqual(expObj[key], recObj[key])) {
      const nested = objectDiffLines(
        expObj[key],
        recObj[key],
        indent + '  ',
        maxLength,
        colorize,
        depth + 1,
      );
      if (nested.length > 0) {
        lines.push(dimC(`${indent}${key}:`, colorize));
        lines.push(...nested);
      }
    }
  }

  return lines;
}

/** Simple deep equality check for diff purposes. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    a === null ||
    b === null ||
    typeof a !== 'object' ||
    typeof b !== 'object'
  )
    return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => key in bObj && deepEqual(aObj[key], bObj[key]));
}

/**
 * Produce a diff between two objects/arrays/primitives.
 * Shows only changed/added/removed keys with `- expected` (green) / `+ received` (red) format.
 */
export function objectDiff(
  expected: unknown,
  received: unknown,
  options?: DiffOptions,
): string {
  const { maxLength, colorize } = resolveOptions(options);
  const lines = objectDiffLines(
    expected,
    received,
    '  ',
    maxLength,
    colorize,
    0,
  );
  return lines.join('\n');
}

/**
 * Produce a diff between two strings.
 * Multi-line: line-by-line diff. Single-line: expected vs received with caret.
 */
export function stringDiff(
  expected: string,
  received: string,
  options?: DiffOptions,
): string {
  const { maxLength, colorize } = resolveOptions(options);

  const expLines = expected.split('\n');
  const recLines = received.split('\n');

  // Multi-line
  if (expLines.length > 1 || recLines.length > 1) {
    const lines: string[] = [];
    const maxLen = Math.max(expLines.length, recLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= expLines.length) {
        lines.push(redC(`+ ${truncate(recLines[i], maxLength)}`, colorize));
      } else if (i >= recLines.length) {
        lines.push(greenC(`- ${truncate(expLines[i], maxLength)}`, colorize));
      } else if (expLines[i] !== recLines[i]) {
        lines.push(greenC(`- ${truncate(expLines[i], maxLength)}`, colorize));
        lines.push(redC(`+ ${truncate(recLines[i], maxLength)}`, colorize));
      } else {
        lines.push(dimC(`  ${truncate(expLines[i], maxLength)}`, colorize));
      }
    }
    return lines.join('\n');
  }

  // Single-line: show expected/received with caret at first difference
  let caretPos = 0;
  while (
    caretPos < expected.length &&
    caretPos < received.length &&
    expected[caretPos] === received[caretPos]
  ) {
    caretPos++;
  }

  const lines: string[] = [
    greenC(
      `- Expected: ${truncate(JSON.stringify(expected), maxLength)}`,
      colorize,
    ),
    redC(
      `+ Received: ${truncate(JSON.stringify(received), maxLength)}`,
      colorize,
    ),
    `  ${' '.repeat('Expected: '.length + caretPos + 1)}^`,
  ];
  return lines.join('\n');
}

/**
 * Format an expected vs received comparison, choosing the best diff format
 * based on the types of the values.
 */
export function formatExpectedReceived(
  expected: unknown,
  received: unknown,
  options?: DiffOptions,
): string {
  const { maxLength, colorize } = resolveOptions(options);

  if (typeof expected === 'string' && typeof received === 'string') {
    return stringDiff(expected, received, { maxLength, colorize });
  }

  if (
    (typeof expected === 'object' && expected !== null) ||
    (typeof received === 'object' && received !== null)
  ) {
    const diff = objectDiff(expected, received, { maxLength, colorize });
    if (diff) return diff;
  }

  // Primitives
  const lines = [
    greenC(
      `- Expected: ${truncate(serialize(expected, maxLength), maxLength)}`,
      colorize,
    ),
    redC(
      `+ Received: ${truncate(serialize(received, maxLength), maxLength)}`,
      colorize,
    ),
  ];
  return lines.join('\n');
}
