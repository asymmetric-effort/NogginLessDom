/**
 * In-memory IndexedDB simulation for testing.
 * @module dom/indexeddb
 */

/** Valid key types for IndexedDB. */
type IDBValidKey = number | string | Date | ArrayBuffer | IDBValidKey[];

/**
 * Compare two IDB keys for ordering.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareKeys(a: IDBValidKey, b: IDBValidKey): number {
  const typeOrder = (k: IDBValidKey): number => {
    if (Array.isArray(k)) return 4;
    if (typeof k === 'string') return 3;
    if (k instanceof Date) return 2;
    if (typeof k === 'number') return 1;
    return 0;
  };
  const ta = typeOrder(a);
  const tb = typeOrder(b);
  if (ta !== tb) return ta - tb;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string')
    return a < b ? -1 : a > b ? 1 : 0;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const c = compareKeys(a[i]!, b[i]!);
      if (c !== 0) return c;
    }
    return a.length - b.length;
  }
  return 0;
}

/**
 * Extract a value from an object using a dotted key path.
 */
function extractByKeyPath(obj: unknown, keyPath: string): unknown {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Set a value in an object using a dotted key path.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function setByKeyPath(obj: unknown, keyPath: string, value: unknown): void {
  const parts = keyPath.split('.');
  if (parts.some((p) => DANGEROUS_KEYS.has(p))) return;
  let current: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current == null || typeof current !== 'object') return;
    current = (current as Record<string, unknown>)[parts[i]!];
  }
  if (current != null && typeof current === 'object') {
    (current as Record<string, unknown>)[parts[parts.length - 1]!] = value;
  }
}

/**
 * Deep clone a value (simple structured clone approximation).
 */
function deepClone<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as T;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    result[key] = deepClone((value as Record<string, unknown>)[key]);
  }
  return result as T;
}

/**
 * DOMStringList-like array for objectStoreNames and indexNames.
 */
class DOMStringListImpl {
  private _items: string[] = [];

  get length(): number {
    return this._items.length;
  }

  item(index: number): string | null {
    return this._items[index] ?? null;
  }

  contains(str: string): boolean {
    return this._items.includes(str);
  }

  /** @internal */
  _add(name: string): void {
    if (!this._items.includes(name)) {
      this._items.push(name);
    }
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this._items[Symbol.iterator]();
  }
}

/**
 * IDBKeyRange — static factory methods for key ranges.
 */
export class IDBKeyRange {
  public readonly lower: IDBValidKey | undefined;
  public readonly upper: IDBValidKey | undefined;
  public readonly lowerOpen: boolean;
  public readonly upperOpen: boolean;

  private constructor(
    lower: IDBValidKey | undefined,
    upper: IDBValidKey | undefined,
    lowerOpen: boolean,
    upperOpen: boolean,
  ) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = lowerOpen;
    this.upperOpen = upperOpen;
  }

  static only(value: IDBValidKey): IDBKeyRange {
    return new IDBKeyRange(value, value, false, false);
  }

  static lowerBound(lower: IDBValidKey, open?: boolean): IDBKeyRange {
    return new IDBKeyRange(lower, undefined, open ?? false, true);
  }

  static upperBound(upper: IDBValidKey, open?: boolean): IDBKeyRange {
    return new IDBKeyRange(undefined, upper, true, open ?? false);
  }

  static bound(
    lower: IDBValidKey,
    upper: IDBValidKey,
    lowerOpen?: boolean,
    upperOpen?: boolean,
  ): IDBKeyRange {
    return new IDBKeyRange(
      lower,
      upper,
      lowerOpen ?? false,
      upperOpen ?? false,
    );
  }

  includes(key: IDBValidKey): boolean {
    if (this.lower !== undefined) {
      const cmp = compareKeys(key, this.lower);
      if (this.lowerOpen ? cmp <= 0 : cmp < 0) return false;
    }
    if (this.upper !== undefined) {
      const cmp = compareKeys(key, this.upper);
      if (this.upperOpen ? cmp >= 0 : cmp > 0) return false;
    }
    return true;
  }
}

/**
 * IDBRequest — base request object returned by IDB operations.
 */
export class IDBRequest {
  public result: unknown = undefined;
  public error: DOMException | null = null;
  public source: unknown = null;
  public transaction: IDBTransaction | null = null;
  public readyState: 'pending' | 'done' = 'pending';

  private _onsuccess:
    | ((event: { type: string; target: IDBRequest }) => void)
    | null = null;
  private _onerror:
    | ((event: { type: string; target: IDBRequest }) => void)
    | null = null;
  protected _listeners: Map<
    string,
    Array<(event: { type: string; target: IDBRequest }) => void>
  > = new Map();

  get onsuccess():
    | ((event: { type: string; target: IDBRequest }) => void)
    | null {
    return this._onsuccess;
  }

