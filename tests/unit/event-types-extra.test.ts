import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Event } from '../../src/dom/index.js';
import {
  MouseEvent,
  WheelEvent,
  PointerEvent,
  TouchEvent,
  DragEvent,
  ClipboardEvent,
  TransitionEvent,
  AnimationEvent,
  ErrorEvent,
  MessageEvent,
  StorageEvent,
  PopStateEvent,
  ProgressEvent,
  HashChangeEvent,
  BeforeUnloadEvent,
} from '../../src/dom/events.js';
import type { Touch } from '../../src/dom/events.js';

describe('WheelEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new WheelEvent('wheel');
    assert.strictEqual(ev.type, 'wheel');
    assert.strictEqual(ev.deltaX, 0);
    assert.strictEqual(ev.deltaY, 0);
    assert.strictEqual(ev.deltaZ, 0);
    assert.strictEqual(ev.deltaMode, 0);
  });

  it('should accept options to set properties', () => {
    const ev = new WheelEvent('wheel', {
      deltaX: 10,
      deltaY: 20,
      deltaZ: 5,
      deltaMode: 1,
      clientX: 100,
    });
    assert.strictEqual(ev.deltaX, 10);
    assert.strictEqual(ev.deltaY, 20);
    assert.strictEqual(ev.deltaZ, 5);
    assert.strictEqual(ev.deltaMode, 1);
    assert.strictEqual(ev.clientX, 100);
  });

  it('should be instanceof Event', () => {
    const ev = new WheelEvent('wheel');
    assert.ok(ev instanceof Event);
  });

  it('should be instanceof MouseEvent', () => {
    const ev = new WheelEvent('wheel');
    assert.ok(ev instanceof MouseEvent);
  });
});

describe('PointerEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new PointerEvent('pointerdown');
    assert.strictEqual(ev.type, 'pointerdown');
    assert.strictEqual(ev.pointerId, 0);
    assert.strictEqual(ev.pointerType, '');
    assert.strictEqual(ev.isPrimary, false);
    assert.strictEqual(ev.width, 1);
    assert.strictEqual(ev.height, 1);
    assert.strictEqual(ev.pressure, 0);
    assert.strictEqual(ev.tiltX, 0);
    assert.strictEqual(ev.tiltY, 0);
    assert.strictEqual(ev.twist, 0);
  });

  it('should accept options to set properties', () => {
    const ev = new PointerEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      width: 25,
      height: 25,
      pressure: 0.5,
      tiltX: 10,
      tiltY: -5,
      twist: 90,
    });
    assert.strictEqual(ev.pointerId, 1);
    assert.strictEqual(ev.pointerType, 'touch');
    assert.strictEqual(ev.isPrimary, true);
    assert.strictEqual(ev.width, 25);
    assert.strictEqual(ev.height, 25);
    assert.strictEqual(ev.pressure, 0.5);
    assert.strictEqual(ev.tiltX, 10);
    assert.strictEqual(ev.tiltY, -5);
    assert.strictEqual(ev.twist, 90);
  });

  it('should be instanceof Event and MouseEvent', () => {
    const ev = new PointerEvent('pointerdown');
    assert.ok(ev instanceof Event);
    assert.ok(ev instanceof MouseEvent);
  });
});

describe('TouchEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new TouchEvent('touchstart');
    assert.strictEqual(ev.type, 'touchstart');
    assert.deepStrictEqual(ev.touches, []);
    assert.deepStrictEqual(ev.targetTouches, []);
    assert.deepStrictEqual(ev.changedTouches, []);
  });

  it('should accept options to set properties', () => {
    const touch: Touch = {
      identifier: 0,
      target: null,
      clientX: 10,
      clientY: 20,
      pageX: 10,
      pageY: 20,
      screenX: 10,
      screenY: 20,
    };
    const ev = new TouchEvent('touchstart', {
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch],
    });
    assert.strictEqual(ev.touches.length, 1);
    assert.strictEqual(ev.touches[0].clientX, 10);
    assert.strictEqual(ev.targetTouches.length, 1);
    assert.strictEqual(ev.changedTouches.length, 1);
  });

  it('should be instanceof Event', () => {
    const ev = new TouchEvent('touchstart');
    assert.ok(ev instanceof Event);
  });
});

