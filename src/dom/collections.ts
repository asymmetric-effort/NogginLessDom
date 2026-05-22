/**
 * NodeList and HTMLCollection — DOM collection types.
 * @module dom/collections
 */

// Avoid importing from index.ts to prevent circular dependency issues.
// Use minimal interfaces instead.

interface NodeLike {
  nodeType: number;
}

interface ElementLike extends NodeLike {
  tagName: string;
  id: string;
  getAttribute(name: string): string | null;
}

/**
 * NodeList — array-like object returned by querySelectorAll.
 */
export class NodeList {
  private _items: NodeLike[];

  [index: number]: NodeLike | undefined;

  constructor(items: NodeLike[]) {
    this._items = [...items];
    // Set up index access
    for (let i = 0; i < this._items.length; i++) {
      this[i] = this._items[i];
    }
  }

  get length(): number {
    return this._items.length;
  }

  item(index: number): NodeLike | null {
    return this._items[index] ?? null;
  }

  forEach(
    callback: (node: NodeLike, index: number, list: NodeList) => void,
  ): void {
    for (let i = 0; i < this._items.length; i++) {
      callback(this._items[i]!, i, this);
    }
  }

  *entries(): IterableIterator<[number, NodeLike]> {
    for (let i = 0; i < this._items.length; i++) {
      yield [i, this._items[i]!];
    }
  }

  *keys(): IterableIterator<number> {
    for (let i = 0; i < this._items.length; i++) {
      yield i;
    }
  }

  *values(): IterableIterator<NodeLike> {
    for (let i = 0; i < this._items.length; i++) {
      yield this._items[i]!;
    }
  }

  [Symbol.iterator](): Iterator<NodeLike> {
    return this.values();
  }
}

/**
 * HTMLCollection — live collection returned by getElementsByTagName/ClassName.
 *
 * Accepts either a static array of elements (backward compatible) or a query
 * function that is called on every access to provide live results.
 */
export class HTMLCollection {
  private _queryFn: () => ElementLike[];

  [index: number]: ElementLike | undefined;

  constructor(itemsOrQueryFn: ElementLike[] | (() => ElementLike[])) {
    if (typeof itemsOrQueryFn === 'function') {
      this._queryFn = itemsOrQueryFn;
    } else {
      const staticItems = [...itemsOrQueryFn];
      this._queryFn = (): ElementLike[] => staticItems;
    }

    return new Proxy(this, {
      get(
        target: HTMLCollection,
        prop: string | symbol,
        receiver: HTMLCollection,
      ): unknown {
        if (typeof prop === 'string') {
          const idx = Number(prop);
          if (Number.isInteger(idx) && idx >= 0) {
            return target._queryFn()[idx];
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  get length(): number {
    return this._queryFn().length;
  }

  item(index: number): ElementLike | null {
    return this._queryFn()[index] ?? null;
  }

  namedItem(name: string): ElementLike | null {
    const items = this._queryFn();
    for (const el of items) {
      if (el.id === name || el.getAttribute('name') === name) {
        return el;
      }
    }
    return null;
  }

  [Symbol.iterator](): Iterator<ElementLike> {
    let i = 0;
    const items = this._queryFn();
    return {
      next(): IteratorResult<ElementLike> {
        if (i < items.length) {
          return { value: items[i++]!, done: false };
        }
        return { value: undefined as unknown as ElementLike, done: true };
      },
    };
  }
}
