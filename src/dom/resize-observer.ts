/**
 * ResizeObserver implementation for full DOM simulation test environment.
 * @module dom/resize-observer
 */

import { Element } from './index.js';

/**
 * DOMRectLike shape for content rect.
 */
export interface DOMRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Box size entry.
 */
export interface ResizeObserverSize {
  blockSize: number;
  inlineSize: number;
}

/**
 * Entry passed to the ResizeObserver callback.
 */
export interface ResizeObserverEntry {
  target: Element;
  contentRect: DOMRectLike;
  borderBoxSize: ResizeObserverSize[];
  contentBoxSize: ResizeObserverSize[];
}

export interface ResizeObserverOptions {
  box?: 'content-box' | 'border-box' | 'device-pixel-content-box';
}

type ResizeObserverCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver,
) => void;

/** Default DOMRectLike with all zeroes. */
function defaultRect(): DOMRectLike {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
}

/**
 * ResizeObserver — tracks targets and allows simulated resize events.
 * Use triggerResize() to simulate resize events in tests.
 */
export class ResizeObserver {
  /** @internal */
  _callback: ResizeObserverCallback;
  /** @internal */
  _targets: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this._callback = callback;
  }

  observe(target: Element, _options?: ResizeObserverOptions): void {
    this._targets.add(target);
  }

  unobserve(target: Element): void {
    this._targets.delete(target);
  }

  disconnect(): void {
    this._targets.clear();
  }
}

/**
 * Partial input for triggerResize helper when using the array form.
 * All fields except `target` are optional and will be auto-filled with defaults.
 */
export interface ResizeEntryInit {
  target: Element;
  contentRect?: Partial<DOMRectLike>;
  borderBoxSize?: ResizeObserverSize[];
  contentBoxSize?: ResizeObserverSize[];
}

/**
 * Test helper: simulate a resize event on a target observed by the given observer.
 * Only fires if the target is currently observed.
 *
 * Overload 1: single target with explicit contentRect (legacy API).
 * Overload 2: array of partial entries with auto-filled defaults.
 */
export function triggerResize(
  observer: ResizeObserver,
  target: Element,
  contentRect: DOMRectLike,
): void;
export function triggerResize(
  observer: ResizeObserver,
  entries: ResizeEntryInit[],
): void;
export function triggerResize(
  observer: ResizeObserver,
  targetOrEntries: Element | ResizeEntryInit[],
  contentRect?: DOMRectLike,
): void {
  if (Array.isArray(targetOrEntries)) {
    // Array form: accept partial entries
    const filtered: ResizeObserverEntry[] = targetOrEntries
      .filter((e) => observer._targets.has(e.target))
      .map((e) => {
        const rect: DOMRectLike = { ...defaultRect(), ...e.contentRect };
        return {
          target: e.target,
          contentRect: rect,
          borderBoxSize: e.borderBoxSize ?? [
            {
              blockSize: rect.height,
              inlineSize: rect.width,
            },
          ],
          contentBoxSize: e.contentBoxSize ?? [
            {
              blockSize: rect.height,
              inlineSize: rect.width,
            },
          ],
        };
      });

    if (filtered.length > 0) {
      observer._callback(filtered, observer);
    }
  } else {
    // Legacy single-target form
    const target = targetOrEntries;
    if (!observer._targets.has(target)) return;

    const entry: ResizeObserverEntry = {
      target,
      contentRect: contentRect!,
      borderBoxSize: [
        {
          blockSize: contentRect!.height,
          inlineSize: contentRect!.width,
        },
      ],
      contentBoxSize: [
        {
          blockSize: contentRect!.height,
          inlineSize: contentRect!.width,
        },
      ],
    };

    observer._callback([entry], observer);
  }
}
