/**
 * Snapshot testing utilities for comprehensive snapshot matching.
 * @module snapshots
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Configuration for the serialize function's pretty-formatting behavior.
 */
export interface SerializeConfig {
  indent?: number;
  maxDepth?: number;
  min?: boolean;
  printBasicPrototype?: boolean;
}

/**
 * Printer function type passed to custom serializers, allowing them
 * to recursively serialize nested values.
 */
export type PrinterFn = (
  value: unknown,
  config: SerializeConfig,
  indentation: string,
  depth: number,
  refs: Set<unknown>,
) => string;

/**
 * Interface for custom snapshot serializer plugins.
 */
export interface SnapshotSerializer {
  test(value: unknown): boolean;
  serialize(
    value: unknown,
    config: SerializeConfig,
    indentation: string,
    depth: number,
    refs: Set<unknown>,
    printer: PrinterFn,
  ): string;
}

/**
 * Header written at the top of every snapshot file.
 */
export const SNAPSHOT_HEADER =
  '// Snapshot v1, https://nogginlessdom.asymmetric-effort.com';

const serializers: SnapshotSerializer[] = [];

/**
 * Register a custom snapshot serializer plugin.
 */
export function addSerializer(serializer: SnapshotSerializer): void {
  serializers.push(serializer);
}

/**
 * Remove a previously registered custom snapshot serializer plugin.
 */
export function removeSerializer(serializer: SnapshotSerializer): void {
  const idx = serializers.indexOf(serializer);
  if (idx !== -1) {
    serializers.splice(idx, 1);
  }
}

/**
 * Get all currently registered custom snapshot serializers.
 */
export function getSerializers(): SnapshotSerializer[] {
  return [...serializers];
}

const DEFAULT_CONFIG: Required<SerializeConfig> = {
  indent: 2,
  maxDepth: 10,
  min: false,
  printBasicPrototype: true,
};

function resolveConfig(config?: SerializeConfig): Required<SerializeConfig> {
  return {
    indent: config?.indent ?? DEFAULT_CONFIG.indent,
    maxDepth: config?.maxDepth ?? DEFAULT_CONFIG.maxDepth,
    min: config?.min ?? DEFAULT_CONFIG.min,
    printBasicPrototype:
      config?.printBasicPrototype ?? DEFAULT_CONFIG.printBasicPrototype,
  };
}

/**
 * Shape of a DOM-like attribute for HTML element serialization.
 */
interface DomLikeAttribute {
  name: string;
  value: string;
}

/**
 * Shape of a DOM-like element for HTML element serialization.
 */
interface DomLikeElement {
  tagName: string;
  nodeType: number;
  attributes?: DomLikeAttribute[];
  children?: DomLikeChild[];
}

/**
 * A child node may be an element or a text node.
 */
type DomLikeChild = DomLikeElement | { nodeType: number; textContent?: string };

/**
 * Check if a value looks like a DOM element (has tagName and nodeType).
 */
function isDomLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['tagName'] === 'string' && typeof obj['nodeType'] === 'number'
  );
}

/**
 * Serialize a DOM-like element to an HTML-like string.
 */
function serializeDomElement(
  el: DomLikeElement,
  config: Required<SerializeConfig>,
  indentation: string,
  depth: number,
  refs: Set<unknown>,
): string {
  const attrs = el.attributes ?? [];
  const attrStr = attrs.map((a) => `${a.name}="${a.value}"`).join(' ');
  const tag = attrStr ? `${el.tagName} ${attrStr}` : el.tagName;

  const children = el.children ?? [];
  if (children.length === 0) {
    return `<${tag} />`;
  }

  const indentStr = ' '.repeat(config.indent);
  const nextIndentation = indentation + indentStr;
  const childParts = children.map((child) => {
    if (isDomLike(child)) {
      return (
        nextIndentation +
        serializeDomElement(
          child as DomLikeElement,
          config,
          nextIndentation,
          depth + 1,
          refs,
        )
      );
    }
    // Text node
    const textNode = child as { nodeType: number; textContent?: string };
    return nextIndentation + (textNode.textContent ?? '');
  });

  return `<${tag}>\n${childParts.join('\n')}\n${indentation}</${el.tagName}>`;
}

