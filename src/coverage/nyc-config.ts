/**
 * Load NYC (Istanbul) configuration files and map them to CoverageConfig.
 */

import type { CoverageConfig } from './config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface NycRawConfig {
  include?: string[];
  exclude?: string[];
  reporter?: string[];
  'report-dir'?: string;
  'reports-dir'?: string;
  all?: boolean;
  'skip-full'?: boolean;
  'check-coverage'?: boolean;
  branches?: number;
  lines?: number;
  functions?: number;
  statements?: number;
  extension?: string[];
  'report-on-failure'?: boolean;
  clean?: boolean;
}

/**
 * Parse a simple YAML file with key-value pairs and simple arrays.
 * Handles only flat structures: `key: value` and `key:\n  - item` forms.
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let currentKey: string | undefined;
  let currentArray: string[] | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }

    // Array item (indented with - )
    const arrayMatch = /^\s+-\s+(.*)$/.exec(line);
    if (arrayMatch && currentKey !== undefined) {
      if (currentArray === undefined) {
        currentArray = [];
      }
      currentArray.push(arrayMatch[1]!.trim());
      result[currentKey] = currentArray;
      continue;
    }

    // Key-value pair
    const kvMatch = /^([a-zA-Z_-]+)\s*:\s*(.*)$/.exec(line);
    if (kvMatch) {
      // Save previous array if any
      currentKey = kvMatch[1]!;
      const value = kvMatch[2]!.trim();

      if (value === '' || value === '[]') {
        // Start of array or empty value
        currentArray = value === '[]' ? [] : undefined;
        if (value === '[]') {
          result[currentKey] = currentArray;
        }
      } else if (value === 'true') {
        result[currentKey] = true;
        currentArray = undefined;
      } else if (value === 'false') {
        result[currentKey] = false;
        currentArray = undefined;
      } else if (/^-?\d+(\.\d+)?$/.test(value)) {
        result[currentKey] = parseFloat(value);
        currentArray = undefined;
      } else {
        // Remove quotes if present
        const unquoted = value.replace(/^['"](.*)['"]$/, '$1');
        result[currentKey] = unquoted;
        currentArray = undefined;
      }
    }
  }

  return result;
}

/**
 * Map raw NYC configuration fields to CoverageConfig fields.
 */
function mapNycToCoverageConfig(raw: NycRawConfig): Partial<CoverageConfig> {
  const config: Partial<CoverageConfig> = {};

  if (raw.include !== undefined) config.include = raw.include;
  if (raw.exclude !== undefined) config.exclude = raw.exclude;
  if (raw.reporter !== undefined) config.reporter = raw.reporter;
  if (raw['report-dir'] !== undefined)
    config.reportsDirectory = raw['report-dir'];
  if (raw['reports-dir'] !== undefined)
    config.reportsDirectory = raw['reports-dir'];
  if (raw.all !== undefined) config.all = raw.all;
  if (raw['skip-full'] !== undefined) config.skipFull = raw['skip-full'];
  if (raw.extension !== undefined) config.extension = raw.extension;
  if (raw['report-on-failure'] !== undefined)
    config.reportOnFailure = raw['report-on-failure'];
  if (raw.clean !== undefined) config.clean = raw.clean;

  return config;
}

/**
 * Try to read and parse a JSON file. Returns undefined if file does not exist or is invalid.
 */
function tryReadJson(filePath: string): NycRawConfig | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as NycRawConfig;
  } catch {
    return undefined;
  }
}

/**
 * Try to read and parse a YAML file. Returns undefined if file does not exist or is invalid.
 */
function tryReadYaml(filePath: string): NycRawConfig | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseSimpleYaml(content) as NycRawConfig;
  } catch {
    return undefined;
  }
}

/**
 * Load NYC configuration from the project root.
 *
 * Searches for config in the following order (first found wins):
 * 1. `.nycrc`
 * 2. `.nycrc.json`
 * 3. `.nycrc.yml`
 * 4. `.nycrc.yaml`
 * 5. `nyc` key in `package.json`
 *
 * Returns an empty object if no configuration is found.
 */
export function loadNycConfig(projectRoot: string): Partial<CoverageConfig> {
  // Try .nycrc (JSON format)
  const nycrc = tryReadJson(path.join(projectRoot, '.nycrc'));
  if (nycrc !== undefined) {
    return mapNycToCoverageConfig(nycrc);
  }

  // Try .nycrc.json
  const nycrcJson = tryReadJson(path.join(projectRoot, '.nycrc.json'));
  if (nycrcJson !== undefined) {
    return mapNycToCoverageConfig(nycrcJson);
  }

  // Try .nycrc.yml
  const nycrcYml = tryReadYaml(path.join(projectRoot, '.nycrc.yml'));
  if (nycrcYml !== undefined) {
    return mapNycToCoverageConfig(nycrcYml);
  }

  // Try .nycrc.yaml
  const nycrcYaml = tryReadYaml(path.join(projectRoot, '.nycrc.yaml'));
  if (nycrcYaml !== undefined) {
    return mapNycToCoverageConfig(nycrcYaml);
  }

  // Try nyc key in package.json
  try {
    const pkgContent = fs.readFileSync(
      path.join(projectRoot, 'package.json'),
      'utf-8',
    );
    const pkg = JSON.parse(pkgContent) as Record<string, unknown>;
    if (
      pkg.nyc !== undefined &&
      typeof pkg.nyc === 'object' &&
      pkg.nyc !== null
    ) {
      return mapNycToCoverageConfig(pkg.nyc as NycRawConfig);
    }
  } catch {
    // No package.json or invalid
  }

  return {};
}