  set onsuccess(
    handler: ((event: { type: string; target: IDBRequest }) => void) | null,
  ) {
    this._onsuccess = handler;
  }

  get onerror():
    | ((event: { type: string; target: IDBRequest }) => void)
    | null {
    return this._onerror;
  }

  set onerror(
    handler: ((event: { type: string; target: IDBRequest }) => void) | null,
  ) {
    this._onerror = handler;
  }

  addEventListener(
    type: string,
    listener: (event: { type: string; target: IDBRequest }) => void,
  ): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: { type: string; target: IDBRequest }) => void,
  ): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  /** @internal */
  _fireSuccess(result: unknown): void {
    this.result = result;
    this.readyState = 'done';
    const event = { type: 'success', target: this as IDBRequest };
    const listeners = this._listeners.get('success') ?? [];
    for (const listener of listeners) {
      listener(event);
    }
    if (this._onsuccess) {
      this._onsuccess(event);
    }
  }

  /** @internal */
  _fireError(error: DOMException): void {
    this.error = error;
    this.readyState = 'done';
    const event = { type: 'error', target: this as IDBRequest };
    const listeners = this._listeners.get('error') ?? [];
    for (const listener of listeners) {
      listener(event);
    }
    if (this._onerror) {
      this._onerror(event);
    }
  }
}

/**
 * IDBOpenDBRequest — returned by IDBFactory.open() and IDBFactory.deleteDatabase().
 */
export class IDBOpenDBRequest extends IDBRequest {
  private _onupgradeneeded:
    | ((event: {
        type: string;
        target: IDBOpenDBRequest;
        oldVersion: number;
        newVersion: number | null;
      }) => void)
    | null = null;
  private _onblocked:
    | ((event: { type: string; target: IDBOpenDBRequest }) => void)
    | null = null;

  get onupgradeneeded():
    | ((event: {
        type: string;
        target: IDBOpenDBRequest;
        oldVersion: number;
        newVersion: number | null;
      }) => void)
    | null {
    return this._onupgradeneeded;
  }

  set onupgradeneeded(
    handler:
      | ((event: {
          type: string;
          target: IDBOpenDBRequest;
          oldVersion: number;
          newVersion: number | null;
        }) => void)
      | null,
  ) {
    this._onupgradeneeded = handler;
  }

  get onblocked():
    | ((event: { type: string; target: IDBOpenDBRequest }) => void)
    | null {
    return this._onblocked;
  }

  set onblocked(
    handler:
      | ((event: { type: string; target: IDBOpenDBRequest }) => void)
      | null,
  ) {
    this._onblocked = handler;
  }

  /** @internal */
  _fireUpgradeNeeded(oldVersion: number, newVersion: number | null): void {
    const event = {
      type: 'upgradeneeded',
      target: this as IDBOpenDBRequest,
      oldVersion,
      newVersion,
    };
    const listeners = this._listeners.get('upgradeneeded') ?? [];
    for (const listener of listeners) {
      (
        listener as unknown as (event: {
          type: string;
          target: IDBOpenDBRequest;
          oldVersion: number;
          newVersion: number | null;
        }) => void
      )(event);
    }
    if (this._onupgradeneeded) {
      this._onupgradeneeded(event);
    }
  }

  /** @internal */
  _fireBlocked(): void {
    const event = { type: 'blocked', target: this as IDBOpenDBRequest };
    const listeners = this._listeners.get('blocked') ?? [];
    for (const listener of listeners) {
      listener(event as unknown as { type: string; target: IDBRequest });
    }
    if (this._onblocked) {
      this._onblocked(event);
    }
  }

  /** @internal override addEventListener to use our own map */
  override addEventListener(
    type: string,
    listener: (event: { type: string; target: IDBRequest }) => void,
  ): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  override removeEventListener(
    type: string,
    listener: (event: { type: string; target: IDBRequest }) => void,
  ): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }
}

/** Internal storage for an index. */
interface IndexMetadata {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

/** Internal storage for an object store. */
interface ObjectStoreData {
  name: string;
  keyPath: string | null;
  autoIncrement: boolean;
  currentKey: number;
  records: Map<string, { key: IDBValidKey; value: unknown }>;
  indexes: Map<string, IndexMetadata>;
}

/**
 * Serialize a key to a string for Map storage.
 */
function keyToString(key: IDBValidKey): string {
  if (typeof key === 'number') return `n:${key}`;
  if (typeof key === 'string') return `s:${key}`;
  if (key instanceof Date) return `d:${key.getTime()}`;
  if (Array.isArray(key)) return `a:${JSON.stringify(key)}`;
  return `o:${String(key)}`;
}

/**
 * IDBCursor — iterates over records.
 */
export class IDBCursor {
  private _source: IDBObjectStore | IDBIndex;
  private _direction: IDBCursorDirection;
  private _records: Array<{
    key: IDBValidKey;
    primaryKey: IDBValidKey;
    value: unknown;
  }>;
  private _position: number = -1;
  private _request: IDBRequest;
  private _gotValue: boolean = false;