/**
 * Internal recursive printer.
 */
function printValue(
  value: unknown,
  config: Required<SerializeConfig>,
  indentation: string,
  depth: number,
  refs: Set<unknown>,
): string {
  // Check custom serializers first (in registration order)
  for (const s of serializers) {
    if (s.test(value)) {
      return s.serialize(
        value,
        config,
        indentation,
        depth,
        refs,
        (v, c, i, d, r) => printValue(v, resolveConfig(c), i, d, r),
      );
    }
  }

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (typeof value === 'symbol') {
    const desc = value.description;
    return desc ? `Symbol(${desc})` : 'Symbol()';
  }
  if (typeof value === 'function') {
    const name = value.name || 'anonymous';
    return `[Function ${name}]`;
  }
  if (value instanceof RegExp) return String(value);
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (value instanceof Error) return `[Error: ${value.message}]`;

  // DOM-like element detection (#135)
  if (isDomLike(value)) {
    return serializeDomElement(
      value as DomLikeElement,
      config,
      indentation,
      depth,
      refs,
    );
  }

  // Circular reference detection
  if (refs.has(value)) return '[Circular]';
  refs.add(value);

  // Max depth check
  if (depth >= config.maxDepth) {
    if (Array.isArray(value)) {
      refs.delete(value);
      return '[Array]';
    }
    refs.delete(value);
    return '[Object]';
  }

  const indentStr = ' '.repeat(config.indent);
  const nextIndentation = config.min ? '' : indentation + indentStr;
  const sep = config.min ? ' ' : '\n';
  const closingIndent = config.min ? '' : indentation;

  let result: string;

  if (value instanceof Map) {
    const entries = Array.from(value.entries() as Iterable<[unknown, unknown]>);
    if (entries.length === 0) {
      result = 'Map {}';
    } else {
      const items = entries.map(([k, v]) => {
        const keyStr = printValue(k, config, nextIndentation, depth + 1, refs);
        const valStr = printValue(v, config, nextIndentation, depth + 1, refs);
        return `${config.min ? '' : nextIndentation}${keyStr} => ${valStr},`;
      });
      result = `Map {${sep}${items.join(sep)}${sep}${closingIndent}}`;
    }
  } else if (value instanceof Set) {
    const items = Array.from(value.values() as Iterable<unknown>);
    if (items.length === 0) {
      result = 'Set {}';
    } else {
      const formatted = items.map((v) => {
        const valStr = printValue(v, config, nextIndentation, depth + 1, refs);
        return `${config.min ? '' : nextIndentation}${valStr},`;
      });
      result = `Set {${sep}${formatted.join(sep)}${sep}${closingIndent}}`;
    }
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      result = 'Array []';
    } else {
      const items = value.map((v) => {
        const valStr = printValue(v, config, nextIndentation, depth + 1, refs);
        return `${config.min ? '' : nextIndentation}${valStr},`;
      });
      if (config.min) {
        const inner = value.map((v) =>
          printValue(v, config, nextIndentation, depth + 1, refs),
        );
        result = `[${inner.join(', ')}]`;
      } else {
        result = `Array [${sep}${items.join(sep)}${sep}${closingIndent}]`;
      }
    }
  } else {
    // Plain object
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    if (keys.length === 0) {
      result = config.printBasicPrototype ? 'Object {}' : '{}';
    } else {
      const entries = keys.map((key) => {
        const valStr = printValue(
          obj[key],
          config,
          nextIndentation,
          depth + 1,
          refs,
        );
        return `${config.min ? '' : nextIndentation}"${key}": ${valStr},`;
      });
      if (config.min) {
        const inner = keys.map((key) => {
          const valStr = printValue(
            obj[key],
            config,
            nextIndentation,
            depth + 1,
            refs,
          );
          return `"${key}": ${valStr}`;
        });
        result = config.printBasicPrototype
          ? `{${inner.join(', ')}}`
          : `{${inner.join(', ')}}`;
      } else {
        result = config.printBasicPrototype
          ? `Object {${sep}${entries.join(sep)}${sep}${closingIndent}}`
          : `{${sep}${entries.join(sep)}${sep}${closingIndent}}`;
      }
    }
  }

  refs.delete(value);
  return result;
}

