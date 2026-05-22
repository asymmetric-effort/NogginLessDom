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

/** Options for setLayoutMetrics (test helper). */
export interface LayoutMetrics {
  offsetWidth?: number;
  offsetHeight?: number;
  offsetLeft?: number;
  offsetTop?: number;
  clientWidth?: number;
  clientHeight?: number;
  clientLeft?: number;
  clientTop?: number;
  scrollWidth?: number;
  scrollHeight?: number;
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
  /** Node type constants */
  public static readonly ELEMENT_NODE = 1;
  public static readonly ATTRIBUTE_NODE = 2;
  public static readonly TEXT_NODE = 3;
  public static readonly CDATA_SECTION_NODE = 4;
  public static readonly ENTITY_REFERENCE_NODE = 5;
  public static readonly ENTITY_NODE = 6;
  public static readonly PROCESSING_INSTRUCTION_NODE = 7;
  public static readonly COMMENT_NODE = 8;
  public static readonly DOCUMENT_NODE = 9;
  public static readonly DOCUMENT_TYPE_NODE = 10;
  public static readonly DOCUMENT_FRAGMENT_NODE = 11;
  public static readonly NOTATION_NODE = 12;

  /** Document position bitmask constants */
  public static readonly DOCUMENT_POSITION_DISCONNECTED = 1;
  public static readonly DOCUMENT_POSITION_PRECEDING = 2;
  public static readonly DOCUMENT_POSITION_FOLLOWING = 4;
  public static readonly DOCUMENT_POSITION_CONTAINS = 8;
  public static readonly DOCUMENT_POSITION_CONTAINED_BY = 16;

  public nodeType: number;
  public nodeName: string;
  public childNodes: Node[] = [];
  public parentNode: Node | null = null;
  public ownerDocument: Document | null = null;