  /** @internal */
  constructor(
    source: IDBObjectStore | IDBIndex,
    direction: IDBCursorDirection,
    records: Array<{
      key: IDBValidKey;
      primaryKey: IDBValidKey;
      value: unknown;
    }>,
    request: IDBRequest,
  ) {
    this._source = source;
    this._direction = direction;
    this._records = records;
    this._request = request;
  }

  get source(): IDBObjectStore | IDBIndex {
    return this._source;
  }

  get direction(): IDBCursorDirection {
    return this._direction;
  }

  get key(): IDBValidKey {
    return this._records[this._position]!.key;
  }

  get primaryKey(): IDBValidKey {
    return this._records[this._position]!.primaryKey;
  }

  get value(): unknown {
    return deepClone(this._records[this._position]!.value);
  }

  continue(): void {
    this._position++;
    if (this._position < this._records.length) {
      this._gotValue = true;
      queueMicrotask(() => {
        this._request.result = this;
        this._request._fireSuccess(this);
      });
    } else {
      queueMicrotask(() => {
        this._request.result = null;
        this._request._fireSuccess(null);
      });
    }
  }

  advance(count: number): void {
    if (count <= 0) {
      throw new TypeError('count must be positive');
    }
    this._position += count;
    if (this._position < this._records.length) {
      this._gotValue = true;
      queueMicrotask(() => {
        this._request.result = this;
        this._request._fireSuccess(this);
      });
    } else {
      queueMicrotask(() => {
        this._request.result = null;
        this._request._fireSuccess(null);
      });
    }
  }

  delete(): IDBRequest {
    const record = this._records[this._position];
    if (!record) {
      throw new Error('InvalidStateError: cursor is not pointing at a record');
    }
    const store =
      this._source instanceof IDBObjectStore
        ? this._source
        : this._source._store;
    const req = store.delete(record.primaryKey as IDBValidKey);
    return req;
  }

  update(value: unknown): IDBRequest {
    const record = this._records[this._position];
    if (!record) {
      throw new Error('InvalidStateError: cursor is not pointing at a record');
    }
    const store =
      this._source instanceof IDBObjectStore
        ? this._source
        : this._source._store;
    const req = store.put(value, record.primaryKey as IDBValidKey);
    return req;
  }
}

type IDBCursorDirection = 'next' | 'nextunique' | 'prev' | 'prevunique';

/**
 * IDBIndex — provides access to index data.
 */
export class IDBIndex {
  private _name: string;
  private _keyPath: string | string[];
  private _unique: boolean;
  private _multiEntry: boolean;
  /** @internal */
  _store: IDBObjectStore;

  /** @internal */
  constructor(
    name: string,
    keyPath: string | string[],
    unique: boolean,
    multiEntry: boolean,
    store: IDBObjectStore,
  ) {
    this._name = name;
    this._keyPath = keyPath;
    this._unique = unique;
    this._multiEntry = multiEntry;
    this._store = store;
  }

  get name(): string {
    return this._name;
  }

  get keyPath(): string | string[] {
    return this._keyPath;
  }

  get unique(): boolean {
    return this._unique;
  }

  get multiEntry(): boolean {
    return this._multiEntry;
  }

  get(key: IDBValidKey | IDBKeyRange): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._store._transaction;

    queueMicrotask(() => {
      const kp =
        typeof this._keyPath === 'string' ? this._keyPath : this._keyPath[0]!;
      const data = this._store._getData();
      for (const entry of data.values()) {
        const indexValue = extractByKeyPath(entry.value, kp) as IDBValidKey;
        if (key instanceof IDBKeyRange) {
          if (key.includes(indexValue)) {
            request._fireSuccess(deepClone(entry.value));
            this._store._transaction?._requestCompleted();
            return;
          }
        } else if (compareKeys(indexValue, key) === 0) {
          request._fireSuccess(deepClone(entry.value));
          this._store._transaction?._requestCompleted();
          return;
        }
      }
      request._fireSuccess(undefined);
      this._store._transaction?._requestCompleted();
    });

    this._store._transaction?._addPendingRequest();
    return request;
  }

  getAll(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._store._transaction;

    queueMicrotask(() => {
      const kp =
        typeof this._keyPath === 'string' ? this._keyPath : this._keyPath[0]!;
      const results: unknown[] = [];
      const data = this._store._getData();
      for (const entry of data.values()) {
        const indexValue = extractByKeyPath(entry.value, kp) as IDBValidKey;
        if (query == null) {
          results.push(deepClone(entry.value));
        } else if (query instanceof IDBKeyRange) {
          if (query.includes(indexValue)) {
            results.push(deepClone(entry.value));
          }
        } else if (compareKeys(indexValue, query) === 0) {
          results.push(deepClone(entry.value));
        }
        if (count !== undefined && results.length >= count) break;
      }
      request._fireSuccess(results);
      this._store._transaction?._requestCompleted();
    });

    this._store._transaction?._addPendingRequest();
    return request;
  }