describe('DragEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new DragEvent('dragstart');
    assert.strictEqual(ev.type, 'dragstart');
    assert.strictEqual(ev.dataTransfer, null);
  });

  it('should be instanceof Event and MouseEvent', () => {
    const ev = new DragEvent('drag');
    assert.ok(ev instanceof Event);
    assert.ok(ev instanceof MouseEvent);
  });
});

describe('ClipboardEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new ClipboardEvent('copy');
    assert.strictEqual(ev.type, 'copy');
    assert.strictEqual(ev.clipboardData, null);
  });

  it('should be instanceof Event', () => {
    const ev = new ClipboardEvent('paste');
    assert.ok(ev instanceof Event);
  });
});

describe('TransitionEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new TransitionEvent('transitionend');
    assert.strictEqual(ev.type, 'transitionend');
    assert.strictEqual(ev.propertyName, '');
    assert.strictEqual(ev.elapsedTime, 0);
    assert.strictEqual(ev.pseudoElement, '');
  });

  it('should accept options to set properties', () => {
    const ev = new TransitionEvent('transitionend', {
      propertyName: 'opacity',
      elapsedTime: 0.3,
      pseudoElement: '::before',
    });
    assert.strictEqual(ev.propertyName, 'opacity');
    assert.strictEqual(ev.elapsedTime, 0.3);
    assert.strictEqual(ev.pseudoElement, '::before');
  });

  it('should be instanceof Event', () => {
    const ev = new TransitionEvent('transitionend');
    assert.ok(ev instanceof Event);
  });
});

describe('AnimationEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new AnimationEvent('animationend');
    assert.strictEqual(ev.type, 'animationend');
    assert.strictEqual(ev.animationName, '');
    assert.strictEqual(ev.elapsedTime, 0);
    assert.strictEqual(ev.pseudoElement, '');
  });

  it('should accept options to set properties', () => {
    const ev = new AnimationEvent('animationend', {
      animationName: 'fadeIn',
      elapsedTime: 1.5,
      pseudoElement: '::after',
    });
    assert.strictEqual(ev.animationName, 'fadeIn');
    assert.strictEqual(ev.elapsedTime, 1.5);
    assert.strictEqual(ev.pseudoElement, '::after');
  });

  it('should be instanceof Event', () => {
    const ev = new AnimationEvent('animationend');
    assert.ok(ev instanceof Event);
  });
});

describe('ErrorEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new ErrorEvent('error');
    assert.strictEqual(ev.type, 'error');
    assert.strictEqual(ev.message, '');
    assert.strictEqual(ev.filename, '');
    assert.strictEqual(ev.lineno, 0);
    assert.strictEqual(ev.colno, 0);
    assert.strictEqual(ev.error, null);
  });

  it('should accept options to set properties', () => {
    const err = new Error('boom');
    const ev = new ErrorEvent('error', {
      message: 'Something failed',
      filename: 'app.js',
      lineno: 42,
      colno: 10,
      error: err,
    });
    assert.strictEqual(ev.message, 'Something failed');
    assert.strictEqual(ev.filename, 'app.js');
    assert.strictEqual(ev.lineno, 42);
    assert.strictEqual(ev.colno, 10);
    assert.strictEqual(ev.error, err);
  });

  it('should be instanceof Event', () => {
    const ev = new ErrorEvent('error');
    assert.ok(ev instanceof Event);
  });
});

