/**
 * Event subclasses — CustomEvent, MouseEvent, KeyboardEvent, FocusEvent, InputEvent.
 * @module dom/events
 */

import { Event } from './index.js';

/**
 * CustomEvent — extends Event with a detail property.
 */
export class CustomEvent extends Event {
  public readonly detail: unknown;

  constructor(
    type: string,
    options?: { bubbles?: boolean; cancelable?: boolean; detail?: unknown },
  ) {
    super(type, options);
    this.detail = options?.detail ?? null;
  }
}

/**
 * MouseEvent — extends Event with mouse-specific properties.
 */
export class MouseEvent extends Event {
  public readonly clientX: number;
  public readonly clientY: number;
  public readonly button: number;
  public readonly buttons: number;
  public readonly altKey: boolean;
  public readonly ctrlKey: boolean;
  public readonly shiftKey: boolean;
  public readonly metaKey: boolean;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      clientX?: number;
      clientY?: number;
      button?: number;
      buttons?: number;
      altKey?: boolean;
      ctrlKey?: boolean;
      shiftKey?: boolean;
      metaKey?: boolean;
    },
  ) {
    super(type, options);
    this.clientX = options?.clientX ?? 0;
    this.clientY = options?.clientY ?? 0;
    this.button = options?.button ?? 0;
    this.buttons = options?.buttons ?? 0;
    this.altKey = options?.altKey ?? false;
    this.ctrlKey = options?.ctrlKey ?? false;
    this.shiftKey = options?.shiftKey ?? false;
    this.metaKey = options?.metaKey ?? false;
  }
}

/**
 * KeyboardEvent — extends Event with keyboard-specific properties.
 */
export class KeyboardEvent extends Event {
  public readonly key: string;
  public readonly code: string;
  public readonly altKey: boolean;
  public readonly ctrlKey: boolean;
  public readonly shiftKey: boolean;
  public readonly metaKey: boolean;
  public readonly repeat: boolean;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      key?: string;
      code?: string;
      altKey?: boolean;
      ctrlKey?: boolean;
      shiftKey?: boolean;
      metaKey?: boolean;
      repeat?: boolean;
    },
  ) {
    super(type, options);
    this.key = options?.key ?? '';
    this.code = options?.code ?? '';
    this.altKey = options?.altKey ?? false;
    this.ctrlKey = options?.ctrlKey ?? false;
    this.shiftKey = options?.shiftKey ?? false;
    this.metaKey = options?.metaKey ?? false;
    this.repeat = options?.repeat ?? false;
  }
}

/**
 * FocusEvent — extends Event with a relatedTarget property.
 */
export class FocusEvent extends Event {
  public readonly relatedTarget: unknown;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      relatedTarget?: unknown;
    },
  ) {
    super(type, options);
    this.relatedTarget = options?.relatedTarget ?? null;
  }
}

/**
 * InputEvent — extends Event with data and inputType properties.
 */
export class InputEvent extends Event {
  public readonly data: string | null;
  public readonly inputType: string;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      data?: string | null;
      inputType?: string;
    },
  ) {
    super(type, options);
    this.data = options?.data ?? null;
    this.inputType = options?.inputType ?? '';
  }
}
