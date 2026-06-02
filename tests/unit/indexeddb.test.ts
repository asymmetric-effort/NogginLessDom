import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  IDBFactory,
  IDBDatabase,
  IDBKeyRange,
  IDBRequest,
  IDBOpenDBRequest,
  IDBObjectStore,
  IDBTransaction,
  IDBIndex,
  IDBCursor,
} from '../../src/dom/indexeddb.js';
import { Window } from '../../src/dom/window.js';

/**
 * Helper: open a database, run a setup callback during upgradeneeded,
 * then resolve with the IDBDatabase.
 */
function openDB(
  factory: IDBFactory,
  name: string,
  version: number,
  onUpgrade?: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = (event) => {
      const db = event.target.result as IDBDatabase;
      if (onUpgrade) onUpgrade(db);
    };
    request.onsuccess = (event) => {
      resolve(event.target.result as IDBDatabase);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Helper: perform a request and return its result via a promise.
 */
function requestToPromise<T = unknown>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = (event) => resolve(event.target.result as T);
    req.onerror = (event) => reject(event.target.error);
  });
}

describe('IndexedDB', () => {
  describe('IDBFactory', () => {
    it('open creates database', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'testDB', 1);
      assert.ok(db instanceof IDBDatabase);
      assert.strictEqual(db.name, 'testDB');
      assert.strictEqual(db.version, 1);
    });

    it('version upgrade triggers upgradeneeded', async () => {
      const factory = new IDBFactory();
      let upgradeTriggered = false;
      let capturedOldVersion = -1;
      let capturedNewVersion: number | null = -1;

      const db = await openDB(factory, 'upgradeDB', 2, () => {
        upgradeTriggered = true;
      });

      // Close and reopen with higher version
      db.close();

      await new Promise<void>((resolve) => {
        const request = factory.open('upgradeDB', 3);
        request.onupgradeneeded = (event) => {
          capturedOldVersion = event.oldVersion;
          capturedNewVersion = event.newVersion;
        };
        request.onsuccess = () => resolve();
      });

      assert.ok(upgradeTriggered);
      assert.strictEqual(capturedOldVersion, 2);
      assert.strictEqual(capturedNewVersion, 3);
    });

    it('deleteDatabase removes database', async () => {
      const factory = new IDBFactory();
      await openDB(factory, 'toDelete', 1);

      const dbs = await factory.databases();
      assert.strictEqual(dbs.length, 1);
      assert.strictEqual(dbs[0]!.name, 'toDelete');

      await new Promise<void>((resolve) => {
        const req = factory.deleteDatabase('toDelete');
        req.onsuccess = () => resolve();
      });

      const dbsAfter = await factory.databases();
      assert.strictEqual(dbsAfter.length, 0);
    });

    it('databases() lists all databases', async () => {
      const factory = new IDBFactory();
      await openDB(factory, 'db1', 1);
      await openDB(factory, 'db2', 2);
      await openDB(factory, 'db3', 3);

      const dbs = await factory.databases();
      assert.strictEqual(dbs.length, 3);
      const names = dbs.map((d) => d.name).sort();
      assert.deepStrictEqual(names, ['db1', 'db2', 'db3']);
      const db2 = dbs.find((d) => d.name === 'db2');
      assert.strictEqual(db2!.version, 2);
    });
  });

  describe('IDBDatabase', () => {
    it('createObjectStore with keyPath', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'kpDB', 1, (db) => {
        const store = db.createObjectStore('users', { keyPath: 'id' });
        assert.ok(store instanceof IDBObjectStore);
        assert.strictEqual(store.keyPath, 'id');
        assert.strictEqual(store.autoIncrement, false);
      });
      assert.ok(db.objectStoreNames.contains('users'));
    });

    it('createObjectStore with autoIncrement', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'aiDB', 1, (db) => {
        const store = db.createObjectStore('items', { autoIncrement: true });
        assert.ok(store.autoIncrement);
        assert.strictEqual(store.keyPath, null);
      });
      assert.ok(db.objectStoreNames.contains('items'));
    });

    it('deleteObjectStore removes store', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'delStoreDB', 1, (db) => {
        db.createObjectStore('toRemove');
        db.createObjectStore('toKeep');
      });
      assert.ok(db.objectStoreNames.contains('toRemove'));

      db.close();
      const db2 = await openDB(factory, 'delStoreDB', 2, (db) => {
        db.deleteObjectStore('toRemove');
      });
      assert.ok(!db2.objectStoreNames.contains('toRemove'));
      assert.ok(db2.objectStoreNames.contains('toKeep'));
    });

    it('close fires versionchange on reopen', async () => {
      const factory = new IDBFactory();
      let versionChangeFired = false;

      const db1 = await openDB(factory, 'vcDB', 1);
      db1.onversionchange = () => {
        versionChangeFired = true;
        db1.close();
      };

      // Reopen with higher version
      await openDB(factory, 'vcDB', 2);
      assert.ok(versionChangeFired);
    });

    it('transaction throws when database is closed', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'closedDB', 1, (db) => {
        db.createObjectStore('store');
      });
      db.close();
      assert.throws(() => {
        db.transaction('store');
      }, /closed/i);
    });
  });

  describe('IDBObjectStore CRUD', () => {
    it('put and get roundtrip', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'crudDB', 1, (db) => {
        db.createObjectStore('users', { keyPath: 'id' });
      });

      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      await requestToPromise(store.put({ id: 1, name: 'Alice' }));
      const result = await requestToPromise(store.get(1));
      assert.deepStrictEqual(result, { id: 1, name: 'Alice' });
    });

    it('add with duplicate key fails', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'dupDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.add({ id: 1, value: 'first' }));

      await assert.rejects(
        requestToPromise(store.add({ id: 1, value: 'second' })),
        (err: DOMException) => {
          assert.ok(err.message.includes('already exists'));
          return true;
        },
      );
    });

    it('getAll returns all records', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'getAllDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, name: 'A' }));
      await requestToPromise(store.put({ id: 2, name: 'B' }));
      await requestToPromise(store.put({ id: 3, name: 'C' }));

      const all = (await requestToPromise(store.getAll())) as unknown[];
      assert.strictEqual(all.length, 3);
    });

    it('delete removes record', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'deleteDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, name: 'A' }));
      await requestToPromise(store.put({ id: 2, name: 'B' }));
      await requestToPromise(store.delete(1));

      const result = await requestToPromise(store.get(1));
      assert.strictEqual(result, undefined);

      const remaining = (await requestToPromise(store.getAll())) as unknown[];
      assert.strictEqual(remaining.length, 1);
    });

    it('clear removes all records', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'clearDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, name: 'A' }));
      await requestToPromise(store.put({ id: 2, name: 'B' }));
      await requestToPromise(store.clear());

      const count = (await requestToPromise(store.count())) as number;
      assert.strictEqual(count, 0);
    });

    it('count returns correct count', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'countDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1 }));
      await requestToPromise(store.put({ id: 2 }));
      await requestToPromise(store.put({ id: 3 }));

      const count = (await requestToPromise(store.count())) as number;
      assert.strictEqual(count, 3);
    });

    it('autoIncrement assigns keys automatically', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'autoIncDB', 1, (db) => {
        db.createObjectStore('items', { autoIncrement: true });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      const k1 = await requestToPromise(store.add({ name: 'first' }));
      const k2 = await requestToPromise(store.add({ name: 'second' }));
      assert.strictEqual(k1, 1);
      assert.strictEqual(k2, 2);
    });

    it('nested keyPath extraction (address.city)', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'nestedDB', 1, (db) => {
        db.createObjectStore('people', { keyPath: 'info.id' });
      });

      const tx = db.transaction('people', 'readwrite');
      const store = tx.objectStore('people');
      await requestToPromise(
        store.put({ info: { id: 42, name: 'Alice' }, city: 'NYC' }),
      );

      const result = (await requestToPromise(store.get(42))) as {
        info: { id: number; name: string };
        city: string;
      };
      assert.strictEqual(result.info.id, 42);
      assert.strictEqual(result.info.name, 'Alice');
    });
  });

  describe('IDBIndex', () => {
    it('createIndex and query by index', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'indexDB', 1, (db) => {
        const store = db.createObjectStore('users', { keyPath: 'id' });
        store.createIndex('byName', 'name');
      });

      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      await requestToPromise(store.put({ id: 1, name: 'Alice' }));
      await requestToPromise(store.put({ id: 2, name: 'Bob' }));
      await requestToPromise(store.put({ id: 3, name: 'Alice' }));

      const idx = store.index('byName');
      assert.ok(idx instanceof IDBIndex);
      assert.strictEqual(idx.name, 'byName');
      assert.strictEqual(idx.keyPath, 'name');

      const result = (await requestToPromise(idx.get('Alice'))) as {
        id: number;
        name: string;
      };
      assert.strictEqual(result.name, 'Alice');

      const all = (await requestToPromise(idx.getAll('Alice'))) as Array<{
        id: number;
        name: string;
      }>;
      assert.strictEqual(all.length, 2);

      const count = (await requestToPromise(idx.count('Bob'))) as number;
      assert.strictEqual(count, 1);
    });

    it('unique index prevents duplicates', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'uniqueIdxDB', 1, (db) => {
        const store = db.createObjectStore('users', { keyPath: 'id' });
        store.createIndex('byEmail', 'email', { unique: true });
      });

      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      await requestToPromise(store.put({ id: 1, email: 'alice@test.com' }));

      await assert.rejects(
        requestToPromise(store.add({ id: 2, email: 'alice@test.com' })),
        (err: DOMException) => {
          assert.ok(err.message.includes('Unique index'));
          return true;
        },
      );
    });

    it('deleteIndex removes index', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'delIdxDB', 1, (db) => {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('byVal', 'val');
        assert.ok(store.indexNames.contains('byVal'));
        store.deleteIndex('byVal');
        assert.ok(!store.indexNames.contains('byVal'));
      });
      assert.ok(db);
    });

    it('index not found throws', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'noIdxDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });
      const tx = db.transaction('items');
      const store = tx.objectStore('items');
      assert.throws(() => {
        store.index('nonexistent');
      }, /not found/i);
    });
  });

  describe('IDBKeyRange', () => {
    it('only matches exact value', () => {
      const range = IDBKeyRange.only(5);
      assert.ok(range.includes(5));
      assert.ok(!range.includes(4));
      assert.ok(!range.includes(6));
    });

    it('lowerBound matches values >= lower', () => {
      const range = IDBKeyRange.lowerBound(3);
      assert.ok(range.includes(3));
      assert.ok(range.includes(4));
      assert.ok(!range.includes(2));
    });

    it('lowerBound open excludes lower', () => {
      const range = IDBKeyRange.lowerBound(3, true);
      assert.ok(!range.includes(3));
      assert.ok(range.includes(4));
    });

    it('upperBound matches values <= upper', () => {
      const range = IDBKeyRange.upperBound(7);
      assert.ok(range.includes(7));
      assert.ok(range.includes(6));
      assert.ok(!range.includes(8));
    });

    it('upperBound open excludes upper', () => {
      const range = IDBKeyRange.upperBound(7, true);
      assert.ok(!range.includes(7));
      assert.ok(range.includes(6));
    });

    it('bound matches within range', () => {
      const range = IDBKeyRange.bound(3, 7);
      assert.ok(range.includes(3));
      assert.ok(range.includes(5));
      assert.ok(range.includes(7));
      assert.ok(!range.includes(2));
      assert.ok(!range.includes(8));
    });

    it('bound with open ends excludes endpoints', () => {
      const range = IDBKeyRange.bound(3, 7, true, true);
      assert.ok(!range.includes(3));
      assert.ok(range.includes(5));
      assert.ok(!range.includes(7));
    });

    it('works with string keys', () => {
      const range = IDBKeyRange.bound('b', 'd');
      assert.ok(range.includes('b'));
      assert.ok(range.includes('c'));
      assert.ok(!range.includes('a'));
      assert.ok(!range.includes('e'));
    });

    it('getAll with key range', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'rangeDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      for (let i = 1; i <= 5; i++) {
        await requestToPromise(store.put({ id: i, name: `item${i}` }));
      }

      const range = IDBKeyRange.bound(2, 4);
      const results = (await requestToPromise(store.getAll(range))) as Array<{
        id: number;
      }>;
      assert.strictEqual(results.length, 3);
      assert.deepStrictEqual(
        results.map((r) => r.id),
        [2, 3, 4],
      );
    });
  });

  describe('IDBCursor', () => {
    it('cursor iteration', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'cursorDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, name: 'A' }));
      await requestToPromise(store.put({ id: 2, name: 'B' }));
      await requestToPromise(store.put({ id: 3, name: 'C' }));

      const collected: Array<{
        id: number;
        name: string;
        key: unknown;
        pk: unknown;
        src: unknown;
        dir: string;
      }> = [];
      await new Promise<void>((resolve) => {
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            collected.push({
              ...(cursor.value as { id: number; name: string }),
              key: cursor.key,
              pk: cursor.primaryKey,
              src: cursor.source,
              dir: cursor.direction,
            });
            cursor.continue();
          } else {
            resolve();
          }
        };
      });

      assert.strictEqual(collected.length, 3);
      assert.strictEqual(collected[0]!.key, 1);
      assert.strictEqual(collected[0]!.pk, 1);
      assert.ok(collected[0]!.src instanceof IDBObjectStore);
      assert.strictEqual(collected[0]!.dir, 'next');
      assert.deepStrictEqual(
        collected.map((c) => c.id),
        [1, 2, 3],
      );
    });

    it('cursor advance', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'advanceDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      for (let i = 1; i <= 5; i++) {
        await requestToPromise(store.put({ id: i }));
      }

      const collected: number[] = [];
      await new Promise<void>((resolve) => {
        const cursorReq = store.openCursor();
        let first = true;
        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            collected.push((cursor.value as { id: number }).id);
            if (first) {
              first = false;
              cursor.advance(2); // skip to 3rd record
            } else {
              cursor.continue();
            }
          } else {
            resolve();
          }
        };
      });

      // First value is 1, then advance(2) skips to position 3 (id=3), then 4, 5
      assert.deepStrictEqual(collected, [1, 3, 4, 5]);
    });

    it('cursor delete', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'curDelDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, name: 'A' }));
      await requestToPromise(store.put({ id: 2, name: 'B' }));

      // Delete via cursor
      await new Promise<void>((resolve) => {
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor && (cursor.value as { id: number }).id === 1) {
            cursor.delete();
            cursor.continue();
          } else if (cursor) {
            cursor.continue();
          } else {
            resolve();
          }
        };
      });

      const all = (await requestToPromise(store.getAll())) as unknown[];
      assert.strictEqual(all.length, 1);
    });

    it('cursor update', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'curUpdDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, name: 'old' }));

      await new Promise<void>((resolve) => {
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            cursor.update({ id: 1, name: 'new' });
            cursor.continue();
          } else {
            resolve();
          }
        };
      });

      const result = (await requestToPromise(store.get(1))) as {
        id: number;
        name: string;
      };
      assert.strictEqual(result.name, 'new');
    });

    it('cursor on index', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'curIdxDB', 1, (db) => {
        const store = db.createObjectStore('users', { keyPath: 'id' });
        store.createIndex('byAge', 'age');
      });

      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      await requestToPromise(store.put({ id: 1, name: 'Alice', age: 30 }));
      await requestToPromise(store.put({ id: 2, name: 'Bob', age: 25 }));

      const idx = store.index('byAge');
      const collected: string[] = [];
      await new Promise<void>((resolve) => {
        const cursorReq = idx.openCursor();
        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            collected.push((cursor.value as { name: string }).name);
            cursor.continue();
          } else {
            resolve();
          }
        };
      });

      // Sorted by age: Bob (25) then Alice (30)
      assert.deepStrictEqual(collected, ['Bob', 'Alice']);
    });
  });

  describe('IDBTransaction', () => {
    it('transaction auto-commit', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'autoCommitDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      let completed = false;
      const tx = db.transaction('items', 'readwrite');
      tx.oncomplete = () => {
        completed = true;
      };

      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1 }));

      // Wait for auto-commit
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 10);
      });
      assert.ok(completed);
    });

    it('transaction abort rolls back', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'abortDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      // First add an item in tx1
      const tx1 = db.transaction('items', 'readwrite');
      const store1 = tx1.objectStore('items');
      await requestToPromise(store1.put({ id: 1, name: 'original' }));

      // Wait for tx1 to complete
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 10);
      });

      // Start tx2, set abort handler BEFORE operations, then abort immediately
      const tx2 = db.transaction('items', 'readwrite');
      let aborted = false;
      tx2.onabort = () => {
        aborted = true;
      };
      // Abort before any async operations run
      tx2.abort();

      assert.ok(aborted);

      // Verify rollback: original data should be restored
      const tx3 = db.transaction('items');
      const store3 = tx3.objectStore('items');
      const result = (await requestToPromise(store3.get(1))) as {
        id: number;
        name: string;
      };
      assert.strictEqual(result.name, 'original');
    });

    it('multiple object stores in one transaction', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'multiStoreDB', 1, (db) => {
        db.createObjectStore('users', { keyPath: 'id' });
        db.createObjectStore('orders', { keyPath: 'id' });
      });

      const tx = db.transaction(['users', 'orders'], 'readwrite');
      const userStore = tx.objectStore('users');
      const orderStore = tx.objectStore('orders');

      await requestToPromise(userStore.put({ id: 1, name: 'Alice' }));
      await requestToPromise(
        orderStore.put({ id: 100, userId: 1, item: 'Widget' }),
      );

      const user = (await requestToPromise(userStore.get(1))) as {
        id: number;
        name: string;
      };
      const order = (await requestToPromise(orderStore.get(100))) as {
        id: number;
        item: string;
      };

      assert.strictEqual(user.name, 'Alice');
      assert.strictEqual(order.item, 'Widget');
    });

    it('objectStore not in transaction throws', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'notInTxDB', 1, (db) => {
        db.createObjectStore('store1', { keyPath: 'id' });
        db.createObjectStore('store2', { keyPath: 'id' });
      });

      const tx = db.transaction('store1');
      assert.throws(() => {
        tx.objectStore('store2');
      }, /not in this transaction/i);
    });

    it('transaction mode is reported correctly', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'modeDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const roTx = db.transaction('items', 'readonly');
      assert.strictEqual(roTx.mode, 'readonly');
      assert.strictEqual(roTx.db, db);

      const rwTx = db.transaction('items', 'readwrite');
      assert.strictEqual(rwTx.mode, 'readwrite');
    });

    it('addEventListener works for complete event', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'listenerDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      let completeFired = false;
      const tx = db.transaction('items', 'readwrite');
      tx.addEventListener('complete', () => {
        completeFired = true;
      });

      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1 }));

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 10);
      });
      assert.ok(completeFired);
    });
  });

  describe('IDBRequest', () => {
    it('request readyState transitions', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'readyStateDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      const req = store.put({ id: 1 });

      assert.ok(req instanceof IDBRequest);
      assert.strictEqual(req.readyState, 'pending');

      await requestToPromise(req);
      assert.strictEqual(req.readyState, 'done');
    });

    it('request source and transaction are set', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'srcDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      const req = store.put({ id: 1 });

      assert.ok(req.source instanceof IDBObjectStore);
      assert.ok(req.transaction instanceof IDBTransaction);
    });

    it('addEventListener and removeEventListener work', async () => {
      const req = new IDBRequest();
      let count = 0;
      const handler = () => {
        count++;
      };

      req.addEventListener('success', handler);
      req._fireSuccess('test');
      assert.strictEqual(count, 1);

      req.removeEventListener('success', handler);
      // Create a new request to test removal
      const req2 = new IDBRequest();
      const handler2 = () => {
        count++;
      };
      req2.addEventListener('success', handler2);
      req2.removeEventListener('success', handler2);
      req2._fireSuccess('test');
      assert.strictEqual(count, 1); // should not have incremented
    });
  });

  describe('IDBOpenDBRequest', () => {
    it('extends IDBRequest', () => {
      const req = new IDBOpenDBRequest();
      assert.ok(req instanceof IDBRequest);
      assert.ok(req instanceof IDBOpenDBRequest);
    });

    it('addEventListener for upgradeneeded', async () => {
      const factory = new IDBFactory();
      let upgradeViaListener = false;

      await new Promise<void>((resolve) => {
        const req = factory.open('listenerUpgradeDB', 1);
        req.addEventListener('upgradeneeded', () => {
          upgradeViaListener = true;
        });
        req.onsuccess = () => resolve();
      });

      assert.ok(upgradeViaListener);
    });

    it('blocked event fires', async () => {
      const req = new IDBOpenDBRequest();
      let blockedFired = false;
      req.onblocked = () => {
        blockedFired = true;
      };
      req._fireBlocked();
      assert.ok(blockedFired);
    });
  });

  describe('Window integration', () => {
    it('window.indexedDB returns IDBFactory', () => {
      const win = new Window();
      assert.ok(win.indexedDB instanceof IDBFactory);
    });

    it('window.indexedDB is usable', async () => {
      const win = new Window();
      const db = await openDB(win.indexedDB, 'winDB', 1, (db) => {
        db.createObjectStore('store', { keyPath: 'id' });
      });
      assert.strictEqual(db.name, 'winDB');
    });
  });

  describe('Edge cases', () => {
    it('put overwrites existing record', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'overwriteDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, name: 'old' }));
      await requestToPromise(store.put({ id: 1, name: 'new' }));

      const result = (await requestToPromise(store.get(1))) as {
        id: number;
        name: string;
      };
      assert.strictEqual(result.name, 'new');
    });

    it('autoIncrement with keyPath sets key on object', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'autoKpDB', 1, (db) => {
        db.createObjectStore('items', {
          keyPath: 'id',
          autoIncrement: true,
        });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.add({ name: 'test' }));

      const all = (await requestToPromise(store.getAll())) as Array<{
        id: number;
        name: string;
      }>;
      assert.strictEqual(all.length, 1);
      assert.strictEqual(all[0]!.id, 1);
      assert.strictEqual(all[0]!.name, 'test');
    });

    it('getAll with count limit', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'limitDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      for (let i = 1; i <= 10; i++) {
        await requestToPromise(store.put({ id: i }));
      }

      const results = (await requestToPromise(
        store.getAll(null, 3),
      )) as unknown[];
      assert.strictEqual(results.length, 3);
    });

    it('delete with key range', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'delRangeDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      for (let i = 1; i <= 5; i++) {
        await requestToPromise(store.put({ id: i }));
      }

      const range = IDBKeyRange.bound(2, 4);
      await requestToPromise(store.delete(range));

      const all = (await requestToPromise(store.getAll())) as Array<{
        id: number;
      }>;
      assert.strictEqual(all.length, 2);
      assert.deepStrictEqual(
        all.map((a) => a.id),
        [1, 5],
      );
    });

    it('get with key range', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'getRangeDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1 }));
      await requestToPromise(store.put({ id: 5 }));

      const range = IDBKeyRange.lowerBound(3);
      const result = (await requestToPromise(store.get(range))) as {
        id: number;
      };
      assert.strictEqual(result.id, 5);
    });

    it('count with query', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'countQDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      for (let i = 1; i <= 5; i++) {
        await requestToPromise(store.put({ id: i }));
      }

      const range = IDBKeyRange.bound(2, 4);
      const count = (await requestToPromise(store.count(range))) as number;
      assert.strictEqual(count, 3);

      const exactCount = (await requestToPromise(store.count(3))) as number;
      assert.strictEqual(exactCount, 1);
    });

    it('DOMStringList methods work', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'dslDB', 1, (db) => {
        db.createObjectStore('a');
        db.createObjectStore('b');
        db.createObjectStore('c');
      });

      const names = db.objectStoreNames;
      assert.strictEqual(names.length, 3);
      assert.ok(names.contains('a'));
      assert.ok(!names.contains('d'));
      assert.strictEqual(names.item(0), 'a');
      assert.strictEqual(names.item(99), null);

      // Iterable
      const arr: string[] = [];
      for (const name of names) {
        arr.push(name);
      }
      assert.strictEqual(arr.length, 3);
    });

    it('createObjectStore duplicate throws', async () => {
      const factory = new IDBFactory();
      await openDB(factory, 'dupStoreDB', 1, (db) => {
        db.createObjectStore('store');
        assert.throws(() => {
          db.createObjectStore('store');
        }, /already exists/i);
      });
    });

    it('createIndex duplicate throws', async () => {
      const factory = new IDBFactory();
      await openDB(factory, 'dupIdxDB', 1, (db) => {
        const store = db.createObjectStore('store', { keyPath: 'id' });
        store.createIndex('idx', 'name');
        assert.throws(() => {
          store.createIndex('idx', 'other');
        }, /already exists/i);
      });
    });

    it('deleteIndex not found throws', async () => {
      const factory = new IDBFactory();
      await openDB(factory, 'delIdxNotFoundDB', 1, (db) => {
        const store = db.createObjectStore('store', { keyPath: 'id' });
        assert.throws(() => {
          store.deleteIndex('nope');
        }, /not found/i);
      });
    });

    it('deleteObjectStore not found throws', async () => {
      const factory = new IDBFactory();
      await openDB(factory, 'delStoreNotFoundDB', 1, (db) => {
        assert.throws(() => {
          db.deleteObjectStore('nope');
        }, /not found/i);
      });
    });

    it('transaction on non-existent store throws', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'noStoreDB', 1, (db) => {
        db.createObjectStore('real');
      });
      assert.throws(() => {
        db.transaction('fake');
      }, /not found/i);
    });

    it('open cursor on empty store returns null', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'emptyCursorDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items');
      const store = tx.objectStore('items');
      const result = await new Promise<unknown>((resolve) => {
        const req = store.openCursor();
        req.onsuccess = (event) => resolve(event.target.result);
      });
      assert.strictEqual(result, null);
    });

    it('index openCursor on empty store returns null', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'emptyIdxCursorDB', 1, (db) => {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('byName', 'name');
      });

      const tx = db.transaction('items');
      const store = tx.objectStore('items');
      const idx = store.index('byName');
      const result = await new Promise<unknown>((resolve) => {
        const req = idx.openCursor();
        req.onsuccess = (event) => resolve(event.target.result);
      });
      assert.strictEqual(result, null);
    });

    it('cursor advance with invalid count throws', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'advBadDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1 }));

      await new Promise<void>((resolve) => {
        const req = store.openCursor();
        req.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            assert.throws(() => {
              cursor.advance(0);
            }, /positive/);
            resolve();
          }
        };
      });
    });

    it('data is deep cloned on put and get', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'cloneDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      const original = { id: 1, nested: { val: 'hello' } };
      await requestToPromise(store.put(original));

      // Mutate original — stored data should not be affected
      original.nested.val = 'mutated';

      const result = (await requestToPromise(store.get(1))) as {
        id: number;
        nested: { val: string };
      };
      assert.strictEqual(result.nested.val, 'hello');
    });

    it('IDBRequest error event handler', () => {
      const req = new IDBRequest();
      let errorFired = false;
      req.onerror = () => {
        errorFired = true;
      };
      req._fireError(new DOMException('test error'));
      assert.ok(errorFired);
      assert.strictEqual(req.error!.message, 'test error');
    });

    it('IDBRequest getter returns onsuccess handler', () => {
      const req = new IDBRequest();
      assert.strictEqual(req.onsuccess, null);
      const fn = () => {};
      req.onsuccess = fn;
      assert.strictEqual(req.onsuccess, fn);
    });

    it('IDBRequest getter returns onerror handler', () => {
      const req = new IDBRequest();
      assert.strictEqual(req.onerror, null);
      const fn = () => {};
      req.onerror = fn;
      assert.strictEqual(req.onerror, fn);
    });

    it('IDBOpenDBRequest getter returns onblocked handler', () => {
      const req = new IDBOpenDBRequest();
      assert.strictEqual(req.onblocked, null);
      const fn = () => {};
      req.onblocked = fn;
      assert.strictEqual(req.onblocked, fn);
    });

    it('IDBOpenDBRequest getter returns onupgradeneeded handler', () => {
      const req = new IDBOpenDBRequest();
      assert.strictEqual(req.onupgradeneeded, null);
      const fn = () => {};
      req.onupgradeneeded = fn;
      assert.strictEqual(req.onupgradeneeded, fn);
    });

    it('IDBOpenDBRequest removeEventListener works', () => {
      const req = new IDBOpenDBRequest();
      let count = 0;
      const handler = () => {
        count++;
      };
      req.addEventListener('upgradeneeded', handler);
      req.removeEventListener('upgradeneeded', handler);
      req._fireUpgradeNeeded(0, 1);
      assert.strictEqual(count, 0);
    });

    it('IDBIndex unique and multiEntry getters', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'idxPropsDB', 1, (db) => {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('byVal', 'val', {
          unique: true,
          multiEntry: true,
        });
      });
      const tx = db.transaction('items');
      const store = tx.objectStore('items');
      const idx = store.index('byVal');
      assert.strictEqual(idx.unique, true);
      assert.strictEqual(idx.multiEntry, true);
    });

    it('IDBTransaction getter returns oncomplete handler', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'txGetterDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });
      const tx = db.transaction('items');
      assert.strictEqual(tx.oncomplete, null);
      const fn = () => {};
      tx.oncomplete = fn;
      assert.strictEqual(tx.oncomplete, fn);
    });

    it('IDBTransaction getter returns onabort handler', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'txAbortGetDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });
      const tx = db.transaction('items');
      assert.strictEqual(tx.onabort, null);
      const fn = () => {};
      tx.onabort = fn;
      assert.strictEqual(tx.onabort, fn);
    });

    it('IDBTransaction getter returns onerror handler', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'txErrGetDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });
      const tx = db.transaction('items');
      assert.strictEqual(tx.onerror, null);
      const fn = () => {};
      tx.onerror = fn;
      assert.strictEqual(tx.onerror, fn);
    });

    it('IDBDatabase onversionchange getter', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'vcGetDB', 1);
      assert.strictEqual(db.onversionchange, null);
      const fn = () => {};
      db.onversionchange = fn;
      assert.strictEqual(db.onversionchange, fn);
    });

    it('IDBIndex get with IDBKeyRange', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'idxRangeDB', 1, (db) => {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('byVal', 'val');
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, val: 10 }));
      await requestToPromise(store.put({ id: 2, val: 20 }));

      const idx = store.index('byVal');
      const range = IDBKeyRange.bound(15, 25);
      const result = (await requestToPromise(idx.get(range))) as {
        id: number;
        val: number;
      };
      assert.strictEqual(result.val, 20);

      // get with range that matches nothing
      const empty = await requestToPromise(
        idx.get(IDBKeyRange.bound(100, 200)),
      );
      assert.strictEqual(empty, undefined);
    });

    it('IDBIndex getAll with null query', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'idxAllDB', 1, (db) => {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('byVal', 'val');
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, val: 10 }));
      await requestToPromise(store.put({ id: 2, val: 20 }));

      const idx = store.index('byVal');
      const all = (await requestToPromise(idx.getAll())) as unknown[];
      assert.strictEqual(all.length, 2);

      // getAll with range
      const rangeResults = (await requestToPromise(
        idx.getAll(IDBKeyRange.bound(15, 25)),
      )) as unknown[];
      assert.strictEqual(rangeResults.length, 1);

      // getAll with count
      const limited = (await requestToPromise(
        idx.getAll(null, 1),
      )) as unknown[];
      assert.strictEqual(limited.length, 1);
    });

    it('IDBIndex count with null and range query', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'idxCountDB', 1, (db) => {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('byVal', 'val');
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1, val: 10 }));
      await requestToPromise(store.put({ id: 2, val: 20 }));

      const idx = store.index('byVal');
      const allCount = (await requestToPromise(idx.count())) as number;
      assert.strictEqual(allCount, 2);

      const rangeCount = (await requestToPromise(
        idx.count(IDBKeyRange.bound(15, 25)),
      )) as number;
      assert.strictEqual(rangeCount, 1);
    });

    it('cursor on store with key range', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'curRangeDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      for (let i = 1; i <= 5; i++) {
        await requestToPromise(store.put({ id: i }));
      }

      // openCursor with a key range
      const collected: number[] = [];
      const range = IDBKeyRange.bound(2, 4);
      await new Promise<void>((resolve) => {
        const req = store.openCursor(range);
        req.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            collected.push((cursor.value as { id: number }).id);
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
      assert.deepStrictEqual(collected, [2, 3, 4]);
    });

    it('cursor with exact key match', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'curExactDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1 }));
      await requestToPromise(store.put({ id: 2 }));

      const collected: number[] = [];
      await new Promise<void>((resolve) => {
        const req = store.openCursor(2);
        req.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            collected.push((cursor.value as { id: number }).id);
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
      assert.deepStrictEqual(collected, [2]);
    });

    it('cursor with prev direction', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'curPrevDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      for (let i = 1; i <= 3; i++) {
        await requestToPromise(store.put({ id: i }));
      }

      const collected: number[] = [];
      await new Promise<void>((resolve) => {
        const req = store.openCursor(null, 'prev');
        req.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor) {
            collected.push((cursor.value as { id: number }).id);
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
      assert.deepStrictEqual(collected, [3, 2, 1]);
    });

    it('advance past end returns null', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'advEndDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1 }));

      let resultWasNull = false;
      await new Promise<void>((resolve) => {
        const req = store.openCursor();
        let first = true;
        req.onsuccess = (event) => {
          const cursor = event.target.result as IDBCursor | null;
          if (cursor && first) {
            first = false;
            cursor.advance(100); // way past end
          } else if (!cursor) {
            resultWasNull = true;
            resolve();
          }
        };
      });
      assert.ok(resultWasNull);
    });

    it('IDBDatabase addEventListener for versionchange', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'dbEvtDB', 1);
      let viaListener = false;
      db.addEventListener('versionchange', () => {
        viaListener = true;
      });
      db._fireVersionChange(1, 2);
      assert.ok(viaListener);
    });

    it('deleteDatabase fires versionchange on connections', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'delVcDB', 1);
      let versionChangeFired = false;
      db.onversionchange = () => {
        versionChangeFired = true;
      };

      await new Promise<void>((resolve) => {
        const req = factory.deleteDatabase('delVcDB');
        req.onsuccess = () => resolve();
      });
      assert.ok(versionChangeFired);
    });

    it('IDBOpenDBRequest blocked event via addEventListener', () => {
      const req = new IDBOpenDBRequest();
      let blockedViaListener = false;
      req.addEventListener('blocked', () => {
        blockedViaListener = true;
      });
      req._fireBlocked();
      assert.ok(blockedViaListener);
    });

    it('IDBTransaction removeEventListener', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'removeTxDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      let count = 0;
      const handler = () => {
        count++;
      };
      const tx = db.transaction('items', 'readwrite');
      tx.addEventListener('complete', handler);
      tx.removeEventListener('complete', handler);

      const store = tx.objectStore('items');
      await requestToPromise(store.put({ id: 1 }));
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      assert.strictEqual(count, 0);
    });

    it('IDBDatabase removeEventListener', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'removeDbEvtDB', 1);

      let count = 0;
      const handler = () => {
        count++;
      };
      db.addEventListener('versionchange', handler);
      db.removeEventListener('versionchange', handler);

      db._fireVersionChange(1, 2);
      assert.strictEqual(count, 0);
    });

    it('IDBTransaction error event', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'txErrDB', 1, (db) => {
        db.createObjectStore('items', { keyPath: 'id' });
      });

      const tx = db.transaction('items', 'readwrite');
      let errorFired = false;
      tx.onerror = () => {
        errorFired = true;
      };
      // Access error property
      assert.strictEqual(tx.error, null);
      assert.ok(!errorFired);
    });

    it('objectStoreNames on transaction', async () => {
      const factory = new IDBFactory();
      const db = await openDB(factory, 'txNamesDB', 1, (db) => {
        db.createObjectStore('a');
        db.createObjectStore('b');
      });

      const tx = db.transaction(['a', 'b']);
      const names = tx.objectStoreNames;
      assert.ok(names.contains('a'));
      assert.ok(names.contains('b'));
      assert.strictEqual(names.length, 2);
    });
  });
});