describe('MessageEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new MessageEvent('message');
    assert.strictEqual(ev.type, 'message');
    assert.strictEqual(ev.data, null);
    assert.strictEqual(ev.origin, '');
    assert.strictEqual(ev.source, null);
    assert.deepStrictEqual(ev.ports, []);
  });

  it('should accept options to set properties', () => {
    const ev = new MessageEvent('message', {
      data: { hello: 'world' },
      origin: 'http://example.com',
      source: null,
      ports: [],
    });
    assert.deepStrictEqual(ev.data, { hello: 'world' });
    assert.strictEqual(ev.origin, 'http://example.com');
  });

  it('should be instanceof Event', () => {
    const ev = new MessageEvent('message');
    assert.ok(ev instanceof Event);
  });
});

describe('StorageEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new StorageEvent('storage');
    assert.strictEqual(ev.type, 'storage');
    assert.strictEqual(ev.key, null);
    assert.strictEqual(ev.oldValue, null);
    assert.strictEqual(ev.newValue, null);
    assert.strictEqual(ev.url, '');
    assert.strictEqual(ev.storageArea, null);
  });

  it('should accept options to set properties', () => {
    const ev = new StorageEvent('storage', {
      key: 'theme',
      oldValue: 'light',
      newValue: 'dark',
      url: 'http://example.com',
    });
    assert.strictEqual(ev.key, 'theme');
    assert.strictEqual(ev.oldValue, 'light');
    assert.strictEqual(ev.newValue, 'dark');
    assert.strictEqual(ev.url, 'http://example.com');
  });

  it('should be instanceof Event', () => {
    const ev = new StorageEvent('storage');
    assert.ok(ev instanceof Event);
  });
});

describe('PopStateEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new PopStateEvent('popstate');
    assert.strictEqual(ev.type, 'popstate');
    assert.strictEqual(ev.state, null);
  });

  it('should accept options to set properties', () => {
    const ev = new PopStateEvent('popstate', { state: { page: 1 } });
    assert.deepStrictEqual(ev.state, { page: 1 });
  });

  it('should be instanceof Event', () => {
    const ev = new PopStateEvent('popstate');
    assert.ok(ev instanceof Event);
  });
});

describe('ProgressEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new ProgressEvent('progress');
    assert.strictEqual(ev.type, 'progress');
    assert.strictEqual(ev.lengthComputable, false);
    assert.strictEqual(ev.loaded, 0);
    assert.strictEqual(ev.total, 0);
  });

  it('should accept options to set properties', () => {
    const ev = new ProgressEvent('progress', {
      lengthComputable: true,
      loaded: 500,
      total: 1000,
    });
    assert.strictEqual(ev.lengthComputable, true);
    assert.strictEqual(ev.loaded, 500);
    assert.strictEqual(ev.total, 1000);
  });

  it('should be instanceof Event', () => {
    const ev = new ProgressEvent('progress');
    assert.ok(ev instanceof Event);
  });
});

describe('HashChangeEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new HashChangeEvent('hashchange');
    assert.strictEqual(ev.type, 'hashchange');
    assert.strictEqual(ev.oldURL, '');
    assert.strictEqual(ev.newURL, '');
  });

  it('should accept options to set properties', () => {
    const ev = new HashChangeEvent('hashchange', {
      oldURL: 'http://example.com/#old',
      newURL: 'http://example.com/#new',
    });
    assert.strictEqual(ev.oldURL, 'http://example.com/#old');
    assert.strictEqual(ev.newURL, 'http://example.com/#new');
  });

  it('should be instanceof Event', () => {
    const ev = new HashChangeEvent('hashchange');
    assert.ok(ev instanceof Event);
  });
});

describe('BeforeUnloadEvent', () => {
  it('should be constructable with correct defaults', () => {
    const ev = new BeforeUnloadEvent('beforeunload');
    assert.strictEqual(ev.type, 'beforeunload');
    assert.strictEqual(ev.returnValue, '');
  });

  it('should allow setting returnValue', () => {
    const ev = new BeforeUnloadEvent('beforeunload');
    ev.returnValue = 'Are you sure?';
    assert.strictEqual(ev.returnValue, 'Are you sure?');
  });

  it('should be instanceof Event', () => {
    const ev = new BeforeUnloadEvent('beforeunload');
    assert.ok(ev instanceof Event);
  });
});
