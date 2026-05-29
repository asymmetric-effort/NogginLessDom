import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Event } from '../../src/dom/index.js';

describe('Page Visibility API', () => {
  it('default visibilityState is visible', () => {
    const doc = new Document();
    assert.equal(doc.visibilityState, 'visible');
  });
  it('hidden is false by default', () => {
    const doc = new Document();
    assert.equal(doc.hidden, false);
  });
  it('setVisibility hidden changes state', () => {
    const doc = new Document();
    doc.setVisibility('hidden');
    assert.equal(doc.visibilityState, 'hidden');
    assert.equal(doc.hidden, true);
  });
  it('setVisibility visible changes state back', () => {
    const doc = new Document();
    doc.setVisibility('hidden');
    doc.setVisibility('visible');
    assert.equal(doc.visibilityState, 'visible');
    assert.equal(doc.hidden, false);
  });
  it('visibilitychange event fires on change', () => {
    const doc = new Document();
    let eventFired = false;
    doc.addEventListener('visibilitychange', () => {
      eventFired = true;
    });
    doc.setVisibility('hidden');
    assert.ok(eventFired);
  });
  it('no event when setting same state', () => {
    const doc = new Document();
    let eventCount = 0;
    doc.addEventListener('visibilitychange', () => {
      eventCount++;
    });
    doc.setVisibility('visible');
    assert.equal(eventCount, 0);
  });
  it('event fires each time state changes', () => {
    const doc = new Document();
    let eventCount = 0;
    doc.addEventListener('visibilitychange', () => {
      eventCount++;
    });
    doc.setVisibility('hidden');
    doc.setVisibility('visible');
    doc.setVisibility('hidden');
    assert.equal(eventCount, 3);
  });
  it('removeEventListener stops notifications', () => {
    const doc = new Document();
    let eventCount = 0;
    const handler = (): void => {
      eventCount++;
    };
    doc.addEventListener('visibilitychange', handler);
    doc.setVisibility('hidden');
    assert.equal(eventCount, 1);
    doc.removeEventListener('visibilitychange', handler);
    doc.setVisibility('visible');
    assert.equal(eventCount, 1);
  });
  it('dispatchEvent works for arbitrary events', () => {
    const doc = new Document();
    let received = false;
    doc.addEventListener('custom', () => {
      received = true;
    });
    doc.dispatchEvent(new Event('custom'));
    assert.ok(received);
  });
});
