/**
 * Typed HTML element classes for complete DOM simulation.
 * @module dom/html-elements
 */

import { Element, Event, Node } from './index.js';

/**
 * Detect nested quantifiers that can cause catastrophic backtracking.
 * Matches patterns like (a+)+, (a*)+, (a+)*, etc.
 */
function hasNestedQuantifiers(pattern: string): boolean {
  return (
    /([+*])\s*[)]\s*[+*{]/.test(pattern) || /([+*])\s*\}\s*[+*{]/.test(pattern)
  );
}

// Helper to collect descendants by tag
function collectDescendants(root: Node, tagName: string): Element[] {
  const results: Element[] = [];
  const walk = (node: Node): void => {
    for (const child of node.childNodes) {
      if (child instanceof Element && child.tagName === tagName) {
        results.push(child);
      }
      walk(child);
    }
  };
  walk(root);
  return results;
}

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
  private _disabled = false;
  public type: 'submit' | 'reset' | 'button' = 'submit';
  public name = '';
  public value = '';
  public form: null = null;

  constructor() {
    super('button');
  }

  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }
}

/**
 * HTMLInputElement — <input>
 */
export class HTMLInputElement extends Element {
  public type = 'text';
  public value = '';
  public name = '';
  private _disabled = false;
  private _checked = false;
  public placeholder = '';
  private _readOnly = false;
  private _required = false;
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

  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  get checked(): boolean {
    return this._checked;
  }

