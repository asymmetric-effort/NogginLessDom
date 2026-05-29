import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';
import { HTMLCanvasElement } from '../../src/dom/html-elements.js';
import {
  CanvasRenderingContext2D,
  CanvasGradient,
  CanvasPattern,
  ImageData,
} from '../../src/dom/canvas.js';

describe('Canvas Extended Methods', () => {
  function createCtx(): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const doc = new Document();
    const canvas = doc.createElement('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
  }

  describe('createLinearGradient', () => {
    it('should return a CanvasGradient', () => {
      const { ctx } = createCtx();
      const gradient = ctx.createLinearGradient(0, 0, 100, 100);
      assert.ok(gradient instanceof CanvasGradient);
    });

    it('should record the draw call', () => {
      const { ctx } = createCtx();
      ctx.createLinearGradient(10, 20, 30, 40);
      const calls = ctx.__getDrawCalls();
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0]!.method, 'createLinearGradient');
      assert.deepStrictEqual(calls[0]!.args, [10, 20, 30, 40]);
    });

    it('should support addColorStop', () => {
      const { ctx } = createCtx();
      const gradient = ctx.createLinearGradient(0, 0, 100, 0);
      gradient.addColorStop(0, 'red');
      gradient.addColorStop(1, 'blue');
      const stops = gradient.__getStops();
      assert.strictEqual(stops.length, 2);
      assert.deepStrictEqual(stops[0], { offset: 0, color: 'red' });
      assert.deepStrictEqual(stops[1], { offset: 1, color: 'blue' });
    });
  });

  describe('createRadialGradient', () => {
    it('should return a CanvasGradient', () => {
      const { ctx } = createCtx();
      const gradient = ctx.createRadialGradient(50, 50, 10, 50, 50, 100);
      assert.ok(gradient instanceof CanvasGradient);
    });

    it('should record the draw call with all six args', () => {
      const { ctx } = createCtx();
      ctx.createRadialGradient(10, 20, 30, 40, 50, 60);
      const calls = ctx.__getDrawCalls();
      assert.strictEqual(calls[0]!.method, 'createRadialGradient');
      assert.deepStrictEqual(calls[0]!.args, [10, 20, 30, 40, 50, 60]);
    });

    it('should support addColorStop on radial gradient', () => {
      const { ctx } = createCtx();
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
      gradient.addColorStop(0.5, 'green');
      assert.strictEqual(gradient.__getStops().length, 1);
      assert.strictEqual(gradient.__getStops()[0]!.color, 'green');
    });
  });

  describe('createPattern', () => {
    it('should return a CanvasPattern', () => {
      const { ctx } = createCtx();
      const doc = new Document();
      const img = doc.createElement('img');
      const pattern = ctx.createPattern(img, 'repeat');
      assert.ok(pattern instanceof CanvasPattern);
    });

    it('should record the draw call', () => {
      const { ctx } = createCtx();
      const doc = new Document();
      const img = doc.createElement('img');
      ctx.createPattern(img, 'no-repeat');
      const calls = ctx.__getDrawCalls();
      assert.strictEqual(calls[0]!.method, 'createPattern');
    });
  });

  describe('clip', () => {
    it('should record the clip call', () => {
      const { ctx } = createCtx();
      ctx.clip();
      const calls = ctx.__getDrawCalls();
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0]!.method, 'clip');
      assert.deepStrictEqual(calls[0]!.args, []);
    });
  });

  describe('isPointInPath', () => {
    it('should return false', () => {
      const { ctx } = createCtx();
      assert.strictEqual(ctx.isPointInPath(50, 50), false);
    });

    it('should return false for any coordinates', () => {
      const { ctx } = createCtx();
      assert.strictEqual(ctx.isPointInPath(0, 0), false);
      assert.strictEqual(ctx.isPointInPath(-100, 200), false);
    });
  });

  describe('isPointInStroke', () => {
    it('should return false', () => {
      const { ctx } = createCtx();
      assert.strictEqual(ctx.isPointInStroke(50, 50), false);
    });

    it('should return false for any coordinates', () => {
      const { ctx } = createCtx();
      assert.strictEqual(ctx.isPointInStroke(0, 0), false);
    });
  });

  describe('getImageData', () => {
    it('should return ImageData with correct dimensions', () => {
      const { ctx } = createCtx();
      const imageData = ctx.getImageData(0, 0, 100, 50);
      assert.ok(imageData instanceof ImageData);
      assert.strictEqual(imageData.width, 100);
      assert.strictEqual(imageData.height, 50);
    });

    it('should return zeroed pixel data of correct size', () => {
      const { ctx } = createCtx();
      const imageData = ctx.getImageData(10, 10, 20, 30);
      assert.strictEqual(imageData.data.length, 20 * 30 * 4);
      for (let i = 0; i < imageData.data.length; i++) {
        assert.strictEqual(imageData.data[i], 0);
      }
    });
  });

  describe('createImageData', () => {
    it('should return ImageData with correct dimensions', () => {
      const { ctx } = createCtx();
      const imageData = ctx.createImageData(64, 32);
      assert.ok(imageData instanceof ImageData);
      assert.strictEqual(imageData.width, 64);
      assert.strictEqual(imageData.height, 32);
    });

    it('should return zeroed pixel data', () => {
      const { ctx } = createCtx();
      const imageData = ctx.createImageData(2, 2);
      assert.strictEqual(imageData.data.length, 2 * 2 * 4);
      for (let i = 0; i < imageData.data.length; i++) {
        assert.strictEqual(imageData.data[i], 0);
      }
    });
  });

  describe('HTMLCanvasElement.toDataURL', () => {
    it('should return a data URI with image/png by default', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      const result = canvas.toDataURL();
      assert.ok(result.startsWith('data:image/png;base64,'));
    });

    it('should return a data URI with specified type', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      const result = canvas.toDataURL('image/jpeg');
      assert.ok(result.startsWith('data:image/jpeg;base64,'));
    });
  });

  describe('HTMLCanvasElement.toBlob', () => {
    it('should call callback with null', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      let called = false;
      let receivedBlob: null | undefined;
      canvas.toBlob((blob) => {
        called = true;
        receivedBlob = blob;
      });
      assert.strictEqual(called, true);
      assert.strictEqual(receivedBlob, null);
    });

    it('should accept optional type and quality params', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      let called = false;
      canvas.toBlob(
        () => {
          called = true;
        },
        'image/jpeg',
        0.9,
      );
      assert.strictEqual(called, true);
    });
  });

  describe('CanvasGradient class', () => {
    it('should start with no stops', () => {
      const gradient = new CanvasGradient();
      assert.deepStrictEqual(gradient.__getStops(), []);
    });

    it('should accumulate multiple stops', () => {
      const gradient = new CanvasGradient();
      gradient.addColorStop(0, 'red');
      gradient.addColorStop(0.5, 'green');
      gradient.addColorStop(1, 'blue');
      assert.strictEqual(gradient.__getStops().length, 3);
    });
  });

  describe('CanvasPattern class', () => {
    it('should be constructable', () => {
      const pattern = new CanvasPattern();
      assert.ok(pattern instanceof CanvasPattern);
    });
  });
});
