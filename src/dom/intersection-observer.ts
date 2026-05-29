/**
 * IntersectionObserver implementation for full DOM simulation test environment.
 * @module dom/intersection-observer
 */

import { Element } from './index.js';

/**
 * DOMRectLike shape for intersection rectangles.
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
 * Entry passed to the IntersectionObserver callback.
 */
export interface IntersectionObserverEntry {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRectLike;
  intersectionRect: DOMRectLike;
  rootBounds: DOMRectLike | null;
  time: number;
}

/**
 * Options for IntersectionObserver constructor.
 */
export interface IntersectionObserverInit {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

type IntersectionObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
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
 * IntersectionObserver — tracks targets and allows simulated intersection events.
 * Use triggerIntersection() to simulate intersection events in tests.
 */
export class IntersectionObserver {
  /** @internal */
  _callback: IntersectionObserverCallback;
  /** @internal */
  _targets: Set<Element> = new Set();
  /** @internal */
  _pendingEntries: IntersectionObserverEntry[] = [];

  public readonly root: Element | null;
  public readonly rootMargin: string;
  public readonly thresholds: readonly number[];

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this._callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';

    const threshold = options?.threshold;
    if (Array.isArray(threshold)) {
      this.thresholds = threshold;
    } else if (typeof threshold === 'number') {
      this.thresholds = [threshold];
    } else {
      this.thresholds = [0];
    }
  }

  observe(target: Element): void {
    this._targets.add(target);
  }

  unobserve(target: Element): void {
    this._targets.delete(target);
  }

  disconnect(): void {
    this._targets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    const records = this._pendingEntries.slice();
    this._pendingEntries = [];
    return records;
  }
}

/**
 * Partial input for triggerIntersection helper.
 * All fields except `target` are optional and will be auto-filled with defaults.
 */
export interface IntersectionEntryInit {
  target: Element;
  isIntersecting?: boolean;
  intersectionRatio?: number;
  boundingClientRect?: Partial<DOMRectLike>;
  intersectionRect?: Partial<DOMRectLike>;
  rootBounds?: Partial<DOMRectLike> | null;
  time?: number;
}

/**
 * Test helper: simulate intersection events.
 * Only fires entries whose targets are currently observed.
 * Accepts partial entry data; missing fields are auto-filled with defaults.
 */
export function triggerIntersection(
  observer: IntersectionObserver,
  entries: IntersectionEntryInit[],
): void {
  const filtered: IntersectionObserverEntry[] = entries
    .filter((e) => observer._targets.has(e.target))
    .map((e) => ({
      target: e.target,
      isIntersecting: e.isIntersecting ?? false,
      intersectionRatio: e.intersectionRatio ?? 0,
      boundingClientRect: { ...defaultRect(), ...e.boundingClientRect },
      intersectionRect: { ...defaultRect(), ...e.intersectionRect },
      rootBounds:
        e.rootBounds === null
          ? null
          : e.rootBounds === undefined
            ? null
            : { ...defaultRect(), ...e.rootBounds },
      time: e.time ?? Date.now(),
    }));

  // Store as pending entries
  observer._pendingEntries.push(...filtered);

  if (filtered.length > 0) {
    observer._callback(filtered, observer);
  }
}
