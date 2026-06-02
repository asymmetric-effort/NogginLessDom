/**
 * Web Animations API — Animation, KeyframeEffect, and related types.
 * @module dom/animation
 */

import type { Element } from './index.js';
import { Event } from './index.js';

/**
 * EffectTiming — timing properties for an animation effect.
 */
export interface EffectTiming {
  delay: number;
  duration: number | string;
  easing: string;
  iterations: number;
  direction: string;
  fill: string;
}

/**
 * KeyframeEffectOptions — options for constructing a KeyframeEffect.
 */
export interface KeyframeEffectOptions {
  duration?: number | string;
  delay?: number;
  easing?: string;
  iterations?: number;
  direction?: string;
  fill?: string;
  [key: string]: unknown;
}

/**
 * AnimationTimeline — stub timeline.
 */
export class AnimationTimeline {
  get currentTime(): number | null {
    return Date.now();
  }
}

/**
 * KeyframeEffect — describes the animated properties and keyframes.
 */
export class KeyframeEffect {
  target: Element | null;
  private _keyframes: Record<string, unknown>[];
  private _timing: EffectTiming;

  constructor(
    target: Element | null,
    keyframes: Record<string, unknown>[] | null,
    options?: number | KeyframeEffectOptions,
  ) {
    this.target = target;
    this._keyframes = keyframes ? keyframes.slice() : [];

    const defaultTiming: EffectTiming = {
      delay: 0,
      duration: 0,
      easing: 'linear',
      iterations: 1,
      direction: 'normal',
      fill: 'none',
    };

    if (typeof options === 'number') {
      this._timing = { ...defaultTiming, duration: options };
    } else if (options) {
      this._timing = {
        delay: options.delay ?? 0,
        duration: options.duration ?? 0,
        easing: options.easing ?? 'linear',
        iterations: options.iterations ?? 1,
        direction: options.direction ?? 'normal',
        fill: options.fill ?? 'none',
      };
    } else {
      this._timing = defaultTiming;
    }
  }

  getKeyframes(): Record<string, unknown>[] {
    return this._keyframes.slice();
  }

  setKeyframes(keyframes: Record<string, unknown>[]): void {
    this._keyframes = keyframes.slice();
  }

  getTiming(): EffectTiming {
    return { ...this._timing };
  }

  updateTiming(timing: Partial<EffectTiming>): void {
    Object.assign(this._timing, timing);
  }
}

/**
 * Animation — controls playback of a KeyframeEffect.
 */
export class Animation {
  id: string = '';
  playState: string = 'idle';
  currentTime: number | null = null;
  startTime: number | null = null;
  playbackRate: number = 1;

  readonly effect: KeyframeEffect | null;
  readonly timeline: AnimationTimeline | null;

  onfinish: ((event: Event) => void) | null = null;
  oncancel: ((event: Event) => void) | null = null;

  private _finishedResolve: ((value: Animation) => void) | null = null;
  private _finishedReject: ((reason: unknown) => void) | null = null;
  private _readyResolve: ((value: Animation) => void) | null = null;
  private _finishedPromise: Promise<Animation>;
  private _readyPromise: Promise<Animation>;

  constructor(effect?: KeyframeEffect | null, timeline?: AnimationTimeline) {
    this.effect = effect ?? null;
    this.timeline = timeline ?? new AnimationTimeline();
    this._finishedPromise = new Promise<Animation>((resolve, reject) => {
      this._finishedResolve = resolve;
      this._finishedReject = reject;
    });
    this._readyPromise = new Promise<Animation>((resolve) => {
      this._readyResolve = resolve;
    });
  }

  get finished(): Promise<Animation> {
    return this._finishedPromise;
  }

  get ready(): Promise<Animation> {
    return this._readyPromise;
  }

  play(): void {
    this.playState = 'running';
    this.currentTime = 0;
    this.startTime = Date.now();
    if (this._readyResolve) {
      this._readyResolve(this);
      this._readyResolve = null;
    }
  }

  pause(): void {
    if (this.playState === 'running') {
      this.playState = 'paused';
    }
  }

  cancel(): void {
    this.playState = 'idle';
    this.currentTime = null;
    this.startTime = null;
    if (this.oncancel) {
      this.oncancel(new Event('cancel'));
    }
    // Reset the finished promise without rejecting (avoids unhandled rejection)
    this._finishedResolve = null;
    this._finishedReject = null;
    this._finishedPromise = new Promise<Animation>((resolve, reject) => {
      this._finishedResolve = resolve;
      this._finishedReject = reject;
    });
  }

  finish(): void {
    this.playState = 'finished';
    if (this.effect) {
      const timing = this.effect.getTiming();
      const dur =
        typeof timing.duration === 'number'
          ? timing.duration
          : parseFloat(timing.duration) || 0;
      this.currentTime = dur;
    }
    if (this.onfinish) {
      this.onfinish(new Event('finish'));
    }
    if (this._finishedResolve) {
      this._finishedResolve(this);
      this._finishedResolve = null;
      this._finishedReject = null;
    }
  }

  reverse(): void {
    this.playbackRate *= -1;
  }
}
