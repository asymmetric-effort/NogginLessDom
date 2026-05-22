/**
 * Event subclasses — CustomEvent, MouseEvent, KeyboardEvent, FocusEvent, InputEvent,
 * WheelEvent, PointerEvent, TouchEvent, DragEvent, ClipboardEvent, TransitionEvent,
 * AnimationEvent, ErrorEvent, MessageEvent, StorageEvent, PopStateEvent, ProgressEvent,
 * HashChangeEvent, BeforeUnloadEvent.
 * @module dom/events
 */

import { Event } from './index.js';
import type { DataTransfer } from './data-transfer.js';

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

/**
 * WheelEvent — extends MouseEvent with wheel-specific properties.
 */
export class WheelEvent extends MouseEvent {
  public static readonly DOM_DELTA_PIXEL = 0;
  public static readonly DOM_DELTA_LINE = 1;
  public static readonly DOM_DELTA_PAGE = 2;

  public readonly deltaX: number;
  public readonly deltaY: number;
  public readonly deltaZ: number;
  public readonly deltaMode: number;

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
      deltaX?: number;
      deltaY?: number;
      deltaZ?: number;
      deltaMode?: number;
    },
  ) {
    super(type, options);
    this.deltaX = options?.deltaX ?? 0;
    this.deltaY = options?.deltaY ?? 0;
    this.deltaZ = options?.deltaZ ?? 0;
    this.deltaMode = options?.deltaMode ?? 0;
  }
}

/**
 * PointerEvent — extends MouseEvent with pointer-specific properties.
 */
export class PointerEvent extends MouseEvent {
  public readonly pointerId: number;
  public readonly pointerType: string;
  public readonly isPrimary: boolean;
  public readonly width: number;
  public readonly height: number;
  public readonly pressure: number;
  public readonly tiltX: number;
  public readonly tiltY: number;
  public readonly twist: number;

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
      pointerId?: number;
      pointerType?: string;
      isPrimary?: boolean;
      width?: number;
      height?: number;
      pressure?: number;
      tiltX?: number;
      tiltY?: number;
      twist?: number;
    },
  ) {
    super(type, options);
    this.pointerId = options?.pointerId ?? 0;
    this.pointerType = options?.pointerType ?? '';
    this.isPrimary = options?.isPrimary ?? false;
    this.width = options?.width ?? 1;
    this.height = options?.height ?? 1;
    this.pressure = options?.pressure ?? 0;
    this.tiltX = options?.tiltX ?? 0;
    this.tiltY = options?.tiltY ?? 0;
    this.twist = options?.twist ?? 0;
  }
}

/**
 * Touch interface for TouchEvent.
 */
export interface Touch {
  identifier: number;
  target: unknown;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
}

/**
 * TouchEvent — extends Event with touch-specific properties.
 */
export class TouchEvent extends Event {
  public readonly touches: ReadonlyArray<Touch>;
  public readonly targetTouches: ReadonlyArray<Touch>;
  public readonly changedTouches: ReadonlyArray<Touch>;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      touches?: Touch[];
      targetTouches?: Touch[];
      changedTouches?: Touch[];
    },
  ) {
    super(type, options);
    this.touches = options?.touches ?? [];
    this.targetTouches = options?.targetTouches ?? [];
    this.changedTouches = options?.changedTouches ?? [];
  }
}

/**
 * DragEvent — extends MouseEvent with dataTransfer support.
 */
export class DragEvent extends MouseEvent {
  public readonly dataTransfer: DataTransfer | null;

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
      dataTransfer?: DataTransfer | null;
    },
  ) {
    super(type, options);
    this.dataTransfer = options?.dataTransfer ?? null;
  }
}

/**
 * ClipboardEvent — extends Event with clipboardData (null stub).
 */
export class ClipboardEvent extends Event {
  public readonly clipboardData: null;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
    },
  ) {
    super(type, options);
    this.clipboardData = null;
  }
}

/**
 * TransitionEvent — extends Event with CSS transition properties.
 */
