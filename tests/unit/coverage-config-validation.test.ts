import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeConfig,
  validateConfig,
  type ResolvedCoverageConfig,
} from '../../src/coverage/config.js';
import { VALID_REPORTER_NAMES } from '../../src/coverage/reporters/index.js';

function makeValidConfig(
  overrides?: Partial<ResolvedCoverageConfig>,
): ResolvedCoverageConfig {
  return {
    enabled: false,
    provider: 'v8',
    include: ['**/*.ts'],
    exclude: ['**/node_modules/**'],
    reportsDirectory: './coverage',
    reporter: ['text'],
    clean: true,
    skipFull: false,
    all: false,
    watermarks: {
      lines: [50, 80] as [number, number],
      functions: [50, 80] as [number, number],
      branches: [50, 80] as [number, number],
      statements: [50, 80] as [number, number],
    },
    thresholds: undefined,
    cleanOnRerun: true,
    allowExternal: false,
    extension: ['.ts', '.js'],
    reportOnFailure: false,
    processingConcurrency: 1,
    ignoreClassMethods: [],
    ...overrides,
  };
}

describe('validateConfig', () => {
  describe('valid configurations', () => {
    it('should accept a valid default config', () => {
      assert.doesNotThrow(() => validateConfig(makeValidConfig()));
    });

    it('should accept v8 provider', () => {
      assert.doesNotThrow(
        () => validateConfig(makeValidConfig({ provider: 'v8' })),
      );
    });

    it('should accept istanbul provider', () => {
      assert.doesNotThrow(
        () => validateConfig(makeValidConfig({ provider: 'istanbul' })),
      );
    });

    it('should accept all valid reporter names', () => {
      for (const name of VALID_REPORTER_NAMES) {
        assert.doesNotThrow(
          () =>
            validateConfig(
              makeValidConfig({ reporter: [name] }),
              VALID_REPORTER_NAMES,
            ),
        );
      }
    });

    it('should accept threshold boundary values 0 and 100', () => {
      assert.doesNotThrow(
        () =>
          validateConfig(
            makeValidConfig({
              thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
            }),
          ),
      );
    });

    it('should accept valid watermarks', () => {
      assert.doesNotThrow(
        () =>
          validateConfig(
            makeValidConfig({
              watermarks: {
                lines: [0, 100] as [number, number],
                functions: [25, 75] as [number, number],
                branches: [50, 50] as [number, number],
                statements: [10, 90] as [number, number],
              },
            }),
          ),
      );
    });

    it('should accept valid extensions', () => {
      assert.doesNotThrow(
        () =>
          validateConfig(
            makeValidConfig({
              extension: ['.ts', '.tsx', '.js', '.jsx', '.mts'],
            }),
          ),
      );
    });
  });

  describe('provider validation', () => {
    it('should throw on invalid provider', () => {
      const config = makeValidConfig();
      (config as Record<string, unknown>).provider = 'invalid';
      assert.throws(
        () => validateConfig(config),
        /Invalid provider: "invalid"/,
      );
    });
  });

  describe('reporter validation', () => {
    it('should throw on unknown reporter name', () => {
      assert.throws(
        () =>
          validateConfig(
            makeValidConfig({ reporter: ['unknown-reporter'] }),
            VALID_REPORTER_NAMES,
          ),
        /Unknown reporter: "unknown-reporter"/,
      );
    });

    it('should skip reporter validation when validReporterNames is not provided', () => {
      assert.doesNotThrow(
        () =>
          validateConfig(
            makeValidConfig({ reporter: ['anything'] }),
          ),
      );
    });
  });

  describe('threshold validation', () => {
    it('should throw when threshold exceeds 100', () => {
      assert.throws(
        () =>
          validateConfig(
            makeValidConfig({ thresholds: { lines: 101 } }),
          ),
        /Invalid lines threshold: 101/,
      );
    });

    it('should throw when threshold is negative', () => {
      assert.throws(
        () =>
          validateConfig(
            makeValidConfig({ thresholds: { branches: -1 } }),
          ),
        /Invalid branches threshold: -1/,
      );
    });

    it('should throw for each threshold field individually', () => {
      for (const field of [
        'lines',
        'functions',
        'branches',
        'statements',
      ] as const) {
        assert.throws(
          () =>
            validateConfig(
              makeValidConfig({ thresholds: { [field]: 200 } }),
            ),
          /Must be between 0 and 100/,
        );
      }
    });

    it('should warn when threshold is 0', () => {
      const warnMock = mock.fn();
      const originalWarn = console.warn;
      console.warn = warnMock;
      try {
        validateConfig(
          makeValidConfig({ thresholds: { lines: 0 } }),
        );
        assert.equal(warnMock.mock.callCount(), 1);
        assert.ok(
          (warnMock.mock.calls[0].arguments[0] as string).includes(
            'lines threshold is set to 0',
          ),
        );
      } finally {
        console.warn = originalWarn;
      }
    });

    it('should validate glob thresholds', () => {
      assert.throws(
        () =>
          validateConfig(
            makeValidConfig({
              thresholds: {
                glob: { 'src/**/*.ts': { lines: 150 } },
              },
            }),
          ),
        /glob\[src\/\*\*\/\*\.ts\]\.lines/,
      );
    });
  });

  describe('watermark validation', () => {
    it('should throw when low exceeds high', () => {
      assert.throws(
        () =>
          validateConfig(
            makeValidConfig({
              watermarks: {
                lines: [80, 50] as [number, number],
                functions: [50, 80] as [number, number],
                branches: [50, 80] as [number, number],
                statements: [50, 80] as [number, number],
              },
            }),
          ),
        /low \(80\) must not exceed high \(50\)/,
      );
    });

    it('should throw when watermark values exceed 100', () => {
      assert.throws(
        () =>
          validateConfig(
            makeValidConfig({
              watermarks: {
                lines: [50, 80] as [number, number],
                functions: [50, 80] as [number, number],
                branches: [50, 110] as [number, number],
                statements: [50, 80] as [number, number],
              },
            }),
          ),
        /values must be between 0 and 100/,
      );
    });

    it('should throw when watermark values are negative', () => {
      assert.throws(
        () =>
          validateConfig(
            makeValidConfig({
              watermarks: {
                lines: [-5, 80] as [number, number],
                functions: [50, 80] as [number, number],
                branches: [50, 80] as [number, number],
                statements: [50, 80] as [number, number],
              },
            }),
          ),
        /values must be between 0 and 100/,
      );
    });
  });

  describe('processingConcurrency validation', () => {
    it('should throw when concurrency is 0', () => {
      assert.throws(
        () =>
          validateConfig(makeValidConfig({ processingConcurrency: 0 })),
        /Invalid processingConcurrency: 0/,
      );
    });

    it('should throw when concurrency is negative', () => {
      assert.throws(
        () =>
          validateConfig(makeValidConfig({ processingConcurrency: -1 })),
        /Must be a positive integer/,
      );
    });

    it('should throw when concurrency is not an integer', () => {
      assert.throws(
        () =>
          validateConfig(makeValidConfig({ processingConcurrency: 1.5 })),
        /Must be a positive integer/,
      );
    });
  });

  describe('extension validation', () => {
    it('should throw when extension does not start with dot', () => {
      assert.throws(
        () =>
          validateConfig(makeValidConfig({ extension: ['ts'] })),
        /Invalid extension: "ts"/,
      );
    });

    it('should throw for any invalid extension in the array', () => {
      assert.throws(
        () =>
          validateConfig(
            makeValidConfig({ extension: ['.ts', 'js', '.tsx'] }),
          ),
        /Invalid extension: "js"/,
      );
    });
  });

  describe('mergeConfig integration', () => {
    it('should validate after merging with defaults', () => {
      assert.doesNotThrow(() => mergeConfig({}));
    });

    it('should throw when user provides invalid thresholds', () => {
      assert.throws(
        () => mergeConfig({ thresholds: { lines: 200 } }),
        /Invalid lines threshold: 200/,
      );
    });

    it('should throw when user provides invalid provider', () => {
      assert.throws(
        () =>
          mergeConfig({
            provider: 'invalid' as 'v8',
          }),
        /Invalid provider/,
      );
    });

    it('should throw when user provides invalid extensions', () => {
      assert.throws(
        () => mergeConfig({ extension: ['ts'] }),
        /Invalid extension/,
      );
    });

    it('should validate reporters when validReporterNames is provided', () => {
      assert.throws(
        () =>
          mergeConfig(
            { reporter: ['bad-reporter'] },
            VALID_REPORTER_NAMES,
          ),
        /Unknown reporter: "bad-reporter"/,
      );
    });
  });
});
