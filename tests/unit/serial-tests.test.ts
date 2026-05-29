import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import {
  describe,
  setSerialMode,
  getSerialMode,
} from '../../src/test-runner/index.js';

nodeDescribe('describe.serial API', () => {
  nodeIt('serial method exists on describe', () => {
    assert.equal(typeof describe.serial, 'function');
  });
});

nodeDescribe('setSerialMode / getSerialMode', () => {
  nodeIt('default is non-serial (backward compatible)', () => {
    assert.equal(getSerialMode(), false);
  });
  nodeIt('setSerialMode(true) changes mode', () => {
    const original = getSerialMode();
    setSerialMode(true);
    assert.equal(getSerialMode(), true);
    setSerialMode(original);
  });
  nodeIt('setSerialMode(false) restores normal mode', () => {
    setSerialMode(true);
    setSerialMode(false);
    assert.equal(getSerialMode(), false);
  });
  nodeIt('setSerialMode toggles correctly', () => {
    setSerialMode(true);
    assert.equal(getSerialMode(), true);
    setSerialMode(false);
    assert.equal(getSerialMode(), false);
    setSerialMode(true);
    assert.equal(getSerialMode(), true);
    setSerialMode(false);
  });
});
