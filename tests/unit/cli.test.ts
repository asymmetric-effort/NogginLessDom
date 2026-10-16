import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, showHelp, main, type ParsedArgs } from '../../src/cli.js';

describe('CLI', () => {
  describe('parseArgs', () => {
    it('should return defaults for empty args', () => {
      const result = parseArgs([]);
      assert.equal(result.help, false);
      assert.equal(result.watch, false);
      assert.equal(result.reporter, undefined);
      assert.equal(result.coverage, false);
      assert.equal(result.filter, undefined);
      assert.equal(result.bail, false);
      assert.equal(result.subcommand, undefined);
      assert.deepEqual(result.files, []);
      assert.equal(result.format, undefined);
      assert.equal(result.output, undefined);
    });

    it('should parse --help flag', () => {
      assert.equal(parseArgs(['--help']).help, true);
    });

    it('should parse -h flag', () => {
      assert.equal(parseArgs(['-h']).help, true);
    });

    it('should parse --watch flag', () => {
      assert.equal(parseArgs(['--watch']).watch, true);
    });

    it('should parse -w flag', () => {
      assert.equal(parseArgs(['-w']).watch, true);
    });

    it('should parse --coverage flag', () => {
      assert.equal(parseArgs(['--coverage']).coverage, true);
    });

    it('should parse --bail flag', () => {
      assert.equal(parseArgs(['--bail']).bail, true);
    });

    it('should parse -b flag', () => {
      assert.equal(parseArgs(['-b']).bail, true);
    });

    it('should parse --reporter with space-separated value', () => {
      assert.equal(parseArgs(['--reporter', 'verbose']).reporter, 'verbose');
    });

    it('should parse -r with value', () => {
      assert.equal(parseArgs(['-r', 'dot']).reporter, 'dot');
    });

    it('should parse --reporter=value syntax', () => {
      assert.equal(parseArgs(['--reporter=dot']).reporter, 'dot');
    });

    it('should parse --filter with space-separated value', () => {
      assert.equal(parseArgs(['--filter', 'auth']).filter, 'auth');
    });

    it('should parse -f with value', () => {
      assert.equal(parseArgs(['-f', 'auth']).filter, 'auth');
    });

    it('should parse --filter=value syntax', () => {
      assert.equal(parseArgs(['--filter=auth']).filter, 'auth');
    });

    it('should parse --format with value', () => {
      assert.equal(parseArgs(['--format', 'dot']).format, 'dot');
    });

    it('should parse --format=value syntax', () => {
      assert.equal(parseArgs(['--format=mermaid']).format, 'mermaid');
    });

    it('should parse --output with value', () => {
      assert.equal(parseArgs(['--output', 'graph.json']).output, 'graph.json');
    });

    it('should parse -o with value', () => {
      assert.equal(parseArgs(['-o', 'out.dot']).output, 'out.dot');
    });

    it('should parse --output=value syntax', () => {
      assert.equal(parseArgs(['--output=out.json']).output, 'out.json');
    });

    it('should detect cycles subcommand', () => {
      assert.equal(parseArgs(['cycles']).subcommand, 'cycles');
    });

    it('should detect depth subcommand', () => {
      assert.equal(parseArgs(['depth']).subcommand, 'depth');
    });

    it('should detect unused subcommand', () => {
      assert.equal(parseArgs(['unused']).subcommand, 'unused');
    });

    it('should detect graph subcommand', () => {
      assert.equal(parseArgs(['graph']).subcommand, 'graph');
    });

    it('should collect positional files after subcommand', () => {
      const result = parseArgs(['cycles', 'src/', 'lib/']);
      assert.equal(result.subcommand, 'cycles');
      assert.deepEqual(result.files, ['src/', 'lib/']);
    });

    it('should collect positional files without subcommand', () => {
      const result = parseArgs(['test1.ts', 'test2.ts']);
      assert.equal(result.subcommand, undefined);
      assert.deepEqual(result.files, ['test1.ts', 'test2.ts']);
    });

    it('should handle combined flags', () => {
      const result = parseArgs([
        '--watch',
        '--coverage',
        '--bail',
        '--reporter',
        'verbose',
        '--filter',
        'auth',
      ]);
      assert.equal(result.watch, true);
      assert.equal(result.coverage, true);
      assert.equal(result.bail, true);
      assert.equal(result.reporter, 'verbose');
      assert.equal(result.filter, 'auth');
    });

    it('should ignore unknown flags', () => {
      const result = parseArgs(['--unknown', '--verbose']);
      assert.equal(result.help, false);
      assert.deepEqual(result.files, []);
    });
  });

  describe('showHelp', () => {
    it('should write help text to stdout', () => {
      const writeMock = mock.fn();
      const originalWrite = process.stdout.write;
      process.stdout.write =
        writeMock as unknown as typeof process.stdout.write;
      try {
        showHelp();
        assert.equal(writeMock.mock.callCount(), 1);
        const output = writeMock.mock.calls[0].arguments[0] as string;
        assert.ok(output.includes('Usage:'));
        assert.ok(output.includes('--help'));
        assert.ok(output.includes('--watch'));
        assert.ok(output.includes('--reporter'));
        assert.ok(output.includes('--coverage'));
        assert.ok(output.includes('--filter'));
        assert.ok(output.includes('--bail'));
        assert.ok(output.includes('cycles'));
        assert.ok(output.includes('depth'));
        assert.ok(output.includes('unused'));
        assert.ok(output.includes('graph'));
      } finally {
        process.stdout.write = originalWrite;
      }
    });
  });

  describe('main', () => {
    let stdoutOutput: string[];
    let originalWrite: typeof process.stdout.write;

    beforeEach(() => {
      stdoutOutput = [];
      originalWrite = process.stdout.write;
      process.stdout.write = ((data: string) => {
        stdoutOutput.push(data);
        return true;
      }) as typeof process.stdout.write;
    });

    afterEach(() => {
      process.stdout.write = originalWrite;
    });

    function makeArgs(overrides?: Partial<ParsedArgs>): ParsedArgs {
      return {
        help: false,
        watch: false,
        reporter: undefined,
        coverage: false,
        filter: undefined,
        bail: false,
        subcommand: undefined,
        files: [],
        format: undefined,
        output: undefined,
        ...overrides,
      };
    }

    it('should show help and return when help is true', async () => {
      await main(makeArgs({ help: true }));
      assert.ok(stdoutOutput.length > 0);
      assert.ok(stdoutOutput[0].includes('Usage:'));
    });

    it('should set bail environment variable', async () => {
      const originalBail = process.env.NODE_TEST_BAIL;
      try {
        await main(makeArgs({ bail: true }));
        assert.equal(process.env.NODE_TEST_BAIL, '1');
      } finally {
        if (originalBail === undefined) {
          delete process.env.NODE_TEST_BAIL;
        } else {
          process.env.NODE_TEST_BAIL = originalBail;
        }
      }
    });
  });
});
