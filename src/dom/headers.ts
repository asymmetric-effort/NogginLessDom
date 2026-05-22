/**
 * Headers implementation for DOM simulation.
 * Keys are case-insensitive (stored lowercase internally).
 * @module dom/headers
 */

/** Init type for Headers constructor. */
type HeadersInit = Headers | Record<string, string> | Array<[string, string]>;

/**
 * Headers represents HTTP headers, with case-insensitive key handling.
 */
export class Headers {
  private _map: Map<string, string[]> = new Map();

  constructor(init?: HeadersInit) {
    if (init) {
      if (init instanceof Headers) {
        for (const [key, value] of init.entries()) {
          this.append(key, value);
        }
      } else if (Array.isArray(init)) {
        for (const [key, value] of init) {
          this.append(key, value);
        }
      } else {
        for (const key of Object.keys(init)) {
          this.append(key, init[key]!);
        }
      }
    }
  }

  /**
   * Appends a new value onto an existing header, or adds the header if it does not exist.
   */
  append(name: string, value: string): void {
    const key = name.toLowerCase();
    const existing = this._map.get(key);
    if (existing) {
      existing.push(value);
    } else {
      this._map.set(key, [value]);
    }
  }

  /**
   * Deletes a header.
   */
  delete(name: string): void {
    this._map.delete(name.toLowerCase());
  }

  /**
   * Returns the combined value for a header, or null if not present.
   */
  get(name: string): string | null {
    const values = this._map.get(name.toLowerCase());
    return values ? values.join(', ') : null;
  }

  /**
   * Returns whether a header exists.
   */
  has(name: string): boolean {
    return this._map.has(name.toLowerCase());
  }

  /**
   * Sets a header, replacing any existing values.
   */
  set(name: string, value: string): void {
    this._map.set(name.toLowerCase(), [value]);
  }

  /**
   * Returns an iterator of [key, value] pairs, sorted by key.
   */
  *entries(): IterableIterator<[string, string]> {
    const sortedKeys = [...this._map.keys()].sort();
    for (const key of sortedKeys) {
      const values = this._map.get(key)!;
      yield [key, values.join(', ')];
    }
  }

  /**
   * Returns an iterator of header names, sorted.
   */
  *keys(): IterableIterator<string> {
    const sortedKeys = [...this._map.keys()].sort();
    for (const key of sortedKeys) {
      yield key;
    }
  }

  /**
   * Returns an iterator of header values, in key-sorted order.
   */
  *values(): IterableIterator<string> {
    const sortedKeys = [...this._map.keys()].sort();
    for (const key of sortedKeys) {
      const values = this._map.get(key)!;
      yield values.join(', ');
    }
  }

  /**
   * Calls a function for each header.
   */
  forEach(
    callback: (value: string, key: string, parent: Headers) => void,
  ): void {
    const sortedKeys = [...this._map.keys()].sort();
    for (const key of sortedKeys) {
      const values = this._map.get(key)!;
      callback(values.join(', '), key, this);
    }
  }

  /**
   * Returns the default iterator (entries).
   */
  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries();
  }
}
