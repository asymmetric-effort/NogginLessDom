export interface GlobThresholds {
  lines?: number;
  functions?: number;
  branches?: number;
  statements?: number;
}

export interface CoverageThresholds {
  lines?: number;
  functions?: number;
  branches?: number;
  statements?: number;
  perFile?: boolean;
  /** If true, set all metric thresholds to 100%. */
  100?: boolean;
  /** If true, store flag for auto-updating thresholds (actual update logic deferred). */
  autoUpdate?: boolean;
  /** Glob-pattern-keyed thresholds for specific file groups. */
  glob?: Record<string, GlobThresholds>;
}

export interface CoverageWatermarks {
  lines?: [number, number];
  functions?: [number, number];
  branches?: [number, number];
  statements?: [number, number];
}

export interface CoverageConfig {
  enabled?: boolean;
  provider?: 'v8' | 'istanbul';
  include?: string[];
  exclude?: string[];
  reportsDirectory?: string;
  reporter?: string[];
  clean?: boolean;
  thresholds?: CoverageThresholds;
  watermarks?: CoverageWatermarks;
  skipFull?: boolean;
  all?: boolean;
  cleanOnRerun?: boolean;
  allowExternal?: boolean;
  extension?: string[];
  reportOnFailure?: boolean;
  processingConcurrency?: number;
  /** When true, use `git diff --name-only HEAD` to get changed files. When a string (branch name), use `git diff --name-only <branch>...HEAD`. */
  changed?: boolean | string;
  /** Path to a custom coverage provider module. The module must export a `createProvider()` function. */
  customProviderModule?: string;
  /** Class method names to exclude from function coverage. */
  ignoreClassMethods?: string[];
}

export interface ResolvedCoverageConfig {
  enabled: boolean;
  provider: 'v8' | 'istanbul';
  include: string[];
  exclude: string[];
  reportsDirectory: string;
  reporter: string[];
  clean: boolean;
  skipFull: boolean;
  all: boolean;
  watermarks: Required<CoverageWatermarks>;
  thresholds?: CoverageThresholds;
  cleanOnRerun: boolean;
  allowExternal: boolean;
  extension: string[];
  reportOnFailure: boolean;
  processingConcurrency: number;
  changed?: boolean | string;
  customProviderModule?: string;
  ignoreClassMethods: string[];
}

export function getDefaultConfig(): CoverageConfig {
  return {
    enabled: false,
    provider: 'v8',
    include: ['**/*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}'],
    exclude: [
      '**/node_modules/**',
      '**/test/**',
      '**/tests/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/coverage/**',
      '**/build/**',
      '**/dist/**',
    ],
    reportsDirectory: './coverage',
    reporter: ['text', 'json'],
    clean: true,
    skipFull: false,
    all: false,
    watermarks: {
      lines: [50, 80],
      functions: [50, 80],
      branches: [50, 80],
      statements: [50, 80],
    },
    thresholds: undefined,
    cleanOnRerun: true,
    allowExternal: false,
    extension: ['.ts', '.js', '.tsx', '.jsx'],
    reportOnFailure: false,
    processingConcurrency: 1,
    ignoreClassMethods: [],
  };
}

const VALID_PROVIDERS = ['v8', 'istanbul'];