/**
 * Serialize a value into a human-readable snapshot string.
 */
export function serialize(value: unknown, config?: SerializeConfig): string {
  const resolved = resolveConfig(config);
  return printValue(value, resolved, '', 0, new Set<unknown>());
}

/**
 * Generate a unified-style diff between two strings with +/- markers.
 */
function generateDiff(expected: string, received: string): string {
  const expectedLines = expected.split('\n');
  const receivedLines = received.split('\n');
  const lines: string[] = [];
  const maxLen = Math.max(expectedLines.length, receivedLines.length);

  for (let i = 0; i < maxLen; i++) {
    const expLine = i < expectedLines.length ? expectedLines[i]! : undefined;
    const recLine = i < receivedLines.length ? receivedLines[i]! : undefined;

    if (expLine === recLine) {
      lines.push(`  ${expLine}`);
    } else {
      if (expLine !== undefined) {
        lines.push(`- ${expLine}`);
      }
      if (recLine !== undefined) {
        lines.push(`+ ${recLine}`);
      }
    }
  }
  return lines.join('\n');
}

/**
 * Escape backticks and backslashes for snapshot file template literals.
 */
function escapeForTemplate(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

/**
 * Unescape template literal content from snapshot file.
 */
function unescapeFromTemplate(str: string): string {
  return str.replace(/\\\$/g, '$').replace(/\\`/g, '`').replace(/\\\\/g, '\\');
}

/**
 * Read all snapshots from a snapshot file. Returns a map of name -> serialized value.
 */
function readSnapshotFile(filePath: string): Map<string, string> {
  const snapshots = new Map<string, string>();
  if (!fs.existsSync(filePath)) return snapshots;

  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /exports\['(.+?)'\]\s*=\s*`([\s\S]*?)`;/g;
  let match: RegExpExecArray | null = regex.exec(content);
  while (match !== null) {
    snapshots.set(match[1]!, unescapeFromTemplate(match[2]!));
    match = regex.exec(content);
  }
  return snapshots;
}

/**
 * Write all snapshots to a snapshot file.
 */
function writeSnapshotFile(
  filePath: string,
  snapshots: Map<string, string>,
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines: string[] = [SNAPSHOT_HEADER];
  for (const [name, value] of snapshots) {
    lines.push(`exports['${name}'] = \`${escapeForTemplate(value)}\`;`);
  }
  fs.writeFileSync(filePath, lines.join('\n\n') + '\n', 'utf-8');
}

/**
 * Determine the snapshot file path for a given test file.
 * Uses the caller's file to determine location.
 */
function getSnapshotFilePath(): string {
  const err = new Error();
  const stack = err.stack ?? '';
  const lines = stack.split('\n');

  // Walk the stack to find the first frame outside this module
  for (const line of lines) {
    // Match file paths in stack traces
    const match = /(?:at\s+.*?\s+\(|at\s+)(\/[^:)]+\.(?:ts|js))/.exec(line);
    if (match) {
      const filePath = match[1]!;
      // Skip this file and the assertions/index file
      if (
        filePath.includes('snapshots.ts') ||
        filePath.includes('snapshots.js')
      )
        continue;
      if (filePath.includes('assertions/index')) continue;
      // Found the test file
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath, path.extname(filePath));
      return path.join(dir, '__snapshots__', `${basename}.snap`);
    }
  }

  // Fallback: use cwd
  return path.join(process.cwd(), '__snapshots__', 'unknown.snap');
}

// ---------------------------------------------------------------------------
// Update mode management (#133)
// ---------------------------------------------------------------------------

type UpdateMode = 'all' | 'new' | 'none';

let updateMode: UpdateMode = 'none';

/**
 * Set the snapshot update mode.
 * - 'all': overwrite all existing snapshots on mismatch
 * - 'new': only create new snapshots, fail on mismatch for existing ones
 * - 'none': fail on mismatch (default)
 */
export function setUpdateMode(mode: UpdateMode): void {
  updateMode = mode;
}

/**
 * Get the current snapshot update mode.
 */
export function getUpdateMode(): UpdateMode {
  return updateMode;
}

/**
 * Determine the effective update mode, considering env vars and the
 * programmatic setting.
 */
function resolveUpdateMode(): UpdateMode {
  if (process.env.UPDATE_SNAPSHOTS === '1') return 'all';
  return updateMode;
}

// ---------------------------------------------------------------------------
// Per-test auto-incrementing snapshot names (#131)
// ---------------------------------------------------------------------------

let currentTestName = 'default';
let snapshotCounter = 0;

/**
 * Set the current test name for auto-incrementing snapshot names.
 * Should be called at the start of each test.
 */
export function setCurrentTestName(name: string): void {
  currentTestName = name;
}

/**
 * Reset the snapshot counter. Should be called at the start of each test
 * so that auto-incrementing names restart from 1.
 */
export function resetSnapshotCounter(): void {
  snapshotCounter = 0;
}

/**
 * Get the next auto-generated snapshot name for the current test.
 * When a hint is provided, the key format is "test name: hint N".
 */
function nextSnapshotName(hint?: string): string {
  snapshotCounter++;
  if (hint) {
    return `${currentTestName}: ${hint} ${snapshotCounter}`;
  }
  return `${currentTestName} ${snapshotCounter}`;
}

/** Interface for asymmetric matchers used in property matching. */
interface AsymmetricMatcher {
  asymmetricMatch(actual: unknown): boolean;
}

function isAsymmetricMatcher(val: unknown): val is AsymmetricMatcher {
  return (
    val !== null &&
    typeof val === 'object' &&
    'asymmetricMatch' in val &&
    typeof (val as AsymmetricMatcher).asymmetricMatch === 'function'
  );
}

/**
 * Validate property matchers against actual values and return a copy of
 * the actual object with matched properties replaced by placeholder values
 * so the snapshot is stable across runs.
 */
function applyPropertyMatchers(
  actual: unknown,
  matchers: Record<string, unknown>,
): unknown {
  if (actual === null || typeof actual !== 'object') {
    throw new Error('Property matchers can only be used with object values');
  }
  const obj = actual as Record<string, unknown>;
  const result: Record<string, unknown> = { ...obj };

  for (const key of Object.keys(matchers)) {
    const matcher = matchers[key];
    if (isAsymmetricMatcher(matcher)) {
      if (!matcher.asymmetricMatch(obj[key])) {
        throw new Error(
          `Property matcher failed for key "${key}": value ${JSON.stringify(obj[key])} did not match`,
        );
      }
      // Replace matched property with a type-descriptive placeholder
      result[key] = '[Any]';
    } else if (
      matcher !== null &&
      typeof matcher === 'object' &&
      !Array.isArray(matcher)
    ) {
      // Nested property matchers
      result[key] = applyPropertyMatchers(
        obj[key],
        matcher as Record<string, unknown>,
      );
    }
  }
  return result;
}

/**
 * Match a value against a stored snapshot.
 * Creates the snapshot on first run, compares on subsequent runs.
 * When no snapshotName is provided, uses auto-incrementing test name.
 *
 * @param actual - The value to snapshot
 * @param snapshotName - Optional explicit snapshot key name
 * @param hint - Optional hint that appears in the auto-generated key
 * @param propertyMatchers - Optional asymmetric matchers to apply before snapshotting
 */
export function matchSnapshot(
  actual: unknown,
  snapshotName?: string,
  hint?: string,
  propertyMatchers?: Record<string, unknown>,
): void {
  const name = snapshotName ?? nextSnapshotName(hint);
  const snapshotFile = getSnapshotFilePath();
  const snapshots = readSnapshotFile(snapshotFile);

  let valueToSerialize = actual;
  if (propertyMatchers) {
    valueToSerialize = applyPropertyMatchers(actual, propertyMatchers);
  }

  const serialized = serialize(valueToSerialize);
  const mode = resolveUpdateMode();

  const exists = snapshots.has(name);

  if (!exists) {
    // Create new snapshot regardless of mode
    snapshots.set(name, serialized);
    writeSnapshotFile(snapshotFile, snapshots);
    return;
  }

  // Snapshot exists — compare
  const stored = snapshots.get(name)!;
  if (serialized === stored) {
    return; // match
  }

  // Mismatch
  if (mode === 'all') {
    // Overwrite
    snapshots.set(name, serialized);
    writeSnapshotFile(snapshotFile, snapshots);
    return;
  }

  // mode === 'new' or 'none': fail on mismatch for existing snapshots
  const diff = generateDiff(stored, serialized);
  throw new Error(`Snapshot mismatch for "${name}":\n\n${diff}`);
}

/**
 * Map of pending inline snapshots: call site -> serialized value.
 * Available for tooling to read and apply updates.
 */
export const pendingInlineSnapshots = new Map<string, string>();

/**
 * Match a value against an inline snapshot string.
 * If no inline snapshot provided and update mode is set, stores for retrieval.
 */
export function matchInlineSnapshot(
  actual: unknown,
  inlineSnapshot?: string,
): void {
  const serialized = serialize(actual);

  if (inlineSnapshot === undefined) {
    const mode = resolveUpdateMode();
    if (mode === 'all' || mode === 'new') {
      // Store the inline snapshot value for retrieval
      const err = new Error();
      const stack = err.stack ?? '';
      const stackLines = stack.split('\n');
      let callSite = '';
      for (const line of stackLines) {
        const match = /(?:at\s+.*?\s+\(|at\s+)(\/[^:)]+\.(?:ts|js)):(\d+)/.exec(
          line,
        );
        if (match) {
          const filePath = match[1]!;
          if (
            filePath.includes('snapshots.ts') ||
            filePath.includes('snapshots.js')
          )
            continue;
          if (filePath.includes('assertions/index')) continue;
          callSite = `${filePath}:${match[2]!}`;
          break;
        }
      }
      pendingInlineSnapshots.set(callSite, serialized);
      // eslint-disable-next-line no-console
      console.log(
        `[Snapshot] Inline snapshot stored for update at ${callSite}. Value:\n${serialized}`,
      );
      return;
    }
    // Default: just log
    // eslint-disable-next-line no-console
    console.log(
      `[Snapshot] Inline snapshot needs to be added manually. Serialized value:\n${serialized}`,
    );
    return;
  }

  if (serialized !== inlineSnapshot) {
    if (resolveUpdateMode() === 'all') {
      // In update-all mode, just pass (the caller would update the source)
      // eslint-disable-next-line no-console
      console.log(
        `[Snapshot] Inline snapshot mismatch (update mode). New value:\n${serialized}`,
      );
      return;
    }
    throw new Error(
      `Inline snapshot mismatch:\n` +
        `Expected:\n${inlineSnapshot}\n` +
        `Received:\n${serialized}`,
    );
  }
}

// ---------------------------------------------------------------------------
// File snapshot (#126)
// ---------------------------------------------------------------------------

/**
 * Match a value against an external file snapshot.
 * - If the file exists, compare serialized actual against file content.
 * - If the file doesn't exist and update mode is active, create it.
 * - If mismatch and update mode is 'all', overwrite the file.
 */
export function matchFileSnapshot(actual: unknown, filePath: string): void {
  const serialized = serialize(actual);
  const mode = resolveUpdateMode();
  const fileExists = fs.existsSync(filePath);

  if (!fileExists) {
    if (mode === 'all' || mode === 'new') {
      // Create the file
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, serialized, 'utf-8');
      return;
    }
    throw new Error(
      `File snapshot not found: ${filePath}\n` +
        `Run with update mode to create it.`,
    );
  }

  const stored = fs.readFileSync(filePath, 'utf-8');
  if (serialized === stored) {
    return; // match
  }

  // Mismatch
  if (mode === 'all') {
    fs.writeFileSync(filePath, serialized, 'utf-8');
    return;
  }

  throw new Error(
    `File snapshot mismatch for "${filePath}":\n` +
      `Expected:\n${stored}\n` +
      `Received:\n${serialized}`,
  );
}
