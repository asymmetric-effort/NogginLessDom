/**
 * Bun plugin that hoists mock calls in test files.
 *
 * Usage:
 *   import { registerHoistPlugin } from '@asymmetric-effort/nogginlessdom';
 *   registerHoistPlugin();
 *
 * Or in bunfig.toml:
 *   preload = ["@asymmetric-effort/nogginlessdom/hoist"]
 *
 * @module hoist/bun-plugin
 */

import { hoistMocks } from './index.js';

/**
 * Register a Bun loader plugin that transparently hoists mock calls
 * above imports in test files.
 *
 * @param options - Optional configuration.
 * @param options.filter - Regex to match test file paths.
 *   Defaults to `/\.(test|spec)\.(ts|tsx|js|jsx)$/`.
 */
export function registerHoistPlugin(options?: { filter?: RegExp }): void {
  const filter = options?.filter ?? /\.(test|spec)\.(ts|tsx|js|jsx)$/;

  // Dynamic import of bun's plugin API to avoid tsc errors
  // when building for non-Bun environments.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { plugin } = require('bun') as {
    plugin: (opts: {
      name: string;
      setup: (build: {
        onLoad: (
          opts: { filter: RegExp },
          cb: (args: { path: string }) => Promise<{
            contents: string;
            loader: string;
          }>,
        ) => void;
      }) => void;
    }) => void;
  };

  plugin({
    name: 'nogginlessdom-hoist',
    setup(build) {
      build.onLoad({ filter }, async (args) => {
        const fs = await import('node:fs');
        const source = fs.readFileSync(args.path, 'utf-8');
        const result = hoistMocks(source, args.path);
        return {
          contents: result.code,
          loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts',
        };
      });
    },
  });
}