export class TransitionEvent extends Event {
  public readonly propertyName: string;
  public readonly elapsedTime: number;
  public readonly pseudoElement: string;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      propertyName?: string;
      elapsedTime?: number;
      pseudoElement?: string;
    },
  ) {
    super(type, options);
    this.propertyName = options?.propertyName ?? '';
    this.elapsedTime = options?.elapsedTime ?? 0;
    this.pseudoElement = options?.pseudoElement ?? '';
  }
}

/**
 * AnimationEvent — extends Event with CSS animation properties.
 */
export class AnimationEvent extends Event {
  public readonly animationName: string;
  public readonly elapsedTime: number;
  public readonly pseudoElement: string;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      animationName?: string;
      elapsedTime?: number;
      pseudoElement?: string;
    },
  ) {
    super(type, options);
    this.animationName = options?.animationName ?? '';
    this.elapsedTime = options?.elapsedTime ?? 0;
    this.pseudoElement = options?.pseudoElement ?? '';
  }
}

/**
 * ErrorEvent — extends Event with error details.
 */
export class ErrorEvent extends Event {
  public readonly message: string;
  public readonly filename: string;
  public readonly lineno: number;
  public readonly colno: number;
  public readonly error: unknown;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      message?: string;
      filename?: string;
      lineno?: number;
      colno?: number;
      error?: unknown;
    },
  ) {
    super(type, options);
    this.message = options?.message ?? '';
    this.filename = options?.filename ?? '';
    this.lineno = options?.lineno ?? 0;
    this.colno = options?.colno ?? 0;
    this.error = options?.error ?? null;
  }
}

/**
 * MessageEvent — extends Event with message data properties.
 */
export class MessageEvent extends Event {
  public readonly data: unknown;
  public readonly origin: string;
  public readonly source: unknown;
  public readonly ports: ReadonlyArray<unknown>;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      data?: unknown;
      origin?: string;
      source?: unknown;
      ports?: unknown[];
    },
  ) {
    super(type, options);
    this.data = options?.data ?? null;
    this.origin = options?.origin ?? '';
    this.source = options?.source ?? null;
    this.ports = options?.ports ?? [];
  }
}

/**
 * StorageEvent — extends Event with storage change details.
 */
export class StorageEvent extends Event {
  public readonly key: string | null;
  public readonly oldValue: string | null;
  public readonly newValue: string | null;
  public readonly url: string;
  public readonly storageArea: unknown;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      key?: string | null;
      oldValue?: string | null;
      newValue?: string | null;
      url?: string;
      storageArea?: unknown;
    },
  ) {
    super(type, options);
    this.key = options?.key ?? null;
    this.oldValue = options?.oldValue ?? null;
    this.newValue = options?.newValue ?? null;
    this.url = options?.url ?? '';
    this.storageArea = options?.storageArea ?? null;
  }
}

/**
 * PopStateEvent — extends Event with history state.
 */
export class PopStateEvent extends Event {
  public readonly state: unknown;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      state?: unknown;
    },
  ) {
    super(type, options);
    this.state = options?.state ?? null;
  }
}

/**
 * ProgressEvent — extends Event with progress details.
 */
export class ProgressEvent extends Event {
  public readonly lengthComputable: boolean;
  public readonly loaded: number;
  public readonly total: number;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      lengthComputable?: boolean;
      loaded?: number;
      total?: number;
    },
  ) {
    super(type, options);
    this.lengthComputable = options?.lengthComputable ?? false;
    this.loaded = options?.loaded ?? 0;
    this.total = options?.total ?? 0;
  }
}

/**
 * HashChangeEvent — extends Event with URL change details.
 */
export class HashChangeEvent extends Event {
  public readonly oldURL: string;
  public readonly newURL: string;

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
      oldURL?: string;
      newURL?: string;
    },
  ) {
    super(type, options);
    this.oldURL = options?.oldURL ?? '';
    this.newURL = options?.newURL ?? '';
  }
}

/**
 * BeforeUnloadEvent — extends Event with a settable returnValue.
 */
export class BeforeUnloadEvent extends Event {
  private _returnValue = '';

  get returnValue(): string {
    return this._returnValue;
  }

  set returnValue(value: string) {
    this._returnValue = value;
  }

  constructor(
    type: string,
    options?: {
      bubbles?: boolean;
      cancelable?: boolean;
    },
  ) {
    super(type, options);
  }
}
