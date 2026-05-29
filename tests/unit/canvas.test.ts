import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';
import { HTMLCanvasElement } from '../../src/dom/html-elements.js';
import { CanvasRenderingContext2D, ImageData } from '../../src/dom/canvas.js';

describe('CanvasRenderingContext2D', () => {
  describe('getContext', () => {
    it('should return a CanvasRenderingContext2D for "2d"', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      assert.ok(ctx instanceof CanvasRenderingContext2D);
    });

    it('should return the same context on repeated calls', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      const ctx1 = canvas.getContext('2d');
      const ctx2 = canvas.getContext('2d');
      assert.strictEqual(ctx1, ctx2);
    });

    it('should return null for "webgl"', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('webgl');
      assert.strictEqual(ctx, null);
    });

    it('should return null for unknown context types', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('3d');
      assert.strictEqual(ctx, null);
    });

    it('should have canvas reference on the context', () => {
      const doc = new Document();
      const canvas = doc.createElement('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      assert.strictEqual(ctx.canvas, canvas);
    });
  });

  describe('default properties', () => {
    it('should have correct default values', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      assert.strictEqual(ctx.fillStyle, '#000000');
      assert.strictEqual(ctx.strokeStyle, '#000000');
      assert.strictEqual(ctx.lineWidth, 1);
      assert.strictEqual(ctx.lineCap, 'butt');
      assert.strictEqual(ctx.lineJoin, 'miter');
      assert.strictEqual(ctx.font, '10px sans-serif');
      assert.strictEqual(ctx.textAlign, 'start');
      assert.strictEqual(ctx.textBaseline, 'alphabetic');
      assert.strictEqual(ctx.globalAlpha, 1);
      assert.strictEqual(ctx.globalCompositeOperation, 'source-over');
    });

    it('should allow setting properties', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'bevel';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = 'multiply';

      assert.strictEqual(ctx.fillStyle, 'red');
      assert.strictEqual(ctx.strokeStyle, 'blue');
      assert.strictEqual(ctx.lineWidth, 5);
      assert.strictEqual(ctx.lineCap, 'round');
      assert.strictEqual(ctx.lineJoin, 'bevel');
      assert.strictEqual(ctx.font, '20px Arial');
      assert.strictEqual(ctx.textAlign, 'center');
      assert.strictEqual(ctx.textBaseline, 'middle');
      assert.strictEqual(ctx.globalAlpha, 0.5);
      assert.strictEqual(ctx.globalCompositeOperation, 'multiply');
    });
  });

  describe('path methods', () => {
    it('should record beginPath', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.beginPath();
      const calls = ctx.__getDrawCalls();
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0]!.method, 'beginPath');
    });

    it('should record closePath', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.closePath();
      assert.strictEqual(ctx.__getDrawCalls()[0]!.method, 'closePath');
    });

    it('should record moveTo', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.moveTo(10, 20);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'moveTo');
      assert.deepStrictEqual(call.args, [10, 20]);
    });

    it('should record lineTo', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.lineTo(30, 40);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'lineTo');
      assert.deepStrictEqual(call.args, [30, 40]);
    });

    it('should record arc', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.arc(50, 50, 25, 0, Math.PI, true);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'arc');
      assert.deepStrictEqual(call.args, [50, 50, 25, 0, Math.PI, true]);
    });

    it('should record arcTo', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.arcTo(1, 2, 3, 4, 5);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'arcTo');
      assert.deepStrictEqual(call.args, [1, 2, 3, 4, 5]);
    });

    it('should record bezierCurveTo', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.bezierCurveTo(1, 2, 3, 4, 5, 6);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'bezierCurveTo');
      assert.deepStrictEqual(call.args, [1, 2, 3, 4, 5, 6]);
    });

    it('should record quadraticCurveTo', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.quadraticCurveTo(1, 2, 3, 4);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'quadraticCurveTo');
      assert.deepStrictEqual(call.args, [1, 2, 3, 4]);
    });

    it('should record rect', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.rect(0, 0, 100, 50);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'rect');
      assert.deepStrictEqual(call.args, [0, 0, 100, 50]);
    });

    it('should record ellipse', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.ellipse(50, 50, 30, 20, 0, 0, Math.PI * 2, false);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'ellipse');
      assert.deepStrictEqual(call.args, [
        50,
        50,
        30,
        20,
        0,
        0,
        Math.PI * 2,
        false,
      ]);
    });
  });

  describe('drawing methods', () => {
    it('should record fill', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fill();
      assert.strictEqual(ctx.__getDrawCalls()[0]!.method, 'fill');
    });

    it('should record stroke', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.stroke();
      assert.strictEqual(ctx.__getDrawCalls()[0]!.method, 'stroke');
    });

    it('should record fillRect', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillRect(0, 0, 100, 100);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'fillRect');
      assert.deepStrictEqual(call.args, [0, 0, 100, 100]);
    });

    it('should record strokeRect', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.strokeRect(5, 5, 90, 90);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'strokeRect');
      assert.deepStrictEqual(call.args, [5, 5, 90, 90]);
    });

    it('should record clearRect', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 300, 150);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'clearRect');
      assert.deepStrictEqual(call.args, [0, 0, 300, 150]);
    });
  });

  describe('text methods', () => {
    it('should record fillText', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillText('hello', 10, 20);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'fillText');
      assert.deepStrictEqual(call.args, ['hello', 10, 20, undefined]);
    });

    it('should record fillText with maxWidth', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillText('hello', 10, 20, 100);
      const call = ctx.__getDrawCalls()[0]!;
      assert.deepStrictEqual(call.args, ['hello', 10, 20, 100]);
    });

    it('should record strokeText', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.strokeText('world', 30, 40);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'strokeText');
      assert.deepStrictEqual(call.args, ['world', 30, 40, undefined]);
    });

    it('should measure text width based on length', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      const metrics = ctx.measureText('hello');
      assert.strictEqual(metrics.width, 50); // 5 chars * 10
    });

    it('should measure empty text as 0', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      assert.strictEqual(ctx.measureText('').width, 0);
    });
  });

  describe('image methods', () => {
    it('should record drawImage', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage('img', 0, 0);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'drawImage');
      assert.deepStrictEqual(call.args, ['img', 0, 0]);
    });

    it('should create ImageData', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      const data = ctx.createImageData(10, 20);
      assert.ok(data instanceof ImageData);
      assert.strictEqual(data.width, 10);
      assert.strictEqual(data.height, 20);
      assert.strictEqual(data.data.length, 10 * 20 * 4);
    });

    it('should get ImageData', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      const data = ctx.getImageData(0, 0, 5, 5);
      assert.ok(data instanceof ImageData);
      assert.strictEqual(data.width, 5);
      assert.strictEqual(data.height, 5);
    });

    it('should record putImageData', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      const data = new ImageData(2, 2);
      ctx.putImageData(data, 0, 0);
      const call = ctx.__getDrawCalls()[0]!;
      assert.strictEqual(call.method, 'putImageData');
    });
  });

  describe('transform methods', () => {
    it('should record translate', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.translate(10, 20);
      assert.deepStrictEqual(ctx.__getDrawCalls()[0], {
        method: 'translate',
        args: [10, 20],
      });
    });

    it('should record rotate', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.rotate(Math.PI);
      assert.strictEqual(ctx.__getDrawCalls()[0]!.method, 'rotate');
    });

    it('should record scale', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 3);
      assert.deepStrictEqual(ctx.__getDrawCalls()[0]!.args, [2, 3]);
    });

    it('should record transform', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.transform(1, 0, 0, 1, 0, 0);
      assert.strictEqual(ctx.__getDrawCalls()[0]!.method, 'transform');
      assert.deepStrictEqual(ctx.__getDrawCalls()[0]!.args, [1, 0, 0, 1, 0, 0]);
    });

    it('should record setTransform', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 5, 10);
      assert.strictEqual(ctx.__getDrawCalls()[0]!.method, 'setTransform');
    });

    it('should record resetTransform', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.resetTransform();
      assert.strictEqual(ctx.__getDrawCalls()[0]!.method, 'resetTransform');
    });
  });

  describe('save/restore', () => {
    it('should save and restore state', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.lineWidth = 5;
      ctx.save();

      ctx.fillStyle = 'blue';
      ctx.lineWidth = 10;
      assert.strictEqual(ctx.fillStyle, 'blue');
      assert.strictEqual(ctx.lineWidth, 10);

      ctx.restore();
      assert.strictEqual(ctx.fillStyle, 'red');
      assert.strictEqual(ctx.lineWidth, 5);
    });

    it('should handle multiple save/restore levels', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.font = 'A';
      ctx.save();
      ctx.font = 'B';
      ctx.save();
      ctx.font = 'C';

      ctx.restore();
      assert.strictEqual(ctx.font, 'B');
      ctx.restore();
      assert.strictEqual(ctx.font, 'A');
    });

    it('should not crash when restoring without save', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'green';
      ctx.restore(); // no-op
      assert.strictEqual(ctx.fillStyle, 'green');
    });

    it('should record save and restore in draw calls', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.save();
      ctx.restore();
      const calls = ctx.__getDrawCalls();
      assert.strictEqual(calls[0]!.method, 'save');
      assert.strictEqual(calls[1]!.method, 'restore');
    });

    it('should save/restore all state properties', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'bevel';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = 'multiply';
      ctx.save();

      ctx.fillStyle = 'a';
      ctx.strokeStyle = 'b';
      ctx.lineWidth = 99;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'round';
      ctx.font = 'x';
      ctx.textAlign = 'end';
      ctx.textBaseline = 'bottom';
      ctx.globalAlpha = 0.1;
      ctx.globalCompositeOperation = 'screen';

      ctx.restore();
      assert.strictEqual(ctx.fillStyle, 'red');
      assert.strictEqual(ctx.strokeStyle, 'blue');
      assert.strictEqual(ctx.lineWidth, 3);
      assert.strictEqual(ctx.lineCap, 'round');
      assert.strictEqual(ctx.lineJoin, 'bevel');
      assert.strictEqual(ctx.font, '20px Arial');
      assert.strictEqual(ctx.textAlign, 'center');
      assert.strictEqual(ctx.textBaseline, 'top');
      assert.strictEqual(ctx.globalAlpha, 0.5);
      assert.strictEqual(ctx.globalCompositeOperation, 'multiply');
    });
  });

  describe('__getDrawCalls and __clearDrawCalls', () => {
    it('should accumulate draw calls', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillRect(0, 0, 10, 10);
      ctx.strokeRect(0, 0, 20, 20);
      ctx.beginPath();
      assert.strictEqual(ctx.__getDrawCalls().length, 3);
    });

    it('should clear draw calls', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fillRect(0, 0, 10, 10);
      assert.strictEqual(ctx.__getDrawCalls().length, 1);
      ctx.__clearDrawCalls();
      assert.strictEqual(ctx.__getDrawCalls().length, 0);
    });

    it('should return a copy of draw calls', () => {
      const canvas = new HTMLCanvasElement();
      const ctx = canvas.getContext('2d')!;
      ctx.fill();
      const calls1 = ctx.__getDrawCalls();
      ctx.stroke();
      const calls2 = ctx.__getDrawCalls();
      assert.strictEqual(calls1.length, 1);
      assert.strictEqual(calls2.length, 2);
    });
  });

  describe('ImageData', () => {
    it('should create with correct dimensions', () => {
      const data = new ImageData(10, 20);
      assert.strictEqual(data.width, 10);
      assert.strictEqual(data.height, 20);
    });

    it('should have correct data length', () => {
      const data = new ImageData(3, 4);
      assert.strictEqual(data.data.length, 3 * 4 * 4);
    });

    it('should initialize data to zero', () => {
      const data = new ImageData(2, 2);
      for (let i = 0; i < data.data.length; i++) {
        assert.strictEqual(data.data[i], 0);
      }
    });

    it('should use Uint8ClampedArray', () => {
      const data = new ImageData(1, 1);
      assert.ok(data.data instanceof Uint8ClampedArray);
    });
  });
});