  constructor(nodeType: number, nodeName: string) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
  }

  get parentElement(): Element | null {
    if (this.parentNode instanceof Element) {
      return this.parentNode;
    }
    return null;
  }

  get nodeValue(): string | null {
    return null;
  }

  set nodeValue(_value: string | null) {
    // No-op for non-text nodes
  }

  normalize(): void {
    const newChildren: Node[] = [];
    for (const child of this.childNodes) {
      if (child instanceof TextNode) {
        if (child.data === '') {
          child.parentNode = null;
          continue;
        }
        const last =
          newChildren.length > 0 ? newChildren[newChildren.length - 1] : null;
        if (last instanceof TextNode) {
          last.data = last.data + child.data;
          child.parentNode = null;
          continue;
        }
      } else {
        child.normalize();
      }
      newChildren.push(child);
    }
    this.childNodes = newChildren;
  }

  isEqualNode(other: Node | null): boolean {
    if (other === null) return false;
    if (this.nodeType !== other.nodeType) return false;
    if (this.nodeName !== other.nodeName) return false;
    if (this.childNodes.length !== other.childNodes.length) return false;

    // For elements, compare attributes
    if (this instanceof Element && other instanceof Element) {
      const thisAttrs = this.getAttributeEntries();
      const otherAttrs = other.getAttributeEntries();
      if (thisAttrs.length !== otherAttrs.length) return false;
      for (const [key, value] of thisAttrs) {
        if (other.getAttribute(key) !== value) return false;
      }
    }

    // For text nodes, compare data
    if (this instanceof TextNode && other instanceof TextNode) {
      if (this.data !== other.data) return false;
    }

    // Compare children recursively
    for (let i = 0; i < this.childNodes.length; i++) {
      if (!this.childNodes[i]!.isEqualNode(other.childNodes[i]!)) return false;
    }
    return true;
  }

  isSameNode(other: Node | null): boolean {
    return this === other;
  }

  compareDocumentPosition(other: Node): number {
    if (this === other) return 0;

    // Get ancestors for both nodes
    const thisAncestors: Node[] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let n: Node | null = this;
    while (n) {
      thisAncestors.push(n);
      n = n.parentNode;
    }

    const otherAncestors: Node[] = [];
    n = other;
    while (n) {
      otherAncestors.push(n);
      n = n.parentNode;
    }

    // Check if this contains other
    if (thisAncestors.includes(other)) {
      // other is an ancestor of this → other CONTAINS this, other PRECEDES this
      return 8 | 2; // CONTAINS | PRECEDING
    }
    if (otherAncestors.includes(this)) {
      // this is an ancestor of other → other is CONTAINED_BY this, other FOLLOWS this
      return 16 | 4; // CONTAINED_BY | FOLLOWING
    }

    // Find common ancestor
    const thisRoot = thisAncestors[thisAncestors.length - 1];
    const otherRoot = otherAncestors[otherAncestors.length - 1];
    if (thisRoot !== otherRoot) {
      return 1 | 2 | 4; // DISCONNECTED | PRECEDING | FOLLOWING (implementation-defined order)
    }

    // Find the common ancestor and determine order
    const thisSet = new Set(thisAncestors);
    // Walk other's ancestors to find the first common ancestor
    let commonAncestor: Node | null = null;
    for (const ancestor of otherAncestors) {
      if (thisSet.has(ancestor)) {
        commonAncestor = ancestor;
        break;
      }
    }

    if (!commonAncestor) {
      return 1; // DISCONNECTED
    }

    // Find which child of commonAncestor leads to this vs other
    const thisChild = thisAncestors[thisAncestors.indexOf(commonAncestor) - 1];
    const otherChild =
      otherAncestors[otherAncestors.indexOf(commonAncestor) - 1];

    for (const child of commonAncestor.childNodes) {
      if (child === thisChild) return 4; // other FOLLOWS
      if (child === otherChild) return 2; // other PRECEDES
    }

    return 1; // DISCONNECTED (fallback)
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

  override get nodeValue(): string | null {
    return this._data;
  }

  override set nodeValue(value: string | null) {
    this.data = value ?? '';
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
  public static readonly NONE = 0;
  public static readonly CAPTURING_PHASE = 1;
  public static readonly AT_TARGET = 2;
  public static readonly BUBBLING_PHASE = 3;

  public readonly type: string;
  public readonly bubbles: boolean;
  public readonly cancelable: boolean;
  public readonly isTrusted: boolean = false;
  public readonly timeStamp: number;
  public defaultPrevented = false;
  public propagationStopped = false;
  public immediatePropagationStopped = false;
  public eventPhase = 0;
  public target: Node | null = null;
  public currentTarget: Node | null = null;

  constructor(
    type: string,
    options?: { bubbles?: boolean; cancelable?: boolean },
  ) {
    this.type = type ?? '';
    this.bubbles = options?.bubbles ?? false;
    this.cancelable = options?.cancelable ?? false;
    this.timeStamp = Date.now();
  }

  preventDefault(): void {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }

  stopImmediatePropagation(): void {
    this.propagationStopped = true;
    this.immediatePropagationStopped = true;
  }

  composedPath(): Node[] {
    if (!this.target) return [];
    const path: Node[] = [];
    let current: Node | null = this.target;
    while (current) {
      path.push(current);
      current = current.parentNode;
    }
    return path;
  }
}

/**
 * DOM Element.
 */
export class Element extends Node {
  public tagName: string;
  public id = '';
  public className = '';
  public namespaceURI: string | null = null;
  private attributes: Map<string, string> = new Map();
  private _captureListeners: Map<
    string,
    Array<{ fn: (event: Event) => void; once: boolean }>
  > = new Map();
  private _bubbleListeners: Map<
    string,
    Array<{ fn: (event: Event) => void; once: boolean }>
  > = new Map();
  private _classList: DOMTokenList | null = null;
  private _style: CSSStyleDeclaration | null = null;
  private _shadowRoot: ShadowRootType | null = null;
  private _shadowMode: 'open' | 'closed' | null = null;
  private _dataset: DOMStringMap | null = null;
  private _boundingRect: DOMRectInit = {};
  private _offsetWidth = 0;
  private _offsetHeight = 0;
  private _offsetLeft = 0;
  private _offsetTop = 0;
  private _clientWidth = 0;
  private _clientHeight = 0;
  private _clientLeft = 0;
  private _clientTop = 0;
  private _scrollLeft = 0;
  private _scrollTop = 0;
  private _scrollWidth = 0;
  private _scrollHeight = 0;

  constructor(tagName: string, namespaceURI?: string | null) {
    const isSVG =
      namespaceURI != null && namespaceURI !== 'http://www.w3.org/1999/xhtml';
    const resolvedName = isSVG ? tagName : tagName.toUpperCase();
    super(1, resolvedName);
    this.tagName = resolvedName;
    this.namespaceURI = namespaceURI ?? null;
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

  addEventListener(
    type: string,
    listener: (event: Event) => void,
    options?:
      | boolean
      | { capture?: boolean; once?: boolean; passive?: boolean },
  ): void {
    const capture =
      typeof options === 'boolean' ? options : (options?.capture ?? false);
    const once =
      typeof options === 'boolean' ? false : (options?.once ?? false);
    const map = capture ? this._captureListeners : this._bubbleListeners;
    if (!map.has(type)) {
      map.set(type, []);
    }
    map.get(type)!.push({ fn: listener, once });
  }

  removeEventListener(
    type: string,
    listener: (event: Event) => void,
    options?: boolean | { capture?: boolean },
  ): void {
    const capture =
      typeof options === 'boolean' ? options : (options?.capture ?? false);
    const map = capture ? this._captureListeners : this._bubbleListeners;
    const entries = map.get(type);
    if (entries) {
      const index = entries.findIndex((e) => e.fn === listener);
      if (index !== -1) {
        entries.splice(index, 1);
      }
    }
  }

  private _fireListeners(
    event: Event,
    entries: Array<{ fn: (event: Event) => void; once: boolean }>,
    type: string,
    map: Map<string, Array<{ fn: (event: Event) => void; once: boolean }>>,
  ): void {
    const snapshot = entries.slice();
    for (const entry of snapshot) {
      if (event.immediatePropagationStopped) break;
      entry.fn(event);
      if (entry.once) {
        const current = map.get(type);
        if (current) {
          const idx = current.indexOf(entry);
          if (idx !== -1) current.splice(idx, 1);
        }
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    event.target = this;

    // Build path from target to root
    const path: Element[] = [];
    let current: Node | null = this as Node;
    while (current) {
      if (current instanceof Element) {
        path.push(current);
      }
      current = current.parentNode;
    }

    // Capture phase: root -> target (excluding target)
    const ancestors = path.slice(1).reverse();
    for (const ancestor of ancestors) {
      if (event.propagationStopped) break;
      event.eventPhase = 1; // CAPTURING_PHASE
      event.currentTarget = ancestor;
      const captureEntries = ancestor._captureListeners.get(event.type) ?? [];
      ancestor._fireListeners(
        event,
        captureEntries,
        event.type,
        ancestor._captureListeners,
      );
    }

    // Target phase: fire both capture and bubble listeners on target in registration order
    if (!event.propagationStopped) {
      event.eventPhase = 2; // AT_TARGET
      event.currentTarget = this;
      // At the target, fire all listeners (capture + bubble) in registration order
      // We interleave them by firing bubble list which contains all non-capture listeners
      const targetCapture = this._captureListeners.get(event.type) ?? [];
      const targetBubble = this._bubbleListeners.get(event.type) ?? [];
      // Fire all target listeners: bubble first then capture (matching registration order typical behavior)
      // Actually at target phase, all listeners fire regardless of capture flag, in registration order.
      // We fire bubble listeners first, then capture listeners to maintain typical add order.
      this._fireListeners(
        event,
        targetBubble,
        event.type,
        this._bubbleListeners,
      );
      if (!event.immediatePropagationStopped) {
        this._fireListeners(
          event,
          targetCapture,
          event.type,
          this._captureListeners,
        );
      }
    }

    // Bubble phase: target -> root (excluding target)
    if (event.bubbles && !event.propagationStopped) {
      for (const ancestor of path.slice(1)) {
        if (event.propagationStopped) break;
        event.eventPhase = 3; // BUBBLING_PHASE
        event.currentTarget = ancestor;
        const bubbleEntries = ancestor._bubbleListeners.get(event.type) ?? [];
        ancestor._fireListeners(
          event,
          bubbleEntries,
          event.type,
          ancestor._bubbleListeners,
        );
      }
    }

    event.eventPhase = 0;
    event.currentTarget = null;
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
    const clone = new Element(this.tagName, this.namespaceURI);
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

  // ---- Layout properties ----

  get offsetParent(): Element | null {
    return this.parentElement;
  }

  get offsetLeft(): number {
    return this._offsetLeft;
  }

  get offsetTop(): number {
    return this._offsetTop;
  }

  get offsetWidth(): number {
    return this._offsetWidth;
  }

  get offsetHeight(): number {
    return this._offsetHeight;
  }

  get clientLeft(): number {
    return this._clientLeft;
  }

  get clientTop(): number {
    return this._clientTop;
  }

  get clientWidth(): number {
    return this._clientWidth;
  }

  get clientHeight(): number {
    return this._clientHeight;
  }

  get scrollLeft(): number {
    return this._scrollLeft;
  }

  set scrollLeft(value: number) {
    this._scrollLeft = value;
  }

  get scrollTop(): number {
    return this._scrollTop;
  }

  set scrollTop(value: number) {
    this._scrollTop = value;
  }

  get scrollWidth(): number {
    return this._scrollWidth;
  }

  get scrollHeight(): number {
    return this._scrollHeight;
  }

  // ---- Scroll methods ----

  scrollIntoView(_options?: boolean | { behavior?: string }): void {
    // No-op stub
  }

  scroll(x?: number, y?: number): void {
    this._scrollLeft = x ?? 0;
    this._scrollTop = y ?? 0;
  }

  scrollTo(x?: number, y?: number): void {
    this._scrollLeft = x ?? 0;
    this._scrollTop = y ?? 0;
  }

  scrollBy(dx?: number, dy?: number): void {
    this._scrollLeft += dx ?? 0;
    this._scrollTop += dy ?? 0;
  }

  // ---- getClientRects ----

  getClientRects(): DOMRect[] {
    return [this.getBoundingClientRect()];
  }

  // ---- Test helper ----

  setLayoutMetrics(metrics: LayoutMetrics): void {
    this._offsetWidth = metrics.offsetWidth ?? 0;
    this._offsetHeight = metrics.offsetHeight ?? 0;
    this._offsetLeft = metrics.offsetLeft ?? 0;
    this._offsetTop = metrics.offsetTop ?? 0;
    this._clientWidth = metrics.clientWidth ?? 0;
    this._clientHeight = metrics.clientHeight ?? 0;
    this._clientLeft = metrics.clientLeft ?? 0;
    this._clientTop = metrics.clientTop ?? 0;
    this._scrollWidth = metrics.scrollWidth ?? 0;
    this._scrollHeight = metrics.scrollHeight ?? 0;
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
    this.ownerDocument = null;
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
      const el = new CustomCtor();
      el.ownerDocument = this;
      return el;
    }

    // Lazy import to avoid circular dependency with html-elements.ts
    const { HTML_ELEMENT_MAP } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./html-elements.js') as typeof import('./html-elements.js');
    const Ctor = HTML_ELEMENT_MAP[upper];
    if (Ctor) {
      const el = new Ctor();
      el.ownerDocument = this;
      return el;
    }
    const el = new Element(tagName);
    el.ownerDocument = this;
    return el;
  }

  createElementNS(namespaceURI: string, qualifiedName: string): Element {
    const el = new Element(qualifiedName, namespaceURI);
    el.ownerDocument = this;
    return el;
  }

  createTextNode(data: string): TextNode {
    const text = new TextNode(data);
    text.ownerDocument = this;
    return text;
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
    const comment = new Comment(data);
    comment.ownerDocument = this;
    return comment;
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

  // ---- Document collection properties ----

  get forms(): HTMLCollection {
    return this.getElementsByTagName('form');
  }

  get images(): HTMLCollection {
    return this.getElementsByTagName('img');
  }

  get links(): HTMLCollection {
    const results: Element[] = [];
    const collect = (node: Node): void => {
      for (const child of node.childNodes) {
        if (
          child instanceof Element &&
          (child.tagName === 'A' || child.tagName === 'AREA') &&
          child.hasAttribute('href')
        ) {
          results.push(child);
        }
        collect(child);
      }
    };
    collect(this);
    return new HTMLCollection(results);
  }

  get scripts(): HTMLCollection {
    return this.getElementsByTagName('script');
  }

  get embeds(): HTMLCollection {
    return this.getElementsByTagName('embed');
  }

  get anchors(): HTMLCollection {
    const results: Element[] = [];
    const collect = (node: Node): void => {
      for (const child of node.childNodes) {
        if (
          child instanceof Element &&
          child.tagName === 'A' &&
          child.hasAttribute('name')
        ) {
          results.push(child);
        }
        collect(child);
      }
    };
    collect(this);
    return new HTMLCollection(results);
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