  count(query?: IDBValidKey | IDBKeyRange | null): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._store._transaction;

    queueMicrotask(() => {
      const kp =
        typeof this._keyPath === 'string' ? this._keyPath : this._keyPath[0]!;
      let c = 0;
      const data = this._store._getData();
      for (const entry of data.values()) {
        const indexValue = extractByKeyPath(entry.value, kp) as IDBValidKey;
        if (query == null) {
          c++;
        } else if (query instanceof IDBKeyRange) {
          if (query.includes(indexValue)) c++;
        } else if (compareKeys(indexValue, query) === 0) {
          c++;
        }
      }
      request._fireSuccess(c);
      this._store._transaction?._requestCompleted();
    });

    this._store._transaction?._addPendingRequest();
    return request;
  }

  openCursor(
    query?: IDBValidKey | IDBKeyRange | null,
    direction?: IDBCursorDirection,
  ): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._store._transaction;
    const dir = direction ?? 'next';

    queueMicrotask(() => {
      const kp =
        typeof this._keyPath === 'string' ? this._keyPath : this._keyPath[0]!;
      const records: Array<{
        key: IDBValidKey;
        primaryKey: IDBValidKey;
        value: unknown;
      }> = [];
      const data = this._store._getData();
      for (const entry of data.values()) {
        const indexValue = extractByKeyPath(entry.value, kp) as IDBValidKey;
        if (query == null) {
          records.push({
            key: indexValue,
            primaryKey: entry.key,
            value: entry.value,
          });
        } else if (query instanceof IDBKeyRange) {
          if (query.includes(indexValue)) {
            records.push({
              key: indexValue,
              primaryKey: entry.key,
              value: entry.value,
            });
          }
        } else if (compareKeys(indexValue, query) === 0) {
          records.push({
            key: indexValue,
            primaryKey: entry.key,
            value: entry.value,
          });
        }
      }

      records.sort((a, b) => compareKeys(a.key, b.key));
      if (dir === 'prev' || dir === 'prevunique') {
        records.reverse();
      }

      if (records.length === 0) {
        request._fireSuccess(null);
        this._store._transaction?._requestCompleted();
        return;
      }

      const cursor = new IDBCursor(this, dir, records, request);
      cursor.continue();
    });

    this._store._transaction?._addPendingRequest();
    return request;
  }
}

/**
 * IDBObjectStore — provides access to a store's data.
 */
export class IDBObjectStore {
  private _data: ObjectStoreData;
  /** @internal */ _transaction: IDBTransaction | null;
  private _indexInstances: Map<string, IDBIndex> = new Map();

  /** @internal */
  constructor(data: ObjectStoreData, transaction: IDBTransaction | null) {
    this._data = data;
    this._transaction = transaction;
  }

  get name(): string {
    return this._data.name;
  }

  get keyPath(): string | null {
    return this._data.keyPath;
  }

  get autoIncrement(): boolean {
    return this._data.autoIncrement;
  }

  get indexNames(): DOMStringListImpl {
    const list = new DOMStringListImpl();
    for (const name of this._data.indexes.keys()) {
      list._add(name);
    }
    return list;
  }

  /** @internal */
  _getData(): Map<string, { key: IDBValidKey; value: unknown }> {
    return this._data.records;
  }

  private _resolveKey(
    value: unknown,
    key?: IDBValidKey,
  ): IDBValidKey | undefined {
    if (key !== undefined) return key;
    if (this._data.keyPath) {
      const extracted = extractByKeyPath(value, this._data.keyPath);
      if (extracted !== undefined) return extracted as IDBValidKey;
    }
    if (this._data.autoIncrement) {
      const k = this._data.currentKey++;
      if (this._data.keyPath && typeof value === 'object' && value !== null) {
        setByKeyPath(value, this._data.keyPath, k);
      }
      return k;
    }
    return undefined;
  }

  private _checkIndexUniqueness(
    value: unknown,
    excludeKey?: string,
  ): string | null {
    for (const [indexName, meta] of this._data.indexes) {
      if (!meta.unique) continue;
      const kp =
        typeof meta.keyPath === 'string' ? meta.keyPath : meta.keyPath[0]!;
      const newIndexVal = extractByKeyPath(value, kp) as IDBValidKey;
      if (newIndexVal === undefined) continue;
      for (const [recKey, rec] of this._data.records) {
        if (excludeKey !== undefined && recKey === excludeKey) continue;
        const existingVal = extractByKeyPath(rec.value, kp) as IDBValidKey;
        if (
          existingVal !== undefined &&
          compareKeys(newIndexVal, existingVal) === 0
        ) {
          return indexName;
        }
      }
    }
    return null;
  }

  add(value: unknown, key?: IDBValidKey): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._transaction;

