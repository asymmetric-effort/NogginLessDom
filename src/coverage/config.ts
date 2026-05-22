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

export function mergeConfig(
  userConfig: Partial<CoverageConfig>,
): ResolvedCoverageConfig {
  const defaults = getDefaultConfig();
  return {
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
}
