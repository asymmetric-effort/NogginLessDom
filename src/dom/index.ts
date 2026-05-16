/**
 * DOM simulation module — provides a complete DOM API.
 * @module dom
 */

import {
  querySelector as selectorQuerySelector,
  querySelectorAll as selectorQuerySelectorAll,
  matchesSelector,
} from './selector.js';
import { serializeNode, serializeChildren } from './html-serializer.js';
import { parseHTML } from './html-parser.js';
import { NodeList, HTMLCollection } from './collections.js';
import { DOMTokenList } from './token-list.js';
import { CSSStyleDeclaration } from './style.js';
import {
  notifyChildListMutation,
  notifyAttributeMutation,
  notifyCharacterDataMutation,
} from './mutation-observer.js';
import type { ShadowRoot as ShadowRootType } from './shadow.js';
import { CookieJar } from './cookie.js';
import { CustomElementRegistry } from './custom-elements.js';

/** Stub DOMRect returned by getBoundingClientRect. */
export interface DOMRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Options for setBoundingClientRect. */
export interface DOMRectInit {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * Convert camelCase to data-kebab-case attribute name.
 */
function camelToDataAttr(str: string): string {
  return 'data-' + str.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
}

/**
 * Convert data-kebab-case attribute name to camelCase dataset key.
 */
function dataAttrToCamel(attr: string): string {
  const rest = attr.slice(5);
  return rest.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

/**
 * DOMStringMap interface for dataset.
 */
interface DOMStringMap {
  [key: string]: string | undefined;
}

/**
 * Base DOM Node.
 */
export class Node {
  public nodeType: number;
  public nodeName: string;
  public childNodes: Node[] = [];
  public parentNode: Node | null = null;

  constructor(nodeType: number, nodeName: string) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
  }

  appendChild(child: Node): Node {
    const previousSibling =
      this.childNodes.length > 0
        ? this.childNodes[this.childNodes.length - 1]!
        : null;
    child.parentNode = this;
    this.childNodes.push(child);
    notifyChildListMutation(this, [child], [], previousSibling, null);
    return child;
  }

  removeChild(child: Node): Node {
    const index = this.childNodes.indexOf(child);
    if (index === -1) {
      throw new Error('Node not found');
    }
    const previousSibling = index > 0 ? this.childNodes[index - 1]! : null;
    const nextSibling = this.childNodes[index + 1] ?? null;
    this.childNodes.splice(index, 1);
    child.parentNode = null;
    notifyChildListMutation(this, [], [child], previousSibling, nextSibling);
    return child;
  }

  insertBefore(newChild: Node, referenceChild: Node | null): Node {
    if (referenceChild === null) {
      return this.appendChild(newChild);
    }
    const index = this.childNodes.indexOf(referenceChild);
    if (index === -1) {
      throw new Error('Reference node not found');
    }
    const previousSibling = index > 0 ? this.childNodes[index - 1]! : null;
    newChild.parentNode = this;
    this.childNodes.splice(index, 0, newChild);
    notifyChildListMutation(
      this,
      [newChild],
      [],
      previousSibling,
      referenceChild,
    );
    return newChild;
  }

  replaceChild(newChild: Node, oldChild: Node): Node {
    const index = this.childNodes.indexOf(oldChild);
    if (index === -1) {
      throw new Error('Node not found');
    }
    const previousSibling = index > 0 ? this.childNodes[index - 1]! : null;
    const nextSibling = this.childNodes[index + 1] ?? null;
    newChild.parentNode = this;
    this.childNodes[index] = newChild;
    oldChild.parentNode = null;
    notifyChildListMutation(
      this,
      [newChild],
      [oldChild],
      previousSibling,
      nextSibling,
    );
    return oldChild;
  }

  contains(other: Node): boolean {
    if (this === other) return true;
    for (const child of this.childNodes) {
      if (child.contains(other)) return true;
    }
    return false;
  }

  hasChildNodes(): boolean {
    return this.childNodes.length > 0;
  }

  get firstChild(): Node | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): Node | null {
    return this.childNodes.length > 0
      ? this.childNodes[this.childNodes.length - 1]!
      : null;
  }

