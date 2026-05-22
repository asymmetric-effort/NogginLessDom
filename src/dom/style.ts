/**
 * CSSStyleDeclaration — inline style object for elements.
 * @module dom/style
 */

/**
 * Convert camelCase to kebab-case: backgroundColor -> background-color
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

/**
 * Convert kebab-case to camelCase: background-color -> backgroundColor
 */

/** Callback type for notifying the owning element when styles change. */
type StyleChangeCallback = (cssText: string) => void;

/**
 * CSSStyleDeclaration provides access to an element's inline styles.
 */
export class CSSStyleDeclaration {
  private _properties: Map<string, string> = new Map();
  private _onchange: StyleChangeCallback | null = null;

  /** Set a callback that fires whenever a style property changes. */
  _setOnChange(callback: StyleChangeCallback): void {
    this._onchange = callback;
  }

  /** Notify the owner that styles changed. */
  private _notifyChange(): void {
    if (this._onchange) {
      this._onchange(this.cssText);
    }
  }

  constructor() {
    // Use a Proxy to support arbitrary camelCase property access
    return new Proxy(this, {
      get(target, prop: string | symbol): unknown {
        if (typeof prop === 'symbol') {
          return (target as unknown as Record<symbol, unknown>)[prop];
        }
        // Check for own methods/properties first
        if (
          prop in target ||
          typeof (target as unknown as Record<string, unknown>)[prop] ===
            'function'
        ) {
          const val = (target as unknown as Record<string, unknown>)[prop];
          if (typeof val === 'function') {
            return (val as (...args: unknown[]) => unknown).bind(target);
          }
          return val;
        }
        // Treat as CSS property (camelCase)
        const kebab = camelToKebab(prop);
        return target._properties.get(kebab) ?? '';
      },
      set(target, prop: string | symbol, value: unknown): boolean {
        if (typeof prop === 'symbol') {
          (target as unknown as Record<symbol, unknown>)[prop] = value;
          return true;
        }
        // Check if it's a known own property
        if (
          prop === '_properties' ||
          prop === '_onchange' ||
          prop === 'cssText'
        ) {
          (target as unknown as Record<string, unknown>)[prop] = value;
          return true;
        }
        // Treat as CSS property (camelCase)
        const kebab = camelToKebab(prop);
        if (value === '' || value === null || value === undefined) {
          target._properties.delete(kebab);
        } else {
          target._properties.set(kebab, String(value));
        }
        target._notifyChange();
        return true;
      },
    });
  }

  getPropertyValue(prop: string): string {
    return this._properties.get(prop) ?? '';
  }

  setProperty(prop: string, value: string, _priority?: string): void {
    if (value === '' || value === null || value === undefined) {
      this._properties.delete(prop);
    } else {
      this._properties.set(prop, value);
    }
    this._notifyChange();
  }

  removeProperty(prop: string): string {
    const old = this._properties.get(prop) ?? '';
    this._properties.delete(prop);
    this._notifyChange();
    return old;
  }

  get cssText(): string {
    const parts: string[] = [];
    for (const [key, value] of this._properties) {
      parts.push(`${key}: ${value}`);
    }
    return parts.join('; ');
  }

  set cssText(value: string) {
    this._properties.clear();
    if (!value) return;
    const declarations = value
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const decl of declarations) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim();
      if (prop && val) {
        this._properties.set(prop, val);
      }
    }
    this._notifyChange();
  }

  get length(): number {
    return this._properties.size;
  }

  item(index: number): string {
    const keys = [...this._properties.keys()];
    return keys[index] ?? '';
  }

  /**
   * Iterate over all property name/value pairs.
   */
  *[Symbol.iterator](): IterableIterator<[string, string]> {
    yield* this._properties.entries();
  }

  // Allow instanceof checks to work through proxy
  static [Symbol.hasInstance](instance: unknown): boolean {
    const obj = instance as Record<string, unknown>;
    return (
      instance !== null &&
      typeof instance === 'object' &&
      typeof obj.getPropertyValue === 'function' &&
      typeof obj.setProperty === 'function' &&
      typeof obj.removeProperty === 'function'
    );
  }
}
