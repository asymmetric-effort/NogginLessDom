export interface CoverageThresholds {
  lines?: number;
  functions?: number;
  branches?: number;
  statements?: number;
  perFile?: boolean;
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
}

export interface ResolvedCoverageConfig {
  enabled: boolean;
  provider: 'v8';
  include: string[];
  exclude: string[];
  reportsDirectory: string;
  reporter: string[];
  clean: boolean;
  skipFull: boolean;
  all: boolean;
  watermarks: Required<CoverageWatermarks>;
  thresholds?: CoverageThresholds;
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
  };
}

export function mergeConfig(
  userConfig: Partial<CoverageConfig>,
): ResolvedCoverageConfig {
  const defaults = getDefaultConfig();
  return {
    enabled: userConfig.enabled ?? defaults.enabled ?? false,
    provider: 'v8',
    include: userConfig.include ?? defaults.include ?? [],
    exclude: userConfig.exclude ?? defaults.exclude ?? [],
    reportsDirectory: userConfig.reportsDirectory ?? defaults.reportsDirectory ?? './coverage',
    reporter: userConfig.reporter ?? defaults.reporter ?? ['text'],
    clean: userConfig.clean ?? defaults.clean ?? true,
    skipFull: userConfig.skipFull ?? defaults.skipFull ?? false,
    all: userConfig.all ?? defaults.all ?? false,
    watermarks: {
      lines: userConfig.watermarks?.lines ?? defaults.watermarks?.lines ?? [50, 80] as [number, number],
      functions: userConfig.watermarks?.functions ?? defaults.watermarks?.functions ?? [50, 80] as [number, number],
      branches: userConfig.watermarks?.branches ?? defaults.watermarks?.branches ?? [50, 80] as [number, number],
      statements: userConfig.watermarks?.statements ?? defaults.watermarks?.statements ?? [50, 80] as [number, number],
    },
    thresholds: userConfig.thresholds ?? defaults.thresholds,
  };
}
