import { describe, it } from 'node:test';
import { expect } from '../../src/index.js';

describe('e2e: snapshot workflows', () => {
  it('should match a simple object snapshot', () => {
    const user = {
      name: 'Alice',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
    };

    expect(user).toMatchSnapshot();
  });

  it('should match an inline snapshot', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toMatchInlineSnapshot(`"Hello, World!"`);
  });

  it('should match a nested object snapshot', () => {
    const config = {
      database: {
        host: 'localhost',
        port: 5432,
        name: 'testdb',
      },
      cache: {
        enabled: true,
        ttl: 3600,
      },
    };

    expect(config).toMatchSnapshot();
  });

  it('should match array snapshots', () => {
    const items = [
      { id: 1, label: 'First' },
      { id: 2, label: 'Second' },
      { id: 3, label: 'Third' },
    ];

    expect(items).toMatchSnapshot();
  });

  it('should support custom snapshot serializers', () => {
    expect.addSnapshotSerializer({
      test: (val: unknown) =>
        typeof val === 'object' &&
        val !== null &&
        'type' in val &&
        (val as Record<string, unknown>).type === 'custom',
      serialize: (val: unknown) => {
        const obj = val as Record<string, unknown>;
        return `Custom<${obj.name}>`;
      },
    });

    const custom = { type: 'custom', name: 'widget' };
    expect(custom).toMatchSnapshot();
  });

  it('should match error snapshot with toThrowErrorMatchingSnapshot', () => {
    const throwError = (): never => {
      throw new Error('Something went wrong');
    };

    expect(throwError).toThrowErrorMatchingSnapshot();
  });
});