    queueMicrotask(() => {
      const clonedValue = deepClone(value);
      const resolvedKey = this._resolveKey(clonedValue, key);
      if (resolvedKey === undefined) {
        request._fireError(new DOMException('No key provided', 'DataError'));
        this._transaction?._requestCompleted();
        return;
      }
      const keyStr = keyToString(resolvedKey);
      if (this._data.records.has(keyStr)) {
        request._fireError(
          new DOMException(
            'Key already exists in the object store',
            'ConstraintError',
          ),
        );
        this._transaction?._requestCompleted();
        return;
      }
      const uniqueViolation = this._checkIndexUniqueness(clonedValue);
      if (uniqueViolation) {
        request._fireError(
          new DOMException(
            `Unique index constraint violated on index "${uniqueViolation}"`,
            'ConstraintError',
          ),
        );
        this._transaction?._requestCompleted();
        return;
      }
      this._data.records.set(keyStr, { key: resolvedKey, value: clonedValue });
      request._fireSuccess(resolvedKey);
      this._transaction?._requestCompleted();
    });

    this._transaction?._addPendingRequest();
    return request;
  }

  put(value: unknown, key?: IDBValidKey): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._transaction;

    queueMicrotask(() => {
      const clonedValue = deepClone(value);
      const resolvedKey = this._resolveKey(clonedValue, key);
      if (resolvedKey === undefined) {
        request._fireError(new DOMException('No key provided', 'DataError'));
        this._transaction?._requestCompleted();
        return;
      }
      const keyStr = keyToString(resolvedKey);
      const uniqueViolation = this._checkIndexUniqueness(clonedValue, keyStr);
      if (uniqueViolation) {
        request._fireError(
          new DOMException(
            `Unique index constraint violated on index "${uniqueViolation}"`,
            'ConstraintError',
          ),
        );
        this._transaction?._requestCompleted();
        return;
      }
      this._data.records.set(keyStr, { key: resolvedKey, value: clonedValue });
      request._fireSuccess(resolvedKey);
      this._transaction?._requestCompleted();
    });

    this._transaction?._addPendingRequest();
    return request;
  }

  get(key: IDBValidKey | IDBKeyRange): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._transaction;

    queueMicrotask(() => {
      if (key instanceof IDBKeyRange) {
        for (const entry of this._data.records.values()) {
          if (key.includes(entry.key)) {
            request._fireSuccess(deepClone(entry.value));
            this._transaction?._requestCompleted();
            return;
          }
        }
        request._fireSuccess(undefined);
      } else {
        const keyStr = keyToString(key);
        const record = this._data.records.get(keyStr);
        request._fireSuccess(record ? deepClone(record.value) : undefined);
      }
      this._transaction?._requestCompleted();
    });

    this._transaction?._addPendingRequest();
    return request;
  }

  getAll(query?: IDBValidKey | IDBKeyRange | null, count?: number): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._transaction;

    queueMicrotask(() => {
      const results: unknown[] = [];
      for (const entry of this._data.records.values()) {
        if (query == null) {
          results.push(deepClone(entry.value));
        } else if (query instanceof IDBKeyRange) {
          if (query.includes(entry.key)) {
            results.push(deepClone(entry.value));
          }
        } else if (compareKeys(entry.key, query) === 0) {
          results.push(deepClone(entry.value));
        }
        if (count !== undefined && results.length >= count) break;
      }
      request._fireSuccess(results);
      this._transaction?._requestCompleted();
    });

    this._transaction?._addPendingRequest();
    return request;
  }

  delete(key: IDBValidKey | IDBKeyRange): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._transaction;

    queueMicrotask(() => {
      if (key instanceof IDBKeyRange) {
        const toDelete: string[] = [];
        for (const [keyStr, entry] of this._data.records) {
          if (key.includes(entry.key)) {
            toDelete.push(keyStr);
          }
        }
        for (const k of toDelete) {
          this._data.records.delete(k);
        }
      } else {
        const keyStr = keyToString(key);
        this._data.records.delete(keyStr);
      }
      request._fireSuccess(undefined);
      this._transaction?._requestCompleted();
    });

    this._transaction?._addPendingRequest();
    return request;
  }

  clear(): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._transaction;

    queueMicrotask(() => {
      this._data.records.clear();
      request._fireSuccess(undefined);
      this._transaction?._requestCompleted();
    });

    this._transaction?._addPendingRequest();
    return request;
  }

  count(query?: IDBValidKey | IDBKeyRange | null): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._transaction;

    queueMicrotask(() => {
      if (query == null) {
        request._fireSuccess(this._data.records.size);
      } else {
        let c = 0;
        for (const entry of this._data.records.values()) {
          if (query instanceof IDBKeyRange) {
            if (query.includes(entry.key)) c++;
          } else if (compareKeys(entry.key, query) === 0) {
            c++;
          }
        }
        request._fireSuccess(c);
      }
      this._transaction?._requestCompleted();
    });

    this._transaction?._addPendingRequest();
    return request;
  }

  createIndex(
    name: string,
    keyPath: string | string[],
    options?: { unique?: boolean; multiEntry?: boolean },
  ): IDBIndex {
    if (this._data.indexes.has(name)) {
      throw new DOMException(
        `Index "${name}" already exists`,
        'ConstraintError',
      );
    }
    const meta: IndexMetadata = {
      name,
      keyPath,
      unique: options?.unique ?? false,
      multiEntry: options?.multiEntry ?? false,
    };
    this._data.indexes.set(name, meta);
    const idx = new IDBIndex(name, keyPath, meta.unique, meta.multiEntry, this);
    this._indexInstances.set(name, idx);
    return idx;
  }

  deleteIndex(name: string): void {
    if (!this._data.indexes.has(name)) {
      throw new DOMException(`Index "${name}" not found`, 'NotFoundError');
    }
    this._data.indexes.delete(name);
    this._indexInstances.delete(name);
  }

  index(name: string): IDBIndex {
    const meta = this._data.indexes.get(name);
    if (!meta) {
      throw new DOMException(`Index "${name}" not found`, 'NotFoundError');
    }
    let idx = this._indexInstances.get(name);
    if (!idx) {
      idx = new IDBIndex(
        name,
        meta.keyPath,
        meta.unique,
        meta.multiEntry,
        this,
      );
      this._indexInstances.set(name, idx);
    }
    return idx;
  }

  openCursor(
    query?: IDBValidKey | IDBKeyRange | null,
    direction?: IDBCursorDirection,
  ): IDBRequest {
    const request = new IDBRequest();
    request.source = this;
    request.transaction = this._transaction;
    const dir = direction ?? 'next';

    queueMicrotask(() => {
      const records: Array<{
        key: IDBValidKey;
        primaryKey: IDBValidKey;
        value: unknown;
      }> = [];
      for (const entry of this._data.records.values()) {
        if (query == null) {
          records.push({
            key: entry.key,
            primaryKey: entry.key,
            value: entry.value,
          });
        } else if (query instanceof IDBKeyRange) {
          if (query.includes(entry.key)) {
            records.push({
              key: entry.key,
              primaryKey: entry.key,
              value: entry.value,
            });
          }
        } else if (compareKeys(entry.key, query) === 0) {
          records.push({
            key: entry.key,
            primaryKey: entry.key,
            value: entry.value,
          });
        }
      }

      records.sort((a, b) => compareKeys(a.key, b.key));
      if (dir === 'prev' || dir === 'prevunique') {
        records.reverse();
      }

      if (records.length === 0) {
        request._fireSuccess(null);
        this._transaction?._requestCompleted();
        return;
      }

      const cursor = new IDBCursor(this, dir, records, request);
      cursor.continue();
    });

    this._transaction?._addPendingRequest();
    return request;
  }
}