  get nextSibling(): Node | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const index = siblings.indexOf(this);
    return siblings[index + 1] ?? null;
  }

  get previousSibling(): Node | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const index = siblings.indexOf(this);
    return index > 0 ? siblings[index - 1]! : null;
  }

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('');
  }

  set textContent(value: string) {
    this.childNodes = [];
    if (value) {
      this.appendChild(new TextNode(value));
    }
  }

  cloneNode(deep?: boolean): Node {
    const clone = new Node(this.nodeType, this.nodeName);
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }
}

/**
 * Text node.
 */
export class TextNode extends Node {
  private _data: string;

  constructor(data: string) {
    super(3, '#text');
    this._data = data;
  }

  get data(): string {
    return this._data;
  }

  set data(value: string) {
    const oldValue = this._data;
    this._data = value;
    notifyCharacterDataMutation(this, oldValue);
  }

  override get textContent(): string {
    return this._data;
  }

  override set textContent(value: string) {
    this.data = value;
  }

  override cloneNode(_deep?: boolean): TextNode {
    return new TextNode(this._data);
  }
}

/**
 * Comment node.
 */
export class Comment extends Node {
  public data: string;

  constructor(data: string) {
    super(8, '#comment');
    this.data = data;
  }

  override get textContent(): string {
    return this.data;
  }

  override set textContent(value: string) {
    this.data = value;
  }

  override cloneNode(_deep?: boolean): Comment {
    return new Comment(this.data);
  }
}

/**
 * DOM Event.
 */
export class Event {
  public readonly type: string;
  public readonly bubbles: boolean;
  public readonly cancelable: boolean;
  public defaultPrevented = false;
  public propagationStopped = false;

  constructor(
    type: string,
    options?: { bubbles?: boolean; cancelable?: boolean },
  ) {
    this.type = type ?? '';
    this.bubbles = options?.bubbles ?? false;
    this.cancelable = options?.cancelable ?? false;
  }

  preventDefault(): void {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }
}

/**
 * DOM Element.
 */
export class Element extends Node {
  public tagName: string;
  public id = '';
  public className = '';
  private attributes: Map<string, string> = new Map();
  private eventListeners: Map<string, Array<(event: Event) => void>> =
    new Map();
  private _classList: DOMTokenList | null = null;
  private _style: CSSStyleDeclaration | null = null;
  private _shadowRoot: ShadowRootType | null = null;
  private _shadowMode: 'open' | 'closed' | null = null;
  private _dataset: DOMStringMap | null = null;
  private _boundingRect: DOMRectInit = {};

  constructor(tagName: string) {
    super(1, tagName.toUpperCase());
    this.tagName = tagName.toUpperCase();
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    const oldValue = this.attributes.get(name) ?? null;
    this.attributes.set(name, value);
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
    notifyAttributeMutation(this, name, oldValue);
  }

  removeAttribute(name: string): void {
    const oldValue = this.attributes.get(name) ?? null;
    this.attributes.delete(name);
    notifyAttributeMutation(this, name, oldValue);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  getAttributeEntries(): [string, string][] {
    return [...this.attributes.entries()];
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type) ?? [];
    for (const listener of listeners) {
      listener(event);
    }
    return !event.defaultPrevented;
  }

  get innerHTML(): string {
    return serializeChildren(this);
  }

  set innerHTML(value: string) {
    this.childNodes = [];
    if (value) {
      const nodes = parseHTML(value);
      for (const node of nodes) {
        this.appendChild(node);
      }
    }
  }

  get outerHTML(): string {
    return serializeNode(this);
  }

  querySelector(selector: string): Element | null {
    return selectorQuerySelector(this, selector) as Element | null;
  }