  set checked(value: boolean) {
    this._checked = value;
    if (value) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  get readOnly(): boolean {
    return this._readOnly;
  }

  set readOnly(value: boolean) {
    this._readOnly = value;
    if (value) {
      this.setAttribute('readonly', '');
    } else {
      this.removeAttribute('readonly');
    }
  }

  get required(): boolean {
    return this._required;
  }

  set required(value: boolean) {
    this._required = value;
    if (value) {
      this.setAttribute('required', '');
    } else {
      this.removeAttribute('required');
    }
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
    const MAX_PATTERN_LENGTH = 1024;
    if (this.pattern !== '' && this.value !== '') {
      if (
        this.pattern.length > MAX_PATTERN_LENGTH ||
        hasNestedQuantifiers(this.pattern)
      ) {
        patternMismatch = false;
      } else {
        try {
          const re = new RegExp(`^(?:${this.pattern})$`);
          patternMismatch = !re.test(this.value);
        } catch {
          patternMismatch = false;
        }
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
  private _disabled = false;
  private _multiple = false;
  private _required = false;
  private _selectedIndex = -1;
  private _value: string | null = null;

  private _customValidationMessage = '';

  constructor() {
    super('select');
  }

  get selectedIndex(): number {
    if (this._selectedIndex !== -1) {
      return this._selectedIndex;
    }
    // Auto-select first non-disabled option
    const opts = this.options;
    for (let i = 0; i < opts.length; i++) {
      if (!opts[i]!.disabled) {
        return i;
      }
    }
    return -1;
  }

  set selectedIndex(value: number) {
    this._selectedIndex = value;
    this._value = null;
  }

  get value(): string {
    // If value was set directly without matching options, return it
    if (this._value !== null) {
      return this._value;
    }
    const idx = this.selectedIndex;
    const opts = this.options;
    if (idx >= 0 && idx < opts.length) {
      return opts[idx]!.value;
    }
    return '';
  }

  set value(val: string) {
    const opts = this.options;
    for (let i = 0; i < opts.length; i++) {
      if (opts[i]!.value === val) {
        this._selectedIndex = i;
        this._value = null;
        return;
      }
    }
    // No matching option found, store value directly
    this._value = val;
  }

  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  get multiple(): boolean {
    return this._multiple;
  }

  set multiple(value: boolean) {
    this._multiple = value;
    if (value) {
      this.setAttribute('multiple', '');
    } else {
      this.removeAttribute('multiple');
    }
  }

  get required(): boolean {
    return this._required;
  }

  set required(value: boolean) {
    this._required = value;
    if (value) {
      this.setAttribute('required', '');
    } else {
      this.removeAttribute('required');
    }
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
  private _disabled = false;
  private _readOnly = false;
  private _required = false;
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

  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  get readOnly(): boolean {
    return this._readOnly;
  }

  set readOnly(value: boolean) {
    this._readOnly = value;
    if (value) {
      this.setAttribute('readonly', '');
    } else {
      this.removeAttribute('readonly');
    }
  }

  get required(): boolean {
    return this._required;
  }

  set required(value: boolean) {
    this._required = value;
    if (value) {
      this.setAttribute('required', '');
    } else {
      this.removeAttribute('required');
    }
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
 * HTMLDialogElement — <dialog>
 */
export class HTMLDialogElement extends Element {
  public open = false;
  public returnValue = '';

  constructor() {
    super('dialog');
  }

  show(): void {
    this.open = true;
  }

  showModal(): void {
    this.open = true;
  }

  close(returnValue?: string): void {
    this.open = false;
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
  }
}

/**
 * HTMLCanvasElement — <canvas>
 */
export class HTMLCanvasElement extends Element {
  public width = 300;
  public height = 150;

  constructor() {
    super('canvas');
  }

  getContext(_type: string): null {
    return null;
  }

  toDataURL(type?: string, _quality?: number): string {
    if (type) {
      return `data:${type};base64,`;
    }
    return 'data:,';
  }
}

/**
 * HTMLTemplateElement — <template>
 */
export class HTMLTemplateElement extends Element {
  public readonly content: Node;

  constructor() {
    super('template');
    this.content = new Node(11, '#document-fragment');
  }
}

/**
 * HTMLIFrameElement — <iframe>
 */
export class HTMLIFrameElement extends Element {
  public src = '';
  public width = '';
  public height = '';
  public name = '';
  public contentDocument: null = null;
  public contentWindow: null = null;

  constructor() {
    super('iframe');
  }
}

/**
 * HTMLVideoElement — <video>
 */
export class HTMLVideoElement extends Element {
  public src = '';
  public controls = false;
  public autoplay = false;
  public loop = false;
  public muted = false;
  public width = 0;
  public height = 0;
  public currentTime = 0;
  public duration = 0;
  public paused = true;
  public ended = false;

  constructor() {
    super('video');
  }

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

/**
 * HTMLAudioElement — <audio>
 */
export class HTMLAudioElement extends Element {
  public src = '';
  public controls = false;
  public autoplay = false;
  public loop = false;
  public muted = false;
  public currentTime = 0;
  public duration = 0;
  public paused = true;
  public ended = false;

  constructor() {
    super('audio');
  }

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

/**
 * HTMLProgressElement — <progress>
 */
export class HTMLProgressElement extends Element {
  public value = 0;
  public max = 1;

  constructor() {
    super('progress');
  }
}

/**
 * HTMLMeterElement — <meter>
 */
export class HTMLMeterElement extends Element {
  public value = 0;
  public min = 0;
  public max = 1;
  public low = 0;
  public high = 1;
  public optimum = 0.5;

  constructor() {
    super('meter');
  }
}

/**
 * HTMLDetailsElement — <details>
 */
export class HTMLDetailsElement extends Element {
  public open = false;

  constructor() {
    super('details');
  }
}

/**
 * HTMLTableElement — <table>
 */
export class HTMLTableElement extends Element {
  constructor() {
    super('table');
  }

  get rows(): HTMLTableRowElement[] {
    return collectDescendants(this, 'TR') as HTMLTableRowElement[];
  }

  get tBodies(): Element[] {
    return collectDescendants(this, 'TBODY');
  }

  get tHead(): Element | null {
    const heads = collectDescendants(this, 'THEAD');
    return heads.length > 0 ? heads[0]! : null;
  }

  get tFoot(): Element | null {
    const foots = collectDescendants(this, 'TFOOT');
    return foots.length > 0 ? foots[0]! : null;
  }

  insertRow(index?: number): HTMLTableRowElement {
    const row = new HTMLTableRowElement();
    const rows = this.rows;
    if (index !== undefined && index >= 0 && index < rows.length) {
      this.insertBefore(row, rows[index]!);
    } else {
      this.appendChild(row);
    }
    return row;
  }

  deleteRow(index: number): void {
    const rows = this.rows;
    if (index >= 0 && index < rows.length) {
      this.removeChild(rows[index]!);
    }
  }

  createTBody(): Element {
    const tbody = new Element('tbody');
    this.appendChild(tbody);
    return tbody;
  }

  createTHead(): Element {
    const thead = new Element('thead');
    this.appendChild(thead);
    return thead;
  }

  createTFoot(): Element {
    const tfoot = new Element('tfoot');
    this.appendChild(tfoot);
    return tfoot;
  }
}

/**
 * HTMLTableRowElement — <tr>
 */
export class HTMLTableRowElement extends Element {
  constructor() {
    super('tr');
  }

  get cells(): HTMLTableCellElement[] {
    return this.childNodes.filter(
      (child): child is HTMLTableCellElement =>
        child instanceof HTMLTableCellElement,
    );
  }

  insertCell(index?: number): HTMLTableCellElement {
    const cell = new HTMLTableCellElement();
    const cells = this.cells;
    if (index !== undefined && index >= 0 && index < cells.length) {
      this.insertBefore(cell, cells[index]!);
    } else {
      this.appendChild(cell);
    }
    return cell;
  }

  deleteCell(index: number): void {
    const cells = this.cells;
    if (index >= 0 && index < cells.length) {
      this.removeChild(cells[index]!);
    }
  }

  get rowIndex(): number {
    if (!this.parentNode) return -1;
    // Walk up to find the table
    let table: HTMLTableElement | null = null;
    let current: Node | null = this.parentNode;
    while (current) {
      if (current instanceof HTMLTableElement) {
        table = current;
        break;
      }
      current = current.parentNode;
    }
    if (!table) return -1;
    const rows = table.rows;
    return rows.indexOf(this);
  }
}

/**
 * HTMLTableCellElement — <td>/<th>
 */
export class HTMLTableCellElement extends Element {
  public colSpan = 1;
  public rowSpan = 1;

  constructor(tagName: string = 'td') {
    super(tagName);
  }

  get cellIndex(): number {
    if (!this.parentNode || !(this.parentNode instanceof HTMLTableRowElement)) {
      return -1;
    }
    const cells = this.parentNode.cells;
    return cells.indexOf(this);
  }
}

/**
 * HTMLFieldSetElement — <fieldset>
 */
export class HTMLFieldSetElement extends Element {
  public disabled = false;
  public name = '';

  constructor() {
    super('fieldset');
  }
}

/**
 * HTMLScriptElement — <script>
 */
export class HTMLScriptElement extends Element {
  public src = '';
  public type = '';
  public async = false;
  public defer = false;
  public text = '';

  constructor() {
    super('script');
  }
}

/**
 * HTMLSlotElement — <slot>
 */
export class HTMLSlotElement extends Element {
  public name = '';

  constructor() {
    super('slot');
  }

  assignedNodes(_options?: { flatten?: boolean }): Node[] {
    // Find the shadow root this slot belongs to
    let ancestor: Node | null = this.parentNode;
    // Lazy import to check for ShadowRoot
    const { ShadowRoot } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./shadow.js') as typeof import('./shadow.js');
    while (ancestor && !(ancestor instanceof ShadowRoot)) {
      ancestor = ancestor.parentNode;
    }
    if (!ancestor || !(ancestor instanceof ShadowRoot)) return [];
    const host = ancestor.host;
    const slotName = this.name;
    return host.childNodes.filter((child) => {
      if (child instanceof Element) {
        return child.slot === slotName;
      }
      // Text nodes go to the default (unnamed) slot
      return slotName === '';
    });
  }

  assignedElements(_options?: { flatten?: boolean }): Element[] {
    return this.assignedNodes(_options).filter(
      (node): node is Element => node instanceof Element,
    );
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
  DIALOG: HTMLDialogElement,
  CANVAS: HTMLCanvasElement,
  TEMPLATE: HTMLTemplateElement,
  IFRAME: HTMLIFrameElement,
  VIDEO: HTMLVideoElement,
  AUDIO: HTMLAudioElement,
  PROGRESS: HTMLProgressElement,
  METER: HTMLMeterElement,
  DETAILS: HTMLDetailsElement,
  TABLE: HTMLTableElement,
  TR: HTMLTableRowElement,
  TD: HTMLTableCellElement,
  TH: HTMLTableCellElement,
  FIELDSET: HTMLFieldSetElement,
  SCRIPT: HTMLScriptElement,
  SLOT: HTMLSlotElement,
};
