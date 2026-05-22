/**
 * FormData implementation for DOM simulation.
 * @module dom/form-data
 */

/** Value type for FormData entries (File not yet implemented, using string). */
type FormDataEntryValue = string;

/**
 * FormData provides a way to construct a set of key/value pairs.
 */
export class FormData {
  private _entries: Array<[string, FormDataEntryValue]> = [];

  /**
   * Appends a new value onto an existing key, or adds the key if it does not exist.
   */
  append(name: string, value: string): void {
    this._entries.push([name, value]);
  }

  /**
   * Deletes all entries with the given key.
   */
  delete(name: string): void {
    this._entries = this._entries.filter(([key]) => key !== name);
  }

  /**
   * Returns the first value associated with the given key.
   */
  get(name: string): FormDataEntryValue | null {
    const entry = this._entries.find(([key]) => key === name);
    return entry ? entry[1] : null;
  }

  /**
   * Returns all values associated with the given key.
   */
  getAll(name: string): FormDataEntryValue[] {
    return this._entries.filter(([key]) => key === name).map(([, val]) => val);
  }

  /**
   * Returns whether a key exists in the FormData.
   */
  has(name: string): boolean {
    return this._entries.some(([key]) => key === name);
  }

  /**
   * Sets the value for the given key, replacing any existing entries with that key.
   */
  set(name: string, value: string): void {
    this.delete(name);
    this._entries.push([name, value]);
  }

  /**
   * Returns an iterator of all key/value pairs.
   */
  *entries(): IterableIterator<[string, FormDataEntryValue]> {
    for (const entry of this._entries) {
      yield entry;
    }
  }

  /**
   * Returns an iterator of all keys.
   */
  *keys(): IterableIterator<string> {
    for (const [key] of this._entries) {
      yield key;
    }
  }

  /**
   * Returns an iterator of all values.
   */
  *values(): IterableIterator<FormDataEntryValue> {
    for (const [, value] of this._entries) {
      yield value;
    }
  }

  /**
   * Calls a function for each key/value pair.
   */
  forEach(
    callback: (
      value: FormDataEntryValue,
      key: string,
      parent: FormData,
    ) => void,
  ): void {
    for (const [key, value] of this._entries) {
      callback(value, key, this);
    }
  }

  /**
   * Returns the default iterator (entries).
   */
  [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]> {
    return this.entries();
  }
}