function validateThreshold(name: string, value: number | undefined): void {
  if (value === undefined) return;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid ${name} threshold: must be a finite number`);
  }
  if (value < 0 || value > 100) {
    throw new Error(
      `Invalid ${name} threshold: ${value}. Must be between 0 and 100`,
    );
  }
  if (value === 0) {
    console.warn(
      `Warning: ${name} threshold is set to 0, which effectively disables the check`,
    );
  }
}

function validateWatermark(
  name: string,
  value: [number, number] | undefined,
): void {
  if (value === undefined) return;
  const [low, high] = value;
  if (low < 0 || low > 100 || high < 0 || high > 100) {
    throw new Error(
      `Invalid ${name} watermark: values must be between 0 and 100`,
    );
  }
  if (low > high) {
    throw new Error(
      `Invalid ${name} watermark: low (${low}) must not exceed high (${high})`,
    );
  }
}

export function validateConfig(
  config: ResolvedCoverageConfig,
  validReporterNames?: string[],
): void {
  // Validate provider
  if (!VALID_PROVIDERS.includes(config.provider)) {
    throw new Error(
      `Invalid provider: "${config.provider}". Must be one of: ${VALID_PROVIDERS.join(', ')}`,
    );
  }

  // Validate reporters
  if (validReporterNames) {
    for (const name of config.reporter) {
      if (!validReporterNames.includes(name)) {
        throw new Error(
          `Unknown reporter: "${name}". Available reporters: ${validReporterNames.join(', ')}`,
        );
      }
    }
  }

  // Validate thresholds
  if (config.thresholds) {
    validateThreshold('lines', config.thresholds.lines);
    validateThreshold('functions', config.thresholds.functions);
    validateThreshold('branches', config.thresholds.branches);
    validateThreshold('statements', config.thresholds.statements);

    // Validate glob thresholds
    if (config.thresholds.glob) {
      for (const [pattern, globThresh] of Object.entries(
        config.thresholds.glob,
      )) {
        validateThreshold(`glob[${pattern}].lines`, globThresh.lines);
        validateThreshold(`glob[${pattern}].functions`, globThresh.functions);
        validateThreshold(`glob[${pattern}].branches`, globThresh.branches);
        validateThreshold(
          `glob[${pattern}].statements`,
          globThresh.statements,
        );
      }
    }
  }

  // Validate watermarks
  validateWatermark('lines', config.watermarks.lines);
  validateWatermark('functions', config.watermarks.functions);
  validateWatermark('branches', config.watermarks.branches);
  validateWatermark('statements', config.watermarks.statements);

  // Validate processingConcurrency
  if (
    !Number.isInteger(config.processingConcurrency) ||
    config.processingConcurrency <= 0
  ) {
    throw new Error(
      `Invalid processingConcurrency: ${config.processingConcurrency}. Must be a positive integer`,
    );
  }

  // Validate extensions
  for (const ext of config.extension) {
    if (!ext.startsWith('.')) {
      throw new Error(
        `Invalid extension: "${ext}". Extensions must start with "."`,
      );
    }
  }
}

export function mergeConfig(
  userConfig: Partial<CoverageConfig>,
  validReporterNames?: string[],
): ResolvedCoverageConfig {
  const defaults = getDefaultConfig();
  const resolved: ResolvedCoverageConfig = {
    enabled: userConfig.enabled ?? defaults.enabled ?? false,
    provider: userConfig.provider ?? defaults.provider ?? 'v8',
    include: userConfig.include ?? defaults.include ?? [],
    exclude: userConfig.exclude ?? defaults.exclude ?? [],
    reportsDirectory:
      userConfig.reportsDirectory ?? defaults.reportsDirectory ?? './coverage',
    reporter: userConfig.reporter ?? defaults.reporter ?? ['text'],
    clean: userConfig.clean ?? defaults.clean ?? true,
    skipFull: userConfig.skipFull ?? defaults.skipFull ?? false,
    all: userConfig.all ?? defaults.all ?? false,
    watermarks: {
      lines:
        userConfig.watermarks?.lines ??
        defaults.watermarks?.lines ??
        ([50, 80] as [number, number]),
      functions:
        userConfig.watermarks?.functions ??
        defaults.watermarks?.functions ??
        ([50, 80] as [number, number]),
      branches:
        userConfig.watermarks?.branches ??
        defaults.watermarks?.branches ??
        ([50, 80] as [number, number]),
      statements:
        userConfig.watermarks?.statements ??
        defaults.watermarks?.statements ??
        ([50, 80] as [number, number]),
    },
    thresholds: userConfig.thresholds ?? defaults.thresholds,
    cleanOnRerun: userConfig.cleanOnRerun ?? defaults.cleanOnRerun ?? true,
    allowExternal: userConfig.allowExternal ?? defaults.allowExternal ?? false,
    extension: userConfig.extension ??
      defaults.extension ?? ['.ts', '.js', '.tsx', '.jsx'],
    reportOnFailure:
      userConfig.reportOnFailure ?? defaults.reportOnFailure ?? false,
    processingConcurrency:
      userConfig.processingConcurrency ?? defaults.processingConcurrency ?? 1,
    changed: userConfig.changed,
    customProviderModule: userConfig.customProviderModule,
    ignoreClassMethods:
      userConfig.ignoreClassMethods ?? defaults.ignoreClassMethods ?? [],
  };
  validateConfig(resolved, validReporterNames);
  return resolved;
}
