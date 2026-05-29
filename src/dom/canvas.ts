/**
 * CanvasRenderingContext2D stub for DOM simulation.
 * @module dom/canvas
 */

import type { Element } from './index.js';

/**
 * CanvasGradient stub \u2014 records color stops for test inspection.
 */
export class CanvasGradient {
  private _stops: Array<{ offset: number; color: string }> = [];

  addColorStop(offset: number, color: string): void {
    this._stops.push({ offset, color });
  }

  /** @internal Test helper to inspect recorded stops. */
  __getStops(): Array<{ offset: number; color: string }> {
    return [...this._stops];
  }
}

/**
 * CanvasPattern stub \u2014 empty implementation for testing.
 */
export class CanvasPattern {
  // empty stub
}

/**
 * Minimal ImageData implementation for canvas operations.
 */
export class ImageData {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

/** Saved state shape for save/restore. */
interface CanvasState {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  globalCompositeOperation: string;
}

/**
 * CanvasRenderingContext2D stub — records draw calls for test inspection.
 */
export class CanvasRenderingContext2D {
  canvas: Element;
  fillStyle: string = '#000000';
  strokeStyle: string = '#000000';
  lineWidth: number = 1;
  lineCap: string = 'butt';
  lineJoin: string = 'miter';
  font: string = '10px sans-serif';
  textAlign: string = 'start';
  textBaseline: string = 'alphabetic';
  globalAlpha: number = 1;
  globalCompositeOperation: string = 'source-over';

  private _drawCalls: Array<{ method: string; args: unknown[] }> = [];
  private _stateStack: CanvasState[] = [];

  constructor(canvas: Element) {
    this.canvas = canvas;
  }

  private _record(method: string, args: unknown[]): void {
    this._drawCalls.push({ method, args });
  }

  // Path methods
  beginPath(): void {
    this._record('beginPath', []);
  }

  closePath(): void {
    this._record('closePath', []);
  }

  moveTo(x: number, y: number): void {
    this._record('moveTo', [x, y]);
  }

  lineTo(x: number, y: number): void {
    this._record('lineTo', [x, y]);
  }

  arc(
    x: number,
    y: number,
    r: number,
    start: number,
    end: number,
    ccw?: boolean,
  ): void {
    this._record('arc', [x, y, r, start, end, ccw]);
  }

  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void {
    this._record('arcTo', [x1, y1, x2, y2, r]);
  }

  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    this._record('bezierCurveTo', [cp1x, cp1y, cp2x, cp2y, x, y]);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this._record('quadraticCurveTo', [cpx, cpy, x, y]);
  }

  rect(x: number, y: number, w: number, h: number): void {
    this._record('rect', [x, y, w, h]);
  }

  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
    ccw?: boolean,
  ): void {
    this._record('ellipse', [x, y, rx, ry, rotation, start, end, ccw]);
  }

  // Drawing methods
  fill(): void {
    this._record('fill', []);
  }

  stroke(): void {
    this._record('stroke', []);
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this._record('fillRect', [x, y, w, h]);
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this._record('strokeRect', [x, y, w, h]);
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this._record('clearRect', [x, y, w, h]);
  }

  // Text methods
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    this._record('fillText', [text, x, y, maxWidth]);
  }

  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    this._record('strokeText', [text, x, y, maxWidth]);
  }

  measureText(text: string): { width: number } {
    return { width: text.length * 10 };
  }

  // Image methods
  drawImage(...args: unknown[]): void {
    this._record('drawImage', args);
  }

  createImageData(w: number, h: number): ImageData {
    return new ImageData(w, h);
  }

  getImageData(_sx: number, _sy: number, sw: number, sh: number): ImageData {
    return new ImageData(sw, sh);
  }

  putImageData(_data: ImageData, _dx: number, _dy: number): void {
    this._record('putImageData', [_data, _dx, _dy]);
  }

  // Gradient & pattern methods
  createLinearGradient(
    _x0: number,
    _y0: number,
    _x1: number,
    _y1: number,
  ): CanvasGradient {
    this._record('createLinearGradient', [_x0, _y0, _x1, _y1]);
    return new CanvasGradient();
  }

  createRadialGradient(
    _x0: number,
    _y0: number,
    _r0: number,
    _x1: number,
    _y1: number,
    _r1: number,
  ): CanvasGradient {
    this._record('createRadialGradient', [_x0, _y0, _r0, _x1, _y1, _r1]);
    return new CanvasGradient();
  }

  createPattern(
    _image: Element,
    _repetition: string | null,
  ): CanvasPattern | null {
    this._record('createPattern', [_image, _repetition]);
    return new CanvasPattern();
  }

  // Clipping
  clip(): void {
    this._record('clip', []);
  }

  // Hit testing
  isPointInPath(_x: number, _y: number): boolean {
    return false;
  }

  isPointInStroke(_x: number, _y: number): boolean {
    return false;
  }

  // Transform methods
  translate(x: number, y: number): void {
    this._record('translate', [x, y]);
  }

  rotate(angle: number): void {
    this._record('rotate', [angle]);
  }

  scale(x: number, y: number): void {
    this._record('scale', [x, y]);
  }

  transform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void {
    this._record('transform', [a, b, c, d, e, f]);
  }

  setTransform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ): void {
    this._record('setTransform', [a, b, c, d, e, f]);
  }

  resetTransform(): void {
    this._record('resetTransform', []);
  }

  // State methods
  save(): void {
    this._stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      globalAlpha: this.globalAlpha,
      globalCompositeOperation: this.globalCompositeOperation,
    });
    this._record('save', []);
  }

  restore(): void {
    const state = this._stateStack.pop();
    if (state) {
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.lineCap = state.lineCap;
      this.lineJoin = state.lineJoin;
      this.font = state.font;
      this.textAlign = state.textAlign;
      this.textBaseline = state.textBaseline;
      this.globalAlpha = state.globalAlpha;
      this.globalCompositeOperation = state.globalCompositeOperation;
    }
    this._record('restore', []);
  }

  // Test inspection
  __getDrawCalls(): Array<{ method: string; args: unknown[] }> {
    return [...this._drawCalls];
  }

  __clearDrawCalls(): void {
    this._drawCalls.length = 0;
  }
}
