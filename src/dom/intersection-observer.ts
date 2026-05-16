/**
 * IntersectionObserver stub implementation for full DOM simulation test environment.
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

/**
 * IntersectionObserver stub — tracks targets but does not detect real intersections.
 * Use triggerIntersection() to simulate intersection events in tests.
 */
export class IntersectionObserver {
  /** @internal */
  _callback: IntersectionObserverCallback;
  /** @internal */
  _targets: Set<Element> = new Set();

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
}

/**
 * Input for triggerIntersection helper.
 */
export interface IntersectionEntryInit {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRectLike;
  intersectionRect: DOMRectLike;
  rootBounds?: DOMRectLike | null;
}

/**
 * Test helper: simulate intersection events.
 * Only fires entries whose targets are currently observed.
 */
export function triggerIntersection(
  observer: IntersectionObserver,
  entries: IntersectionEntryInit[],
): void {
  const filtered: IntersectionObserverEntry[] = entries
    .filter((e) => observer._targets.has(e.target))
    .map((e) => ({
      target: e.target,
      isIntersecting: e.isIntersecting,
      intersectionRatio: e.intersectionRatio,
      boundingClientRect: e.boundingClientRect,
      intersectionRect: e.intersectionRect,
      rootBounds: e.rootBounds ?? null,
    }));

  if (filtered.length > 0) {
    observer._callback(filtered, observer);
  }
}
