/**
 * ResizeObserver stub implementation for full DOM simulation test environment.
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

/**
 * ResizeObserver stub — tracks targets but does not detect real resizes.
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
 * Test helper: simulate a resize event on a target observed by the given observer.
 * Only fires if the target is currently observed.
 */
export function triggerResize(
  observer: ResizeObserver,
  target: Element,
  contentRect: DOMRectLike,
): void {
  if (!observer._targets.has(target)) return;

  const entry: ResizeObserverEntry = {
    target,
    contentRect,
    borderBoxSize: [
      {
        blockSize: contentRect.height,
        inlineSize: contentRect.width,
      },
    ],
    contentBoxSize: [
      {
        blockSize: contentRect.height,
        inlineSize: contentRect.width,
      },
    ],
  };

  observer._callback([entry], observer);
}