/**
 * IDBTransaction — groups requests into an atomic unit.
 */
export class IDBTransaction {
  private _db: IDBDatabase;
  private _storeNames: string[];
  private _mode: 'readonly' | 'readwrite' | 'versionchange';
  private _aborted: boolean = false;
  private _committed: boolean = false;
  private _pendingRequests: number = 0;
  private _error: DOMException | null = null;
  private _snapshot: Map<
    string,
    Map<string, { key: IDBValidKey; value: unknown }>
  > | null = null;

  private _oncomplete:
    | ((event: { type: string; target: IDBTransaction }) => void)
    | null = null;
  private _onabort:
    | ((event: { type: string; target: IDBTransaction }) => void)
    | null = null;
  private _onerror:
    | ((event: { type: string; target: IDBTransaction }) => void)
    | null = null;
  private _listeners: Map<
    string,
    Array<(event: { type: string; target: IDBTransaction }) => void>
  > = new Map();

  /** @internal */
  constructor(
    db: IDBDatabase,
    storeNames: string[],
    mode: 'readonly' | 'readwrite' | 'versionchange',
  ) {
    this._db = db;
    this._storeNames = storeNames;
    this._mode = mode;
    // Take snapshot for rollback on abort (readwrite/versionchange only)
    if (mode === 'readwrite' || mode === 'versionchange') {
      this._snapshot = new Map();
      for (const name of storeNames) {
        const storeData = db._getStoreData(name);
        if (storeData) {
          const cloned = new Map<
            string,
            { key: IDBValidKey; value: unknown }
          >();
          for (const [k, v] of storeData.records) {
            cloned.set(k, { key: v.key, value: deepClone(v.value) });
          }
          this._snapshot.set(name, cloned);
        }
      }
    }
  }

  get db(): IDBDatabase {
    return this._db;
  }

  get mode(): 'readonly' | 'readwrite' | 'versionchange' {
    return this._mode;
  }

  get error(): DOMException | null {
    return this._error;
  }

