/**
 * Typed HTML element classes for complete DOM simulation.
 * @module dom/html-elements
 */

import { Element, Event, Node } from './index.js';

/**
 * ValidityState — represents the validity states of a form element.
 */
export class ValidityState {
  private _customError: boolean;
  private _getFlags: () => ValidityFlags;

  constructor(
    customErrorGetter: () => boolean,
    flagsGetter: () => ValidityFlags,
  ) {
    this._customError = customErrorGetter();
    this._getFlags = flagsGetter;
  }

  get badInput(): boolean {
    return this._getFlags().badInput;
  }

  get customError(): boolean {
    return this._customError;
  }

  get patternMismatch(): boolean {
    return this._getFlags().patternMismatch;
  }

  get rangeOverflow(): boolean {
    return this._getFlags().rangeOverflow;
  }

  get rangeUnderflow(): boolean {
    return this._getFlags().rangeUnderflow;
  }

  get stepMismatch(): boolean {
    return this._getFlags().stepMismatch;
  }

  get tooLong(): boolean {
    return this._getFlags().tooLong;
  }

  get tooShort(): boolean {
    return this._getFlags().tooShort;
  }

  get typeMismatch(): boolean {
    return this._getFlags().typeMismatch;
  }

  get valueMissing(): boolean {
    return this._getFlags().valueMissing;
  }

  get valid(): boolean {
    return (
      !this.badInput &&
      !this.customError &&
      !this.patternMismatch &&
      !this.rangeOverflow &&
      !this.rangeUnderflow &&
      !this.stepMismatch &&
      !this.tooLong &&
      !this.tooShort &&
      !this.typeMismatch &&
      !this.valueMissing
    );
  }
}

interface ValidityFlags {
  badInput: boolean;
  patternMismatch: boolean;
  rangeOverflow: boolean;
  rangeUnderflow: boolean;
  stepMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
  typeMismatch: boolean;
  valueMissing: boolean;
}

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
  public minLength = -1;
  public maxLength = -1;

  private _customValidationMessage = '';

  constructor() {
    super('input');
  }

  get willValidate(): boolean {
    return !this.disabled;
  }

  get validationMessage(): string {
    return this._customValidationMessage;
  }

  get validity(): ValidityState {
    return new ValidityState(
      () => this._customValidationMessage !== '',
      () => this._computeValidityFlags(),
    );
  }

  setCustomValidity(message: string): void {
    this._customValidationMessage = message;
  }

  checkValidity(): boolean {
    return this.validity.valid;
  }

  reportValidity(): boolean {
    return this.checkValidity();
  }

  private _computeValidityFlags(): ValidityFlags {
    const numericTypes = ['number', 'range'];
    const isNumeric = numericTypes.includes(this.type);
    const numVal = parseFloat(this.value);

    let valueMissing = false;
    if (this.required) {
      if (this.type === 'checkbox') {
        valueMissing = !this.checked;
      } else {
        valueMissing = this.value === '';
      }
    }

    let patternMismatch = false;
    if (this.pattern !== '' && this.value !== '') {
      try {
        const re = new RegExp(`^(?:${this.pattern})$`);
        patternMismatch = !re.test(this.value);
      } catch {
        patternMismatch = false;
      }
    }

    let typeMismatch = false;
    if (this.value !== '') {
      if (this.type === 'email') {
        typeMismatch = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
      } else if (this.type === 'url') {
        try {
          new URL(this.value);
        } catch {
          typeMismatch = true;
        }
      }
    }

    let rangeOverflow = false;
    if (isNumeric && this.max !== '' && !isNaN(numVal)) {
      rangeOverflow = numVal > parseFloat(this.max);
    }

    let rangeUnderflow = false;
    if (isNumeric && this.min !== '' && !isNaN(numVal)) {
      rangeUnderflow = numVal < parseFloat(this.min);
    }

    let stepMismatch = false;
    if (isNumeric && this.step !== '' && this.value !== '') {
      const stepVal = parseFloat(this.step);
      const base = this.min !== '' ? parseFloat(this.min) : 0;
      if (!isNaN(stepVal) && stepVal > 0 && !isNaN(numVal)) {
        const diff = Math.abs((numVal - base) % stepVal);
        stepMismatch = diff > 1e-10 && Math.abs(diff - stepVal) > 1e-10;
      }
    }

    let tooLong = false;
    if (this.maxLength >= 0 && this.value.length > this.maxLength) {
      tooLong = true;
    }

    let tooShort = false;
    if (
      this.minLength >= 0 &&
      this.value !== '' &&
      this.value.length < this.minLength
    ) {
      tooShort = true;
    }

    return {
      badInput: false,
      patternMismatch,
      rangeOverflow,
      rangeUnderflow,
      stepMismatch,
      tooLong,
      tooShort,
      typeMismatch,
      valueMissing,
    };
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

  private _customValidationMessage = '';

  constructor() {
    super('select');
  }

  get willValidate(): boolean {
    return !this.disabled;
  }

  get validationMessage(): string {
    return this._customValidationMessage;
  }

  get validity(): ValidityState {
    return new ValidityState(
      () => this._customValidationMessage !== '',
      () => ({
        badInput: false,
        patternMismatch: false,
        rangeOverflow: false,
        rangeUnderflow: false,
        stepMismatch: false,
        tooLong: false,
        tooShort: false,
        typeMismatch: false,
        valueMissing: this.required && this.value === '',
      }),
    );
  }

  setCustomValidity(message: string): void {
    this._customValidationMessage = message;
  }

  checkValidity(): boolean {
    return this.validity.valid;
  }

  reportValidity(): boolean {
    return this.checkValidity();
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
  public minLength = -1;
  public maxLength = -1;

  private _customValidationMessage = '';

  constructor() {
    super('textarea');
  }

  get willValidate(): boolean {
    return !this.disabled;
  }

  get validationMessage(): string {
    return this._customValidationMessage;
  }

  get validity(): ValidityState {
    return new ValidityState(
      () => this._customValidationMessage !== '',
      () => ({
        badInput: false,
        patternMismatch: false,
        rangeOverflow: false,
        rangeUnderflow: false,
        stepMismatch: false,
        tooLong: this.maxLength >= 0 && this.value.length > this.maxLength,
        tooShort:
          this.minLength >= 0 &&
          this.value !== '' &&
          this.value.length < this.minLength,
        typeMismatch: false,
        valueMissing: this.required && this.value === '',
      }),
    );
  }

  setCustomValidity(message: string): void {
    this._customValidationMessage = message;
  }

  checkValidity(): boolean {
    return this.validity.valid;
  }

  reportValidity(): boolean {
    return this.checkValidity();
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