  querySelectorAll(selector: string): NodeList {
    const results = selectorQuerySelectorAll(this, selector);
    return new NodeList(results);
  }

  getElementsByTagName(tagName: string): HTMLCollection {
    const results: Element[] = [];
    const upperTag = tagName.toUpperCase();
    const collectDescendants = (node: Node): void => {
      for (const child of node.childNodes) {
        if (child instanceof Element) {
          if (tagName === '*' || child.tagName === upperTag) {
            results.push(child);
          }
          collectDescendants(child);
        }
      }
    };
    collectDescendants(this);
    return new HTMLCollection(results);
  }

  getElementsByClassName(className: string): HTMLCollection {
    const searchClasses = className.split(/\s+/).filter(Boolean);
    const results: Element[] = [];
    const collectDescendants = (node: Node): void => {
      for (const child of node.childNodes) {
        if (child instanceof Element) {
          const elClasses = child.className.split(/\s+/).filter(Boolean);
          if (searchClasses.every((c) => elClasses.includes(c))) {
            results.push(child);
          }
          collectDescendants(child);
        }
      }
    };
    collectDescendants(this);
    return new HTMLCollection(results);
  }

  override cloneNode(deep?: boolean): Element {
    const clone = new Element(this.tagName);
    for (const [key, value] of this.attributes) {
      clone.setAttribute(key, value);
    }
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  get classList(): DOMTokenList {
    if (!this._classList) {
      this._classList = new DOMTokenList(this);
    }
    return this._classList;
  }

  get style(): CSSStyleDeclaration {
    if (!this._style) {
      this._style = new CSSStyleDeclaration();
    }
    return this._style;
  }

  // ---- Shadow DOM ----

  attachShadow(init: { mode: 'open' | 'closed' }): ShadowRootType {
    if (this._shadowRoot) {
      throw new Error(
        "Failed to execute 'attachShadow': shadow root already attached",
      );
    }
    // Lazy import to avoid circular dependency
    const { ShadowRoot } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./shadow.js') as typeof import('./shadow.js');
    const shadow = new ShadowRoot(this, init);
    this._shadowRoot = shadow;
    this._shadowMode = init.mode;
    return shadow;
  }

  get shadowRoot(): ShadowRootType | null {
    if (this._shadowMode === 'open') {
      return this._shadowRoot;
    }
    return null;
  }

  // ---- dataset ----

  get dataset(): DOMStringMap {
    if (!this._dataset) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      this._dataset = new Proxy<DOMStringMap>({} as DOMStringMap, {
        get(_target: DOMStringMap, prop: string | symbol): string | undefined {
          if (typeof prop !== 'string') return undefined;
          const attrName = camelToDataAttr(prop);
          return self.getAttribute(attrName) ?? undefined;
        },
        set(
          _target: DOMStringMap,
          prop: string | symbol,
          value: string,
        ): boolean {
          if (typeof prop !== 'string') return false;
          const attrName = camelToDataAttr(prop);
          self.setAttribute(attrName, value);
          return true;
        },
        deleteProperty(_target: DOMStringMap, prop: string | symbol): boolean {
          if (typeof prop !== 'string') return false;
          const attrName = camelToDataAttr(prop);
          self.removeAttribute(attrName);
          return true;
        },
        ownKeys(): string[] {
          const keys: string[] = [];
          for (const [attr] of self.getAttributeEntries()) {
            if (attr.startsWith('data-')) {
              keys.push(dataAttrToCamel(attr));
            }
          }
          return keys;
        },
        getOwnPropertyDescriptor(
          _target: DOMStringMap,
          prop: string | symbol,
        ): PropertyDescriptor | undefined {
          if (typeof prop !== 'string') return undefined;
          const attrName = camelToDataAttr(prop);
          const val = self.getAttribute(attrName);
          if (val === null) return undefined;
          return {
            value: val,
            writable: true,
            enumerable: true,
            configurable: true,
          };
        },
        has(_target: DOMStringMap, prop: string | symbol): boolean {
          if (typeof prop !== 'string') return false;
          const attrName = camelToDataAttr(prop);
          return self.hasAttribute(attrName);
        },
      });
    }
    return this._dataset;
  }