  get objectStoreNames(): DOMStringListImpl {
    const list = new DOMStringListImpl();
    for (const name of this._storeNames) {
      list._add(name);
    }
    return list;
  }

  get oncomplete():
    | ((event: { type: string; target: IDBTransaction }) => void)
    | null {
    return this._oncomplete;
  }

  set oncomplete(
    handler: ((event: { type: string; target: IDBTransaction }) => void) | null,
  ) {
    this._oncomplete = handler;
  }

  get onabort():
    | ((event: { type: string; target: IDBTransaction }) => void)
    | null {
    return this._onabort;
  }

  set onabort(
    handler: ((event: { type: string; target: IDBTransaction }) => void) | null,
  ) {
    this._onabort = handler;
  }

  get onerror():
    | ((event: { type: string; target: IDBTransaction }) => void)
    | null {
    return this._onerror;
  }

  set onerror(
    handler: ((event: { type: string; target: IDBTransaction }) => void) | null,
  ) {
    this._onerror = handler;
  }

  addEventListener(
    type: string,
    listener: (event: { type: string; target: IDBTransaction }) => void,
  ): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: { type: string; target: IDBTransaction }) => void,
  ): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  objectStore(name: string): IDBObjectStore {
    if (!this._storeNames.includes(name)) {
      throw new DOMException(
        `Object store "${name}" not in this transaction`,
        'NotFoundError',
      );
    }
    const storeData = this._db._getStoreData(name);
    if (!storeData) {
      throw new DOMException(
        `Object store "${name}" not found`,
        'NotFoundError',
      );
    }
    return new IDBObjectStore(storeData, this);
  }

  abort(): void {
    if (this._aborted || this._committed) return;
    this._aborted = true;
    // Rollback
    if (this._snapshot) {
      for (const [storeName, records] of this._snapshot) {
        const storeData = this._db._getStoreData(storeName);
        if (storeData) {
          storeData.records.clear();
          for (const [k, v] of records) {
            storeData.records.set(k, { key: v.key, value: deepClone(v.value) });
          }
        }
      }
    }
    this._fireEvent('abort');
  }

  /** @internal */
  _addPendingRequest(): void {
    this._pendingRequests++;
  }

  /** @internal */
  _requestCompleted(): void {
    this._pendingRequests--;
    if (this._pendingRequests <= 0 && !this._aborted && !this._committed) {
      this._committed = true;
      queueMicrotask(() => {
        this._fireEvent('complete');
      });
    }
  }

  private _fireEvent(type: string): void {
    const event = { type, target: this };
    const listeners = this._listeners.get(type) ?? [];
    for (const listener of listeners) {
      listener(event);
    }
    if (type === 'complete' && this._oncomplete) this._oncomplete(event);
    if (type === 'abort' && this._onabort) this._onabort(event);
    if (type === 'error' && this._onerror) this._onerror(event);
  }
}

/**
 * IDBDatabase — represents a connection to a database.
 */
export class IDBDatabase {
  private _name: string;
  private _version: number;
  private _stores: Map<string, ObjectStoreData> = new Map();
  private _closed: boolean = false;
  private _onversionchange:
    | ((event: {
        type: string;
        target: IDBDatabase;
        oldVersion: number;
        newVersion: number | null;
      }) => void)
    | null = null;
  private _listeners: Map<
    string,
    Array<(event: { type: string; target: IDBDatabase }) => void>
  > = new Map();

  /** @internal */
  constructor(name: string, version: number) {
    this._name = name;
    this._version = version;
  }

  get name(): string {
    return this._name;
  }

  get version(): number {
    return this._version;
  }

  get objectStoreNames(): DOMStringListImpl {
    const list = new DOMStringListImpl();
    for (const name of this._stores.keys()) {
      list._add(name);
    }
    return list;
  }

  get onversionchange():
    | ((event: {
        type: string;
        target: IDBDatabase;
        oldVersion: number;
        newVersion: number | null;
      }) => void)
    | null {
    return this._onversionchange;
  }

  set onversionchange(
    handler:
      | ((event: {
          type: string;
          target: IDBDatabase;
          oldVersion: number;
          newVersion: number | null;
        }) => void)
      | null,
  ) {
    this._onversionchange = handler;
  }

