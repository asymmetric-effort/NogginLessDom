import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';
import {
  serialize,
  setUpdateMode,
  getUpdateMode,
  setCurrentTestName,
  resetSnapshotCounter,
  matchFileSnapshot,
  escapeSnapshotName,
} from '../../src/assertions/snapshots.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const SNAPSHOTS_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '__snapshots__',
);

afterEach(() => {
  // Clean up snapshot files after each test
  if (fs.existsSync(SNAPSHOTS_DIR)) {
    fs.rmSync(SNAPSHOTS_DIR, { recursive: true, force: true });
  }
  // Reset update mode
  setUpdateMode('none');
  delete process.env.UPDATE_SNAPSHOTS;
});

describe('toMatchFileSnapshot', () => {
  it('should pass when file content matches serialized value', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-'));
    const filePath = path.join(tmpDir, 'test.snap');
    const value = { name: 'test', count: 42 };
    fs.writeFileSync(filePath, serialize(value), 'utf-8');
    try {
      matchFileSnapshot(value, filePath, tmpDir);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should fail when file content does not match', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-'));
    const filePath = path.join(tmpDir, 'test.snap');
    fs.writeFileSync(filePath, '"old value"', 'utf-8');
    try {
      assert.throws(() => {
        matchFileSnapshot('new value', filePath, tmpDir);
      }, /File snapshot mismatch/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should create new file in update mode when file does not exist', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-'));
    const filePath = path.join(tmpDir, 'subdir', 'new.snap');
    setUpdateMode('all');
    try {
      matchFileSnapshot({ hello: 'world' }, filePath, tmpDir);
      assert.ok(fs.existsSync(filePath), 'file should be created');
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.strictEqual(content, serialize({ hello: 'world' }));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should overwrite file in update mode all when mismatch', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-'));
    const filePath = path.join(tmpDir, 'test.snap');
    fs.writeFileSync(filePath, '"old"', 'utf-8');
    setUpdateMode('all');
    try {
      matchFileSnapshot('new', filePath, tmpDir);
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.strictEqual(content, '"new"');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should fail when file does not exist and update mode is none', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-'));
    const filePath = path.join(tmpDir, 'nonexistent.snap');
    try {
      assert.throws(() => {
        matchFileSnapshot('value', filePath, tmpDir);
      }, /File snapshot not found/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should reject absolute paths outside the project root', () => {
    setUpdateMode('all');
    assert.throws(() => {
      matchFileSnapshot('payload', '/tmp/outside-project.snap');
    }, /File snapshot path must be within the project directory/);
  });

  it('should reject relative paths that traverse above project root', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-'));
    try {
      setUpdateMode('all');
      assert.throws(() => {
        matchFileSnapshot('payload', '../../../tmp/evil.snap', tmpDir);
      }, /File snapshot path must be within the project directory/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should allow paths within the project directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-'));
    const filePath = path.join(tmpDir, 'safe.snap');
    setUpdateMode('all');
    try {
      matchFileSnapshot('safe value', filePath, tmpDir);
      assert.ok(fs.existsSync(filePath), 'file should be created');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('auto-incrementing snapshot names', () => {
  it('should use test name + counter when no name provided', () => {
    setCurrentTestName('my test');
    resetSnapshotCounter();
    // First call: "my test 1"
    expect({ a: 1 }).toMatchSnapshot();
    // Second call: "my test 2"
    expect({ b: 2 }).toMatchSnapshot();

    // Verify the snapshot file contains the auto-generated names
    assert.ok(fs.existsSync(SNAPSHOTS_DIR));
    const files = fs.readdirSync(SNAPSHOTS_DIR);
    assert.ok(files.length > 0);
    const content = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, files[0]!),
      'utf-8',
    );
    assert.ok(content.includes('my test 1'), 'should contain "my test 1"');
    assert.ok(content.includes('my test 2'), 'should contain "my test 2"');
  });

  it('should reset counter between tests', () => {
    setCurrentTestName('test A');
    resetSnapshotCounter();
    expect('first').toMatchSnapshot();

    setCurrentTestName('test B');
    resetSnapshotCounter();
    expect('second').toMatchSnapshot();

    assert.ok(fs.existsSync(SNAPSHOTS_DIR));
    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const content = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, files[0]!),
      'utf-8',
    );
    assert.ok(content.includes('test A 1'), 'should contain "test A 1"');
    assert.ok(content.includes('test B 1'), 'should contain "test B 1"');
  });

  it('should use explicit name when provided', () => {
    setCurrentTestName('my test');
    resetSnapshotCounter();
    expect('value').toMatchSnapshot('custom name');

    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const content = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, files[0]!),
      'utf-8',
    );
    assert.ok(content.includes('custom name'), 'should contain "custom name"');
    assert.ok(
      !content.includes('my test 1'),
      'should not contain auto-generated name',
    );
  });
});

describe('update mode', () => {
  it('should default to none', () => {
    assert.strictEqual(getUpdateMode(), 'none');
  });

  it('setUpdateMode changes behavior', () => {
    setUpdateMode('all');
    assert.strictEqual(getUpdateMode(), 'all');
    setUpdateMode('new');
    assert.strictEqual(getUpdateMode(), 'new');
    setUpdateMode('none');
    assert.strictEqual(getUpdateMode(), 'none');
  });

  it('update mode all overwrites existing snapshots', () => {
    // Create initial snapshot
    expect({ a: 1 }).toMatchSnapshot('overwrite test');
    // Now change value and set update mode
    setUpdateMode('all');
    // Should NOT throw — it should overwrite
    expect({ a: 2 }).toMatchSnapshot('overwrite test');
    // Read back and verify it was updated
    setUpdateMode('none');
    expect({ a: 2 }).toMatchSnapshot('overwrite test');
  });

  it('update mode new only creates new snapshots', () => {
    // Create initial snapshot
    expect({ a: 1 }).toMatchSnapshot('existing snapshot');
    // Now set update mode to new
    setUpdateMode('new');
    // Should fail on mismatch for existing snapshots
    assert.throws(() => {
      expect({ a: 2 }).toMatchSnapshot('existing snapshot');
    }, /Snapshot mismatch/);
    // But should create new snapshots
    expect({ b: 1 }).toMatchSnapshot('brand new snapshot');
    setUpdateMode('none');
    expect({ b: 1 }).toMatchSnapshot('brand new snapshot');
  });

  it('should respect UPDATE_SNAPSHOTS=1 env var as update all', () => {
    expect({ a: 1 }).toMatchSnapshot('env test');
    process.env.UPDATE_SNAPSHOTS = '1';
    // Should overwrite existing
    expect({ a: 2 }).toMatchSnapshot('env test');
    delete process.env.UPDATE_SNAPSHOTS;
    // Verify it was updated
    expect({ a: 2 }).toMatchSnapshot('env test');
  });
});

describe('escapeSnapshotName', () => {
  it('should escape single quotes', () => {
    assert.strictEqual(escapeSnapshotName("test'name"), "test\\'name");
  });

  it('should escape backslashes', () => {
    assert.strictEqual(escapeSnapshotName('test\\name'), 'test\\\\name');
  });

  it('should prevent code injection via snapshot names', () => {
    const malicious =
      "test']; require('child_process').execSync('id'); exports['x";
    const escaped = escapeSnapshotName(malicious);
    // All single quotes should be preceded by a backslash
    const unescaped = escaped.replace(/\\'/g, '');
    assert.ok(!unescaped.includes("'"), 'unescaped quotes remain');
    // Escaped quotes should be present
    assert.ok(escaped.includes("\\'"));
  });
});
