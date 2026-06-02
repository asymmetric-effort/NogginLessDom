import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Element } from '../../src/dom/index.js';
import { PointerEvent } from '../../src/dom/events.js';

describe('Pointer Capture', () => {
  describe('setPointerCapture / releasePointerCapture / hasPointerCapture', () => {
    it('hasPointerCapture returns false for uncaptured pointer', () => {
      const el = new Element('div');
      assert.equal(el.hasPointerCapture(1), false);
    });

    it('setPointerCapture then hasPointerCapture returns true', () => {
      const el = new Element('div');
      el.setPointerCapture(1);
      assert.equal(el.hasPointerCapture(1), true);
    });

    it('releasePointerCapture then hasPointerCapture returns false', () => {
      const el = new Element('div');
      el.setPointerCapture(1);
      el.releasePointerCapture(1);
      assert.equal(el.hasPointerCapture(1), false);
    });

    it('roundtrip: set, check, release, check', () => {
      const el = new Element('div');
      assert.equal(el.hasPointerCapture(42), false);
      el.setPointerCapture(42);
      assert.equal(el.hasPointerCapture(42), true);
      el.releasePointerCapture(42);
      assert.equal(el.hasPointerCapture(42), false);
    });

    it('multiple pointer IDs tracked independently', () => {
      const el = new Element('div');
      el.setPointerCapture(1);
      el.setPointerCapture(2);
      el.setPointerCapture(3);
      assert.equal(el.hasPointerCapture(1), true);
      assert.equal(el.hasPointerCapture(2), true);
      assert.equal(el.hasPointerCapture(3), true);

      el.releasePointerCapture(2);
      assert.equal(el.hasPointerCapture(1), true);
      assert.equal(el.hasPointerCapture(2), false);
      assert.equal(el.hasPointerCapture(3), true);
    });

    it('releasePointerCapture on non-captured pointer is a no-op', () => {
      const el = new Element('div');
      el.releasePointerCapture(99);
      assert.equal(el.hasPointerCapture(99), false);
    });

    it('setPointerCapture is idempotent', () => {
      const el = new Element('div');
      el.setPointerCapture(1);
      el.setPointerCapture(1);
      assert.equal(el.hasPointerCapture(1), true);
      el.releasePointerCapture(1);
      assert.equal(el.hasPointerCapture(1), false);
    });
  });

  describe('PointerEvent', () => {
    it('has correct default properties', () => {
      const pe = new PointerEvent('pointerdown');
      assert.equal(pe.pointerId, 0);
      assert.equal(pe.width, 1);
      assert.equal(pe.height, 1);
      assert.equal(pe.pressure, 0);
      assert.equal(pe.tiltX, 0);
      assert.equal(pe.tiltY, 0);
      assert.equal(pe.pointerType, '');
      assert.equal(pe.isPrimary, false);
      assert.equal(pe.twist, 0);
    });

    it('accepts custom properties', () => {
      const pe = new PointerEvent('pointermove', {
        pointerId: 5,
        width: 10,
        height: 20,
        pressure: 0.5,
        tiltX: 15,
        tiltY: -10,
        pointerType: 'pen',
        isPrimary: true,
        twist: 45,
      });
      assert.equal(pe.pointerId, 5);
      assert.equal(pe.width, 10);
      assert.equal(pe.height, 20);
      assert.equal(pe.pressure, 0.5);
      assert.equal(pe.tiltX, 15);
      assert.equal(pe.tiltY, -10);
      assert.equal(pe.pointerType, 'pen');
      assert.equal(pe.isPrimary, true);
      assert.equal(pe.twist, 45);
    });

    it('extends MouseEvent with clientX/clientY', () => {
      const pe = new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 200,
        button: 1,
      });
      assert.equal(pe.clientX, 100);
      assert.equal(pe.clientY, 200);
      assert.equal(pe.button, 1);
    });

    it('has correct type', () => {
      const pe = new PointerEvent('pointerup');
      assert.equal(pe.type, 'pointerup');
    });

    it('supports bubbles and cancelable options', () => {
      const pe = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
      });
      assert.equal(pe.bubbles, true);
      assert.equal(pe.cancelable, true);
    });
  });
});