  addEventListener(
    type: string,
    listener: (event: { type: string; target: IDBDatabase }) => void,
  ): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: { type: string; target: IDBDatabase }) => void,
  ): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  createObjectStore(
    name: string,
    options?: { keyPath?: string | null; autoIncrement?: boolean },
  ): IDBObjectStore {
    if (this._stores.has(name)) {
      throw new DOMException(
        `Object store "${name}" already exists`,
        'ConstraintError',
      );
    }
    const storeData: ObjectStoreData = {
      name,
      keyPath: options?.keyPath ?? null,
      autoIncrement: options?.autoIncrement ?? false,
      currentKey: 1,
      records: new Map(),
      indexes: new Map(),
    };
    this._stores.set(name, storeData);
    // Create a versionchange transaction context for the store
    const allStoreNames = [...this._stores.keys()];
    const tx = new IDBTransaction(this, allStoreNames, 'versionchange');
    return new IDBObjectStore(storeData, tx);
  }

  deleteObjectStore(name: string): void {
    if (!this._stores.has(name)) {
      throw new DOMException(
        `Object store "${name}" not found`,
        'NotFoundError',
      );
    }
    this._stores.delete(name);
  }

  transaction(
    storeNames: string | string[],
    mode?: 'readonly' | 'readwrite',
  ): IDBTransaction {
    if (this._closed) {
      throw new DOMException('Database is closed', 'InvalidStateError');
    }
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    for (const name of names) {
      if (!this._stores.has(name)) {
        throw new DOMException(
          `Object store "${name}" not found`,
          'NotFoundError',
        );
      }
    }
    return new IDBTransaction(this, names, mode ?? 'readonly');
  }

  close(): void {
    this._closed = true;
  }

  /** @internal */
  _getStoreData(name: string): ObjectStoreData | undefined {
    return this._stores.get(name);
  }

  /** @internal */
  _setVersion(version: number): void {
    this._version = version;
  }

  /** @internal */
  _isClosed(): boolean {
    return this._closed;
  }

  /** @internal */
  _fireVersionChange(oldVersion: number, newVersion: number | null): void {
    const event = {
      type: 'versionchange',
      target: this,
      oldVersion,
      newVersion,
    };
    const listeners = this._listeners.get('versionchange') ?? [];
    for (const listener of listeners) {
      (
        listener as (event: {
          type: string;
          target: IDBDatabase;
          oldVersion: number;
          newVersion: number | null;
        }) => void
      )(event);
    }
    if (this._onversionchange) {
      this._onversionchange(event);
    }
  }
}

/**
 * IDBFactory — the top-level IndexedDB API (exposed as window.indexedDB).
 */
export class IDBFactory {
  private _databases: Map<
    string,
    { version: number; stores: Map<string, ObjectStoreData> }
  > = new Map();
  private _connections: Map<string, Set<IDBDatabase>> = new Map();

  open(name: string, version?: number): IDBOpenDBRequest {
    const request = new IDBOpenDBRequest();
    const requestedVersion = version ?? 1;

    queueMicrotask(() => {
      const existing = this._databases.get(name);
      const oldVersion = existing?.version ?? 0;

      // Create database entry if it doesn't exist
      if (!existing) {
        this._databases.set(name, {
          version: requestedVersion,
          stores: new Map(),
        });
      }

      const dbData = this._databases.get(name)!;

      // Create the IDBDatabase instance
      const db = new IDBDatabase(name, requestedVersion);

      // Restore existing stores
      for (const [storeName, storeData] of dbData.stores) {
        const clonedData: ObjectStoreData = {
          ...storeData,
          records: new Map(storeData.records),
          indexes: new Map(storeData.indexes),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db as any)._stores.set(storeName, clonedData);
      }

      // Track connection
      if (!this._connections.has(name)) {
        this._connections.set(name, new Set());
      }
      this._connections.get(name)!.add(db);

      request.result = db;
      request.source = this;

      if (requestedVersion > oldVersion) {
        // Fire versionchange on existing connections
        const existingConns = this._connections.get(name);
        if (existingConns) {
          for (const conn of existingConns) {
            if (conn !== db && !conn._isClosed()) {
              conn._fireVersionChange(oldVersion, requestedVersion);
            }
          }
        }

        db._setVersion(requestedVersion);
        dbData.version = requestedVersion;
        request._fireUpgradeNeeded(oldVersion, requestedVersion);

        // After upgrade, sync stores back to factory storage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbStores = (db as any)._stores as Map<string, ObjectStoreData>;
        dbData.stores = new Map();
        for (const [sn, sd] of dbStores) {
          dbData.stores.set(sn, sd);
        }
      }

      request._fireSuccess(db);
    });

    return request;
  }

  deleteDatabase(name: string): IDBOpenDBRequest {
    const request = new IDBOpenDBRequest();

    queueMicrotask(() => {
      const existing = this._databases.get(name);
      const oldVersion = existing?.version ?? 0;

      // Fire versionchange on existing connections
      const existingConns = this._connections.get(name);
      if (existingConns) {
        for (const conn of existingConns) {
          conn._fireVersionChange(oldVersion, null);
        }
        existingConns.clear();
      }

      this._databases.delete(name);
      request._fireSuccess(undefined);
    });

    return request;
  }

  databases(): Promise<Array<{ name: string; version: number }>> {
    const result: Array<{ name: string; version: number }> = [];
    for (const [name, data] of this._databases) {
      result.push({ name, version: data.version });
    }
    return Promise.resolve(result);
  }
}
