import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spyOn } from '../../src/mocking/index.js';

describe('spyOn advanced', () => {
  describe('accessor spying', () => {
    it('should spy on a getter and track calls', () => {
      const obj = {
        _value: 42,
        get value(): number {
          return this._value;
        },
        set value(v: number) {
          this._value = v;
        },
      };

      const spy = spyOn(obj, 'value', 'get');
      const result = obj.value;
      assert.strictEqual(result, 42);
      assert.strictEqual(spy.mock.calls.length, 1);
    });

    it('should spy on a setter and track calls', () => {
      const obj = {
        _value: 0,
        get value(): number {
          return this._value;
        },
        set value(v: number) {
          this._value = v;
        },
      };

      const spy = spyOn(obj, 'value', 'set');
      obj.value = 99;
      assert.strictEqual(spy.mock.calls.length, 1);
      assert.deepStrictEqual(spy.mock.calls[0], [99]);
    });

    it('should restore original accessor with mockRestore', () => {
      let getterCallCount = 0;
      const obj = {
        get prop(): string {
          getterCallCount++;
          return 'original';
        },
      };

      const spy = spyOn(obj, 'prop', 'get');
      assert.strictEqual(obj.prop, 'original');
      assert.strictEqual(spy.mock.calls.length, 1);

      spy.mockRestore();
      getterCallCount = 0;
      assert.strictEqual(obj.prop, 'original');
      assert.strictEqual(getterCallCount, 1);
      // After restore, spy should not track new calls
      assert.strictEqual(spy.mock.calls.length, 0);
    });

    it('should restore original setter with mockRestore', () => {
      let setterCallCount = 0;
      const obj: { prop: number } = Object.create(null, {
        prop: {
          get(): number {
            return 0;
          },
          set(_v: number) {
            setterCallCount++;
          },
          configurable: true,
          enumerable: true,
        },
      });

      const spy = spyOn(obj, 'prop', 'set');
      obj.prop = 5;
      assert.strictEqual(spy.mock.calls.length, 1);

      spy.mockRestore();
      setterCallCount = 0;
      obj.prop = 10;
      assert.strictEqual(setterCallCount, 1);
      // After restore, spy should not track new calls
      assert.strictEqual(spy.mock.calls.length, 0);
    });

    it('should select accessor via third arg get or set', () => {
      const obj = {
        _x: 0,
        get x(): number {
          return this._x;
        },
        set x(v: number) {
          this._x = v;
        },
      };

      const getSpy = spyOn(obj, 'x', 'get');
      const _triggerGetter = obj.x; // trigger getter
      assert.strictEqual(_triggerGetter, 0);
      assert.strictEqual(getSpy.mock.calls.length, 1);
      getSpy.mockRestore();

      const setSpy = spyOn(obj, 'x', 'set');
      obj.x = 7;
      assert.strictEqual(setSpy.mock.calls.length, 1);
      setSpy.mockRestore();
    });

    it('should throw when accessor type does not exist', () => {
      const obj = {
        get readOnly(): number {
          return 1;
        },
      };

      assert.throws(() => spyOn(obj, 'readOnly', 'set'), {
        message: /Cannot spy on setter of readOnly: no setter defined/,
      });
    });

    it('should throw when using get/set on a non-accessor property', () => {
      const obj = { plain: 42 };

      assert.throws(() => spyOn(obj, 'plain', 'get'), {
        message: /Cannot spy on getter of plain: not an accessor property/,
      });
    });
  });

  describe('class static methods', () => {
    it('should spy on a class static method', () => {
      class MyClass {
        static greet(name: string): string {
          return `Hello, ${name}`;
        }
      }

      const spy = spyOn(MyClass as unknown as Record<string, unknown>, 'greet');
      const result = (MyClass.greet as (name: string) => string)('World');
      assert.strictEqual(result, 'Hello, World');
      assert.strictEqual(spy.mock.calls.length, 1);
      assert.deepStrictEqual(spy.mock.calls[0], ['World']);

      spy.mockRestore();
      assert.strictEqual(MyClass.greet('Test'), 'Hello, Test');
    });
  });

  describe('prototype methods', () => {
    it('should spy on a prototype method', () => {
      class Counter {
        count = 0;
        increment(): void {
          this.count++;
        }
      }

      const spy = spyOn(
        Counter.prototype as unknown as Record<string, unknown>,
        'increment',
      );

      const instance = new Counter();
      instance.increment();
      assert.strictEqual(spy.mock.calls.length, 1);
      // The original implementation should still run
      assert.strictEqual(instance.count, 1);

      spy.mockRestore();
    });

    it('should affect all instances when spying on prototype', () => {
      class Greeter {
        greet(): string {
          return 'hi';
        }
      }

      const spy = spyOn(
        Greeter.prototype as unknown as Record<string, unknown>,
        'greet',
      );

      const a = new Greeter();
      const b = new Greeter();
      a.greet();
      b.greet();
      assert.strictEqual(spy.mock.calls.length, 2);

      spy.mockRestore();
    });
  });
});
