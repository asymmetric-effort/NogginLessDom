import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow } from '../../src/dom/window.js';
import { ClipboardEvent } from '../../src/dom/events.js';
import { DataTransfer } from '../../src/dom/data-transfer.js';

describe('Clipboard API', () => {
  describe('navigator.clipboard', () => {
    it('writeText/readText roundtrip', async () => {
      const win = createWindow();
      await win.navigator.clipboard.writeText('hello');
      const text = await win.navigator.clipboard.readText();
      assert.equal(text, 'hello');
    });
    it('readText returns empty string initially', async () => {
      const win = createWindow();
      const text = await win.navigator.clipboard.readText();
      assert.equal(text, '');
    });
    it('writeText overwrites previous value', async () => {
      const win = createWindow();
      await win.navigator.clipboard.writeText('first');
      await win.navigator.clipboard.writeText('second');
      const text = await win.navigator.clipboard.readText();
      assert.equal(text, 'second');
    });
  });
  describe('ClipboardEvent', () => {
    it('has clipboardData property', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'test data');
      const event = new ClipboardEvent('copy', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      assert.ok(event.clipboardData !== null);
      assert.equal(event.clipboardData!.getData('text/plain'), 'test data');
    });
    it('clipboardData defaults to null', () => {
      const event = new ClipboardEvent('paste');
      assert.equal(event.clipboardData, null);
    });
    it('has correct event type', () => {
      const event = new ClipboardEvent('cut', { bubbles: true });
      assert.equal(event.type, 'cut');
      assert.equal(event.bubbles, true);
    });
  });
  describe('copy/paste event dispatch', () => {
    it('dispatches copy event', () => {
      const win = createWindow();
      const body = win.document.querySelector('body')!;
      let received = false;
      body.addEventListener('copy', () => {
        received = true;
      });
      body.dispatchEvent(new ClipboardEvent('copy', { bubbles: true }));
      assert.ok(received);
    });
    it('dispatches paste event with clipboardData', () => {
      const win = createWindow();
      const body = win.document.querySelector('body')!;
      let pastedData: string | null = null;
      body.addEventListener('paste', (e) => {
        const clipEvent = e as unknown as ClipboardEvent;
        if (clipEvent.clipboardData) {
          pastedData = clipEvent.clipboardData.getData('text/plain');
        }
      });
      const dt = new DataTransfer();
      dt.setData('text/plain', 'pasted text');
      body.dispatchEvent(
        new ClipboardEvent('paste', { bubbles: true, clipboardData: dt }),
      );
      assert.equal(pastedData, 'pasted text');
    });
    it('dispatches cut event', () => {
      const win = createWindow();
      const body = win.document.querySelector('body')!;
      let cutFired = false;
      body.addEventListener('cut', () => {
        cutFired = true;
      });
      body.dispatchEvent(new ClipboardEvent('cut', { bubbles: true }));
      assert.ok(cutFired);
    });
  });
});
