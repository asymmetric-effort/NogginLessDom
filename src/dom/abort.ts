/**
 * AbortController and AbortSignal implementation.
 * @module dom/abort
 */

import { Event } from './index.js';

/** Listener function type for AbortSignal events. */
type AbortEventListener = (ev: Event) => void;

/**
 * AbortSignal — represents a signal object that allows communication
 * with an asynchronous operation and abort it if needed.
 */
export class AbortSignal {
  private _aborted = false;
  private _reason: unknown = undefined;
  private _listeners: Map<string, AbortEventListener[]> = new Map();

  /** Handler called when the signal is aborted. */
  public onabort: ((ev: Event) => void) | null = null;

  /** Whether the signal has been aborted. */
  get aborted(): boolean {
    return this._aborted;
  }

  /** The reason for aborting. */
  get reason(): unknown {
    return this._reason;
  }

  /**
   * Add an event listener for the given event type.
   */
  addEventListener(type: string, listener: AbortEventListener): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type)!.push(listener);
  }

  /**
   * Remove an event listener for the given event type.
   */
  removeEventListener(type: string, listener: AbortEventListener): void {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) {
        list.splice(idx, 1);
      }
    }
  }

  /**
   * Throws the abort reason if the signal has been aborted.
   */
  throwIfAborted(): void {
    if (this._aborted) {
      throw this._reason;
    }
  }

  /**
   * Creates a pre-aborted AbortSignal.
   */
  static abort(reason?: unknown): AbortSignal {
    const signal = new AbortSignal();
    signal._aborted = true;
    signal._reason =
      reason !== undefined ? reason : new Error('This operation was aborted');
    return signal;
  }

  /**
   * Creates an AbortSignal that automatically aborts after the given time in ms.
   */
  static timeout(ms: number): AbortSignal {
    const signal = new AbortSignal();
    setTimeout(() => {
      if (!signal._aborted) {
        signal._aborted = true;
        signal._reason = new Error('The operation was aborted due to timeout');
        const event = new Event('abort');
        if (signal.onabort) {
          signal.onabort(event);
        }
        const listeners = signal._listeners.get('abort') ?? [];
        for (const listener of listeners) {
          listener(event);
        }
      }
    }, ms);
    return signal;
  }

  /**
   * Internal method to trigger the abort. Used by AbortController.
   * @internal
   */
  _doAbort(reason: unknown): void {
    if (this._aborted) return;
    this._aborted = true;
    this._reason = reason;
    const event = new Event('abort');
    if (this.onabort) {
      this.onabort(event);
    }
    const listeners = this._listeners.get('abort') ?? [];
    for (const listener of listeners) {
      listener(event);
    }
  }
}

/**
 * AbortController — allows aborting one or more DOM requests.
 */
export class AbortController {
  private readonly _signal: AbortSignal;

  constructor() {
    this._signal = new AbortSignal();
  }

  /** The AbortSignal associated with this controller. */
  get signal(): AbortSignal {
    return this._signal;
  }

  /**
   * Aborts the signal, optionally with a reason.
   */
  abort(reason?: unknown): void {
    const abortReason =
      reason !== undefined ? reason : new Error('This operation was aborted');
    this._signal._doAbort(abortReason);
  }
}
