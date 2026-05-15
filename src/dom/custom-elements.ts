/**
 * Custom Elements Registry implementation.
 * @module dom/custom-elements
 */

import type { Element } from './index.js';
import type { Node } from './index.js';

/** Constructor type for custom elements. */
type ElementConstructor = new () => Element;

/** Pending waiters for whenDefined. */
interface WhenDefinedWaiter {
  resolve: (ctor: ElementConstructor) => void;
}

/**
 * CustomElementRegistry — stores custom element definitions.
 */
export class CustomElementRegistry {
  private definitions: Map<string, ElementConstructor> = new Map();
  private namesByConstructor: Map<ElementConstructor, string> = new Map();
  private waiters: Map<string, WhenDefinedWaiter[]> = new Map();

  /**
   * Register a custom element. Name must contain a hyphen.
   */
  define(
    name: string,
    constructor: ElementConstructor,
    _options?: { extends?: string },
  ): void {
    if (!name.includes('-')) {
      throw new Error(
        `Failed to execute 'define': "${name}" is not a valid custom element name (must contain a hyphen)`,
      );
    }
    if (this.definitions.has(name)) {
      throw new Error(
        `Failed to execute 'define': the name "${name}" has already been used`,
      );
    }
    this.definitions.set(name, constructor);
    this.namesByConstructor.set(constructor, name);

    // Resolve pending whenDefined promises
    const pending = this.waiters.get(name);
    if (pending) {
      for (const waiter of pending) {
        waiter.resolve(constructor);
      }
      this.waiters.delete(name);
    }
  }

  /**
   * Return constructor for name, or undefined.
   */
  get(name: string): ElementConstructor | undefined {
    return this.definitions.get(name);
  }

  /**
   * Return a Promise that resolves when name is defined.
   */
  whenDefined(name: string): Promise<ElementConstructor> {
    const existing = this.definitions.get(name);
    if (existing) {
      return Promise.resolve(existing);
    }
    return new Promise<ElementConstructor>((resolve) => {
      if (!this.waiters.has(name)) {
        this.waiters.set(name, []);
      }
      this.waiters.get(name)!.push({ resolve });
    });
  }

  /**
   * Return name for constructor, or undefined.
   */
  getName(constructor: ElementConstructor): string | undefined {
    return this.namesByConstructor.get(constructor);
  }

  /**
   * Upgrade — stub (noop).
   */
  upgrade(_root: Node): void {
    // noop
  }
}
