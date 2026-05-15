/**
 * DOMTokenList — proper classList implementation.
 * @module dom/token-list
 */

// Avoid importing from index.ts to prevent circular dependency issues.
interface ElementLike {
  className: string;
}

/**
 * DOMTokenList provides methods to manipulate a set of space-separated tokens
 * (like CSS classes on an element).
 */
export class DOMTokenList {
  private _element: ElementLike;

  constructor(element: ElementLike) {
    this._element = element;
  }

  private _tokens(): string[] {
    return this._element.className.split(/\s+/).filter(Boolean);
  }

  private _setTokens(tokens: string[]): void {
    this._element.className = tokens.join(' ');
  }

  get length(): number {
    return this._tokens().length;
  }

  item(index: number): string | null {
    return this._tokens()[index] ?? null;
  }

  contains(token: string): boolean {
    return this._tokens().includes(token);
  }

  add(...tokens: string[]): void {
    const current = new Set(this._tokens());
    for (const t of tokens) {
      current.add(t);
    }
    this._setTokens([...current]);
  }

  remove(...tokens: string[]): void {
    const current = new Set(this._tokens());
    for (const t of tokens) {
      current.delete(t);
    }
    this._setTokens([...current]);
  }

  toggle(token: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) {
        this.add(token);
        return true;
      } else {
        this.remove(token);
        return false;
      }
    }
    if (this.contains(token)) {
      this.remove(token);
      return false;
    }
    this.add(token);
    return true;
  }

  replace(oldToken: string, newToken: string): boolean {
    const tokens = this._tokens();
    const index = tokens.indexOf(oldToken);
    if (index === -1) return false;
    tokens[index] = newToken;
    this._setTokens(tokens);
    return true;
  }

  get value(): string {
    return this._element.className;
  }

  set value(val: string) {
    this._element.className = val;
  }

  toString(): string {
    return this._element.className;
  }

  forEach(
    callback: (token: string, index: number, list: DOMTokenList) => void,
  ): void {
    const tokens = this._tokens();
    for (let i = 0; i < tokens.length; i++) {
      callback(tokens[i]!, i, this);
    }
  }

  *entries(): IterableIterator<[number, string]> {
    const tokens = this._tokens();
    for (let i = 0; i < tokens.length; i++) {
      yield [i, tokens[i]!];
    }
  }

  *keys(): IterableIterator<number> {
    const tokens = this._tokens();
    for (let i = 0; i < tokens.length; i++) {
      yield i;
    }
  }

  *values(): IterableIterator<string> {
    const tokens = this._tokens();
    for (let i = 0; i < tokens.length; i++) {
      yield tokens[i]!;
    }
  }

  [Symbol.iterator](): Iterator<string> {
    return this.values();
  }
}
