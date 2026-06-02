/**
 * SVG namespace support for DOM simulation.
 * @module dom/svg
 */

import { Element } from './index.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Base SVG element class.
 */
export class SVGElement extends Element {
  constructor(tagName: string) {
    super(tagName, SVG_NAMESPACE);
  }

  /**
   * SVG viewBox property stub. Parses the viewBox attribute.
   */
  get viewBox(): {
    baseVal: { x: number; y: number; width: number; height: number };
  } {
    const attr = this.getAttribute('viewBox') ?? '0 0 0 0';
    const parts = attr.trim().split(/\s+|,/).map(Number);
    return {
      baseVal: {
        x: parts[0] ?? 0,
        y: parts[1] ?? 0,
        width: parts[2] ?? 0,
        height: parts[3] ?? 0,
      },
    };
  }
}

/**
 * SVGSVGElement — the root <svg> element.
 */
export class SVGSVGElement extends SVGElement {
  constructor() {
    super('svg');
  }

  createSVGRect(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  createSVGPoint(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }

  createSVGMatrix(): {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
  } {
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  }
}

/**
 * SVGPathElement — <path> element.
 */
export class SVGPathElement extends SVGElement {
  constructor() {
    super('path');
  }
}

/**
 * SVGCircleElement — <circle> element.
 */
export class SVGCircleElement extends SVGElement {
  constructor() {
    super('circle');
  }

  get cx(): { baseVal: { value: number } } {
    return { baseVal: { value: parseFloat(this.getAttribute('cx') ?? '0') } };
  }

  get cy(): { baseVal: { value: number } } {
    return { baseVal: { value: parseFloat(this.getAttribute('cy') ?? '0') } };
  }

  get r(): { baseVal: { value: number } } {
    return { baseVal: { value: parseFloat(this.getAttribute('r') ?? '0') } };
  }
}

/**
 * SVGRectElement — <rect> element.
 */
export class SVGRectElement extends SVGElement {
  constructor() {
    super('rect');
  }
}

/**
 * SVGLineElement — <line> element.
 */
export class SVGLineElement extends SVGElement {
  constructor() {
    super('line');
  }
}

/**
 * SVGTextElement — <text> element.
 */
export class SVGTextElement extends SVGElement {
  constructor() {
    super('text');
  }
}

/**
 * SVGGElement — <g> group element.
 */
export class SVGGElement extends SVGElement {
  constructor() {
    super('g');
  }
}

/**
 * SVGDefsElement — <defs> element.
 */
export class SVGDefsElement extends SVGElement {
  constructor() {
    super('defs');
  }
}

/**
 * SVGUseElement — <use> element.
 */
export class SVGUseElement extends SVGElement {
  constructor() {
    super('use');
  }

  get href(): { baseVal: string } {
    return {
      baseVal:
        this.getAttribute('href') ?? this.getAttribute('xlink:href') ?? '',
    };
  }
}

/**
 * Map from SVG tag names to their constructors.
 */
export const SVG_ELEMENT_MAP: Record<string, new () => SVGElement> = {
  svg: SVGSVGElement,
  path: SVGPathElement,
  circle: SVGCircleElement,
  rect: SVGRectElement,
  line: SVGLineElement,
  text: SVGTextElement,
  g: SVGGElement,
  defs: SVGDefsElement,
  use: SVGUseElement,
};
