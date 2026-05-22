export type {
  CoverageMap,
  CoverageSummary,
  CoverageWatermarks,
  FileCoverage,
  CoverageMetric,
} from './types.js';

export { TextReporter } from './text.js';
export { JsonReporter, JsonSummaryReporter } from './json.js';
export { LcovReporter } from './lcov.js';
export { CoberturaReporter } from './cobertura.js';
export { CloverReporter } from './clover.js';
export { TextSummaryReporter } from './text-summary.js';
export { LcovOnlyReporter } from './lcovonly.js';
export { TeamcityReporter } from './teamcity.js';
export { HtmlReporter } from './html.js';

import type {
  CoverageMap,
  CoverageSummary,
  CoverageWatermarks,
} from './types.js';
import { TextReporter } from './text.js';
import { JsonReporter, JsonSummaryReporter } from './json.js';
import { LcovReporter } from './lcov.js';
import { CoberturaReporter } from './cobertura.js';
import { CloverReporter } from './clover.js';
import { TextSummaryReporter } from './text-summary.js';
import { LcovOnlyReporter } from './lcovonly.js';
import { TeamcityReporter } from './teamcity.js';
import { HtmlReporter } from './html.js';

export interface CoverageReporter {
  onStart?(): void | Promise<void>;
  onFileProcessed?(filePath: string, summary: CoverageSummary): void;
  onEnd(
    coverageMap: CoverageMap,
    globalSummary: CoverageSummary,
  ): void | Promise<void>;
}

export interface ReporterOptions {
  reportsDirectory: string;
  skipFull?: boolean;
  watermarks?: CoverageWatermarks;
}

export type ReporterFactory = (options: ReporterOptions) => CoverageReporter;

export function createTextReporter(options: ReporterOptions): CoverageReporter {
  const reporter = new TextReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createJsonReporter(options: ReporterOptions): CoverageReporter {
  const reporter = new JsonReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createLcovReporter(options: ReporterOptions): CoverageReporter {
  const reporter = new LcovReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createCoberturaReporter(
  options: ReporterOptions,
): CoverageReporter {
  const reporter = new CoberturaReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createCloverReporter(
  options: ReporterOptions,
): CoverageReporter {
  const reporter = new CloverReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createJsonSummaryReporter(
  options: ReporterOptions,
): CoverageReporter {
  const reporter = new JsonSummaryReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createTextSummaryReporter(
  options: ReporterOptions,
): CoverageReporter {
  const reporter = new TextSummaryReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createLcovOnlyReporter(
  options: ReporterOptions,
): CoverageReporter {
  const reporter = new LcovOnlyReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createTeamcityReporter(
  options: ReporterOptions,
): CoverageReporter {
  const reporter = new TeamcityReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createHtmlReporter(options: ReporterOptions): CoverageReporter {
  const reporter = new HtmlReporter(options);
  return {
    onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
      reporter.onEnd(coverageMap, globalSummary);
    },
  };
}

export function createNoneReporter(
  _options: ReporterOptions,
): CoverageReporter {
  return {
    onEnd(_coverageMap: CoverageMap, _globalSummary: CoverageSummary): void {
      // no-op
    },
  };
}

const REPORTER_FACTORIES: Record<string, ReporterFactory> = {
  text: createTextReporter,
  json: createJsonReporter,
  'json-summary': createJsonSummaryReporter,
  lcov: createLcovReporter,
  cobertura: createCoberturaReporter,
  clover: createCloverReporter,
  'text-summary': createTextSummaryReporter,
  lcovonly: createLcovOnlyReporter,
  teamcity: createTeamcityReporter,
  html: createHtmlReporter,
  none: createNoneReporter,
};

export function getReporterFactory(name: string): ReporterFactory {
  const factory = REPORTER_FACTORIES[name];
  if (!factory) {
    throw new Error(
      `Unknown reporter: "${name}". Available reporters: ${Object.keys(REPORTER_FACTORIES).join(', ')}`,
    );
  }
  return factory;
}
