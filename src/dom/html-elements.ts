/**
 * Typed HTML element classes for complete DOM simulation.
 * @module dom/html-elements
 */

import { Element, Event, Node } from './index.js';

/**
 * HTMLAnchorElement — <a>
 */
export class HTMLAnchorElement extends Element {
  public href = '';
  public target = '';
  public rel = '';
  public download = '';
  public hash = '';
  public host = '';
  public hostname = '';
  public pathname = '';
  public port = '';
  public protocol = '';
  public search = '';

  constructor() {
    super('a');
  }

  get text(): string {
    return this.textContent;
  }

  set text(value: string) {
    this.textContent = value;
  }
}

/**
 * HTMLButtonElement — <button>
 */
export class HTMLButtonElement extends Element {
  public disabled = false;
  public type: 'submit' | 'reset' | 'button' = 'submit';
  public name = '';
  public value = '';
  public form: null = null;

  constructor() {
    super('button');
  }
}

/**
 * HTMLInputElement — <input>
 */
export class HTMLInputElement extends Element {
  public type = 'text';
  public value = '';
  public name = '';
  public disabled = false;
  public checked = false;
  public placeholder = '';
  public readOnly = false;
  public required = false;
  public min = '';
  public max = '';
  public step = '';
  public pattern = '';
  public defaultValue = '';
  public defaultChecked = false;

  constructor() {
    super('input');
  }

  focus(): void {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
    this.dispatchEvent(new Event('focus'));
  }

  blur(): void {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = null;
    }
    this.dispatchEvent(new Event('blur'));
  }

  select(): void {
    this.dispatchEvent(new Event('select'));
  }

  click(): void {
    this.dispatchEvent(new Event('click'));
  }
}

/**
 * HTMLOptionElement — <option>
 */
export class HTMLOptionElement extends Element {
  public value = '';
  public selected = false;
  public disabled = false;
  public defaultSelected = false;
  public index = 0;
  public label = '';

  constructor() {
    super('option');
  }

  get text(): string {
    return this.textContent;
  }

  set text(value: string) {
    this.textContent = value;
  }
}

/**
 * HTMLSelectElement — <select>
 */
export class HTMLSelectElement extends Element {
  public name = '';
  public disabled = false;
  public multiple = false;
  public required = false;
  public selectedIndex = -1;
  public value = '';

  constructor() {
    super('select');
  }

  get options(): HTMLOptionElement[] {
    return this.childNodes.filter(
      (child): child is HTMLOptionElement => child instanceof HTMLOptionElement,
    );
  }
}

/**
 * HTMLTextAreaElement — <textarea>
 */
export class HTMLTextAreaElement extends Element {
  public value = '';
  public name = '';
  public disabled = false;
  public readOnly = false;
  public required = false;
  public placeholder = '';
  public rows = 2;
  public cols = 20;
  public defaultValue = '';

  constructor() {
    super('textarea');
  }
}

/**
 * HTMLFormElement — <form>
 */
export class HTMLFormElement extends Element {
  public action = '';
  public method = 'get';
  public enctype = 'application/x-www-form-urlencoded';
  public target = '';
  public name = '';

  constructor() {
    super('form');
  }

  get elements(): Element[] {
    const controls: Element[] = [];
    const collect = (node: Node): void => {
      for (const child of node.childNodes) {
        if (
          child instanceof HTMLInputElement ||
          child instanceof HTMLButtonElement ||
          child instanceof HTMLSelectElement ||
          child instanceof HTMLTextAreaElement
        ) {
          controls.push(child);
        }
        if (child instanceof Element) {
          collect(child);
        }
      }
    };
    collect(this);
    return controls;
  }

  submit(): void {
    this.dispatchEvent(new Event('submit'));
  }

  reset(): void {
    this.dispatchEvent(new Event('reset'));
  }
}

/**
 * HTMLImageElement — <img>
 */
export class HTMLImageElement extends Element {
  public src = '';
  public alt = '';
  public width = 0;
  public height = 0;
  public naturalWidth = 0;
  public naturalHeight = 0;
  public complete = false;

  constructor() {
    super('img');
  }
}

/**
 * HTMLLabelElement — <label>
 */
export class HTMLLabelElement extends Element {
  public htmlFor = '';
  public form: null = null;
  public control: Element | null = null;

  constructor() {
    super('label');
  }
}

/**
 * Map of tag names to their typed element constructors.
 */
export const HTML_ELEMENT_MAP: Record<string, new () => Element> = {
  A: HTMLAnchorElement,
  BUTTON: HTMLButtonElement,
  INPUT: HTMLInputElement,
  SELECT: HTMLSelectElement,
  TEXTAREA: HTMLTextAreaElement,
  FORM: HTMLFormElement,
  IMG: HTMLImageElement,
  LABEL: HTMLLabelElement,
  OPTION: HTMLOptionElement,
};