  // ---- closest / matches ----

  closest(selector: string): Element | null {
    let current: Node | null = this as Node;
    while (current) {
      if (current instanceof Element && matchesSelector(current, selector)) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  matches(selector: string): boolean {
    return matchesSelector(this, selector);
  }

  // ---- children / element child getters ----

  get children(): HTMLCollection {
    const elems = this.childNodes.filter(
      (c): c is Element => c instanceof Element,
    );
    return new HTMLCollection(elems);
  }

  get childElementCount(): number {
    return this.childNodes.filter((c) => c instanceof Element).length;
  }

  get firstElementChild(): Element | null {
    for (const child of this.childNodes) {
      if (child instanceof Element) return child;
    }
    return null;
  }

  get lastElementChild(): Element | null {
    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      const child = this.childNodes[i]!;
      if (child instanceof Element) return child;
    }
    return null;
  }

  // ---- element sibling getters ----

  get nextElementSibling(): Element | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const index = siblings.indexOf(this);
    for (let i = index + 1; i < siblings.length; i++) {
      const sib = siblings[i]!;
      if (sib instanceof Element) return sib;
    }
    return null;
  }

  get previousElementSibling(): Element | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const index = siblings.indexOf(this);
    for (let i = index - 1; i >= 0; i--) {
      const sib = siblings[i]!;
      if (sib instanceof Element) return sib;
    }
    return null;
  }

  // ---- DOM convenience methods ----

  before(...nodes: Node[]): void {
    const parent = this.parentNode;
    if (!parent) return;
    for (const node of nodes) {
      parent.insertBefore(node, this);
    }
  }

  after(...nodes: Node[]): void {
    const parent = this.parentNode;
    if (!parent) return;
    const ref = this.nextSibling;
    for (const node of nodes) {
      parent.insertBefore(node, ref);
    }
  }

  prepend(...nodes: Node[]): void {
    const first = this.firstChild;
    for (const node of nodes) {
      this.insertBefore(node, first);
    }
  }

  append(...nodes: Node[]): void {
    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  remove(): void {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  replaceWith(...nodes: Node[]): void {
    const parent = this.parentNode;
    if (!parent) return;
    const ref = this.nextSibling;
    parent.removeChild(this);
    for (const node of nodes) {
      parent.insertBefore(node, ref);
    }
  }

  // ---- getBoundingClientRect ----

  getBoundingClientRect(): DOMRect {
    const x = this._boundingRect.x ?? 0;
    const y = this._boundingRect.y ?? 0;
    const width = this._boundingRect.width ?? 0;
    const height = this._boundingRect.height ?? 0;
    return {
      x,
      y,
      width,
      height,
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
    };
  }

  setBoundingClientRect(rect: DOMRectInit): void {
    this._boundingRect = rect;
  }
}

/**
 * DOM Document.
 */
export class Document extends Node {
  private _customElements: CustomElementRegistry | null = null;
  private _cookieJar: CookieJar = new CookieJar();

  constructor() {
    super(9, '#document');
  }

  // ---- Custom Elements ----

  get customElements(): CustomElementRegistry {
    if (!this._customElements) {
      this._customElements = new CustomElementRegistry();
    }
    return this._customElements;
  }

  createElement(tagName: string): Element {
    const upper = tagName.toUpperCase();

    // Check custom elements first
    const CustomCtor = this.customElements.get(tagName.toLowerCase());
    if (CustomCtor) {
      return new CustomCtor();
    }

    // Lazy import to avoid circular dependency with html-elements.ts
    const { HTML_ELEMENT_MAP } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./html-elements.js') as typeof import('./html-elements.js');
    const Ctor = HTML_ELEMENT_MAP[upper];
    if (Ctor) {
      return new Ctor();
    }
    return new Element(tagName);
  }

  createTextNode(data: string): TextNode {
    return new TextNode(data);
  }

  getElementById(id: string): Element | null {
    const search = (node: Node): Element | null => {
      if (node instanceof Element && node.id === id) return node;
      for (const child of node.childNodes) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this);
  }

  querySelector(selector: string): Element | null {
    return selectorQuerySelector(this, selector) as Element | null;
  }

  createComment(data: string): Comment {
    return new Comment(data);
  }

  querySelectorAll(selector: string): NodeList {
    const results = selectorQuerySelectorAll(this, selector);
    return new NodeList(results);
  }

  getElementsByTagName(tagName: string): HTMLCollection {
    const results: Element[] = [];
    const upperTag = tagName.toUpperCase();
    const collect = (node: Node): void => {
      for (const child of node.childNodes) {
        if (child instanceof Element) {
          if (tagName === '*' || child.tagName === upperTag) {
            results.push(child);
          }
        }
        collect(child);
      }
    };
    collect(this);
    return new HTMLCollection(results);
  }

  getElementsByClassName(className: string): HTMLCollection {
    const searchClasses = className.split(/\s+/).filter(Boolean);
    const results: Element[] = [];
    const collect = (node: Node): void => {
      for (const child of node.childNodes) {
        if (child instanceof Element) {
          const elClasses = child.className.split(/\s+/).filter(Boolean);
          if (searchClasses.every((c) => elClasses.includes(c))) {
            results.push(child);
          }
        }
        collect(child);
      }
    };
    collect(this);
    return new HTMLCollection(results);
  }

  createDocumentFragment(): Node {
    return new Node(11, '#document-fragment');
  }

  createEvent(_type: string): Event {
    return new Event('');
  }

  // ---- cookie ----

  get cookie(): string {
    return this._cookieJar.getCookieString();
  }

  set cookie(value: string) {
    this._cookieJar.setCookieString(value);
  }

  get body(): Element | null {
    const search = (node: Node): Element | null => {
      if (node instanceof Element && node.tagName === 'BODY') return node;
      for (const child of node.childNodes) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this);
  }

  get head(): Element | null {
    const search = (node: Node): Element | null => {
      if (node instanceof Element && node.tagName === 'HEAD') return node;
      for (const child of node.childNodes) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this);
  }

  get title(): string {
    const head = this.head;
    if (!head) return '';
    for (const child of head.childNodes) {
      if (child instanceof Element && child.tagName === 'TITLE') {
        return child.textContent;
      }
    }
    return '';
  }

  set title(value: string) {
    const head = this.head;
    if (!head) return;
    for (const child of head.childNodes) {
      if (child instanceof Element && child.tagName === 'TITLE') {
        child.textContent = value;
        return;
      }
    }
    const titleEl = this.createElement('title');
    titleEl.textContent = value;
    head.appendChild(titleEl);
  }

  get documentElement(): Element | null {
    const search = (node: Node): Element | null => {
      if (node instanceof Element && node.tagName === 'HTML') return node;
      for (const child of node.childNodes) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this);
  }
}

// Re-export collection types (no circular dep - these don't import from index)
export { NodeList, HTMLCollection } from './collections.js';
export { DOMTokenList } from './token-list.js';
export { CSSStyleDeclaration } from './style.js';
// Note: mutation-observer, resize-observer, intersection-observer, shadow,
// custom-elements, cookie, html-elements, window, and events all import from
// this module. To avoid circular dependencies, they are NOT re-exported here.
// Import them directly from their respective modules via src/index.ts.

// Note: html-elements.ts, window.ts, and events.ts import from this module.
// To avoid circular dependency issues, they are NOT re-exported here.
// Import them directly from their respective modules.
