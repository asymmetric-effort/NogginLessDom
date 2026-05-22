/**
 * Minimal source map consumer for remapping transpiled coverage positions
 * back to original source locations.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// VLQ Decoding
// ---------------------------------------------------------------------------

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const charToInt: Record<string, number> = {};
for (let i = 0; i < BASE64_CHARS.length; i++) {
  charToInt[BASE64_CHARS[i]!] = i;
}

const VLQ_BASE_SHIFT = 5;
const VLQ_BASE = 1 << VLQ_BASE_SHIFT; // 32
const VLQ_CONTINUATION_BIT = VLQ_BASE; // 32
const VLQ_BASE_MASK = VLQ_BASE - 1; // 31

/**
 * Decode a VLQ-encoded string into an array of integers.
 */
export function decodeVLQ(encoded: string): number[] {
  const result: number[] = [];
  let shift = 0;
  let value = 0;

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i]!;
    const digit = charToInt[char];
    if (digit === undefined) {
      throw new Error(`Invalid base64 VLQ character: ${char}`);
    }

    const hasContinuation = (digit & VLQ_CONTINUATION_BIT) !== 0;
    value += (digit & VLQ_BASE_MASK) << shift;
    shift += VLQ_BASE_SHIFT;

    if (!hasContinuation) {
      // The lowest bit is the sign bit
      const isNegative = (value & 1) !== 0;
      const absValue = value >> 1;
      result.push(isNegative ? -absValue : absValue);
      value = 0;
      shift = 0;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Source Map Types
// ---------------------------------------------------------------------------

export interface RawSourceMap {
  version: number;
  sources: string[];
  mappings: string;
  names: string[];
  sourcesContent?: string[];
}

interface MappingSegment {
  generatedColumn: number;
  sourceIndex: number;
  originalLine: number;
  originalColumn: number;
  nameIndex: number | null;
}

interface OriginalPosition {
  source: string | null;
  line: number | null;
  column: number | null;
  name: string | null;
}

// ---------------------------------------------------------------------------
// SourceMapConsumer
// ---------------------------------------------------------------------------

/**
 * Minimal source map consumer that parses VLQ mappings and resolves
 * generated positions back to original source positions.
 */
export class SourceMapConsumer {
  private readonly sources: string[];
  private readonly names: string[];
  /** Parsed mappings indexed by generated line (1-based). */
  private readonly lineMap: Map<number, MappingSegment[]>;

  constructor(sourceMap: RawSourceMap) {
    this.sources = sourceMap.sources;
    this.names = sourceMap.names;
    this.lineMap = this.parseMappings(sourceMap.mappings);
  }

  /**
   * Find the original position for a generated position.
   * Lines and columns are 1-based for lines, 0-based for columns.
   */
  originalPositionFor(generated: {
    line: number;
    column: number;
  }): OriginalPosition {
    const segments = this.lineMap.get(generated.line);
    if (!segments || segments.length === 0) {
      return { source: null, line: null, column: null, name: null };
    }

    // Find the segment with the greatest generatedColumn <= requested column
    let best: MappingSegment | undefined;
    for (const seg of segments) {
      if (seg.generatedColumn <= generated.column) {
        best = seg;
      } else {
        break; // segments are sorted by generatedColumn
      }
    }

    if (!best) {
      return { source: null, line: null, column: null, name: null };
    }

    const source = this.sources[best.sourceIndex] ?? null;
    // Convert from 0-based internal representation to 1-based lines
    const line = best.originalLine + 1;
    const column = best.originalColumn;
    const name =
      best.nameIndex !== null ? (this.names[best.nameIndex] ?? null) : null;

    return { source, line, column, name };
  }

  /**
   * Parse the VLQ-encoded mappings string into a line-indexed map.
   */
  private parseMappings(mappings: string): Map<number, MappingSegment[]> {
    const result = new Map<number, MappingSegment[]>();
    const lines = mappings.split(';');

    // Running state (mappings are relative/delta-encoded)
    let sourceIndex = 0;
    let originalLine = 0;
    let originalColumn = 0;
    let nameIndex = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineMapping = lines[lineIdx]!;
      if (lineMapping.length === 0) {
        continue;
      }

      const generatedLine = lineIdx + 1; // 1-based
      const segments: MappingSegment[] = [];
      const rawSegments = lineMapping.split(',');
      let generatedColumn = 0; // reset per line

      for (const rawSeg of rawSegments) {
        if (rawSeg.length === 0) continue;

        const fields = decodeVLQ(rawSeg);
        if (fields.length < 4) {
          // Segments with fewer than 4 fields just have a generated column
          // (no source mapping). Skip them for our purposes.
          generatedColumn += fields[0] ?? 0;
          continue;
        }

        generatedColumn += fields[0] ?? 0;
        sourceIndex += fields[1] ?? 0;
        originalLine += fields[2] ?? 0;
        originalColumn += fields[3] ?? 0;

        let segNameIndex: number | null = null;
        if (fields.length >= 5) {
          nameIndex += fields[4] ?? 0;
          segNameIndex = nameIndex;
        }

        segments.push({
          generatedColumn,
          sourceIndex,
          originalLine,
          originalColumn,
          nameIndex: segNameIndex,
        });
      }

      if (segments.length > 0) {
        result.set(generatedLine, segments);
      }
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// Source Map Loading
// ---------------------------------------------------------------------------

const SOURCE_MAPPING_URL_RE = /\/\/[#@]\s*sourceMappingURL\s*=\s*(.+?)\s*$/m;

/**
 * Load a source map for a given file path.
 * Checks for inline data URIs and external .map file references.
 * Returns null if no source map is found or cannot be loaded.
 */
export function loadSourceMap(filePath: string): SourceMapConsumer | null {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  const match = SOURCE_MAPPING_URL_RE.exec(content);
  if (!match) {
    return null;
  }

  const url = match[1]!.trim();

  // Inline data URI
  if (url.startsWith('data:')) {
    return loadInlineSourceMap(url);
  }

  // External file reference
  return loadFileSourceMap(filePath, url);
}

function loadInlineSourceMap(dataUrl: string): SourceMapConsumer | null {
  const base64Prefix = 'data:application/json;base64,';
  if (!dataUrl.startsWith(base64Prefix)) {
    return null;
  }

  const base64Data = dataUrl.slice(base64Prefix.length);
  try {
    const json = Buffer.from(base64Data, 'base64').toString('utf-8');
    const raw = JSON.parse(json) as RawSourceMap;
    return new SourceMapConsumer(raw);
  } catch {
    return null;
  }
}

function loadFileSourceMap(
  sourceFilePath: string,
  mapUrl: string,
): SourceMapConsumer | null {
  const dir = dirname(sourceFilePath);
  const mapPath = resolve(dir, mapUrl);

  try {
    const json = readFileSync(mapPath, 'utf-8');
    const raw = JSON.parse(json) as RawSourceMap;
    return new SourceMapConsumer(raw);
  } catch {
    return null;
  }
}
