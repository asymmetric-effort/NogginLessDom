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
import {
  TreeWalker,
  NodeIterator,
  NodeFilter,
  type NodeFilterCallback,
} from './tree-walker.js';

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
 * Collect descendant elements matching a tag name from the given root.
 * Used as a query function for live HTMLCollections.
 */
function collectDescendantsByTagName(
  root: Node,
  tagName: string,
  upperTag: string,
): Element[] {
  const results: Element[] = [];
  const walk = (node: Node): void => {
    for (const child of node.childNodes) {
      if (child instanceof Element) {
        if (tagName === '*' || child.tagName === upperTag) {
          results.push(child);
        }
      }
      walk(child);
    }
  };
  walk(root);
  return results;
}

/**
 * Collect descendant elements matching class names from the given root.
 * Used as a query function for live HTMLCollections.
 */
function collectDescendantsByClassName(
  root: Node,
  searchClasses: string[],
): Element[] {
  const results: Element[] = [];
  const walk = (node: Node): void => {
    for (const child of node.childNodes) {
      if (child instanceof Element) {
        const elClasses = child.className.split(/\s+/).filter(Boolean);
        if (searchClasses.every((c) => elClasses.includes(c))) {
          results.push(child);
        }
      }
      walk(child);
    }
  };
  walk(root);
  return results;
}

/**
 * DOMStringMap interface for dataset.
 */
interface DOMStringMap {
  [key: string]: string | undefined;
}

/** Interface for custom elements with lifecycle callbacks. */
interface CustomElementLifecycle {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  attributeChangedCallback?(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void;
}

/** Interface for custom element constructors with observedAttributes. */
interface CustomElementConstructorWithObserved {
  observedAttributes?: string[];
}

/**
 * Check if a node is a custom element (Element with lifecycle methods).
 */
function isCustomElement(node: Node): node is Element & CustomElementLifecycle {
  return node instanceof Element && node.tagName.includes('-');
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

  get isConnected(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current: Node | null = this;
    while (current) {
      if (current instanceof Document) return true;
      current = current.parentNode;
    }
    return false;
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
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    const previousSibling =
      this.childNodes.length > 0
        ? this.childNodes[this.childNodes.length - 1]!
        : null;
    child.parentNode = this;
    this.childNodes.push(child);
    notifyChildListMutation(this, [child], [], previousSibling, null);
    if (isCustomElement(child) && child.connectedCallback) {
      child.connectedCallback();
    }
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
    if (isCustomElement(child) && child.disconnectedCallback) {
      child.disconnectedCallback();
    }
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
    if (isCustomElement(newChild) && newChild.connectedCallback) {
      newChild.connectedCallback();
    }
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
    if (isCustomElement(oldChild) && oldChild.disconnectedCallback) {
      oldChild.disconnectedCallback();
    }
    if (isCustomElement(newChild) && newChild.connectedCallback) {
      newChild.connectedCallback();
    }
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

  public readonly composed: boolean;

  constructor(
    type: string,
    options?: { bubbles?: boolean; cancelable?: boolean; composed?: boolean },
  ) {
    this.type = type ?? '';
    this.bubbles = options?.bubbles ?? false;
    this.cancelable = options?.cancelable ?? false;
    this.composed = options?.composed ?? false;
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
    // Lazy import ShadowRoot
    const { ShadowRoot: ShadowRootClass } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./shadow.js') as typeof import('./shadow.js');
    const path: Node[] = [];
    let current: Node | null = this.target;
    while (current) {
      path.push(current);
      const parent: Node | null = current.parentNode;
      if (parent instanceof ShadowRootClass) {
        if (this.composed) {
          // Cross shadow boundary: continue from host
          current = parent.host;
          continue;
        } else {
          break;
        }
      }
      current = parent;
    }
    return path;
  }
}

/**
 * DOM Element.
 */
export class Element extends Node {
  public tagName: string;
  private _id = '';
  private _className = '';
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
  private _eventHandlers: Map<string, (event: Event) => void> = new Map();

  constructor(tagName: string, namespaceURI?: string | null) {
    const isSVG =
      namespaceURI != null && namespaceURI !== 'http://www.w3.org/1999/xhtml';
    const resolvedName = isSVG ? tagName : tagName.toUpperCase();
    super(1, resolvedName);
    this.tagName = resolvedName;
    this.namespaceURI = namespaceURI ?? null;
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this._id = value;
    this.setAttribute('id', value);
  }

  get className(): string {
    return this._className;
  }

  set className(value: string) {
    this._className = value;
    this.setAttribute('class', value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    const oldValue = this.attributes.get(name) ?? null;
    this.attributes.set(name, value);
    if (name === 'id') this._id = value;
    if (name === 'class') this._className = value;
    notifyAttributeMutation(this, name, oldValue);
    if (isCustomElement(this) && this.attributeChangedCallback) {
      const ctor = this.constructor as CustomElementConstructorWithObserved;
      const observed = ctor.observedAttributes;
      if (observed && observed.includes(name)) {
        this.attributeChangedCallback(name, oldValue, value);
      }
    }
  }

  removeAttribute(name: string): void {
    const oldValue = this.attributes.get(name) ?? null;
    this.attributes.delete(name);
    notifyAttributeMutation(this, name, oldValue);
    if (isCustomElement(this) && this.attributeChangedCallback) {
      const ctor = this.constructor as CustomElementConstructorWithObserved;
      const observed = ctor.observedAttributes;
      if (observed && observed.includes(name)) {
        this.attributeChangedCallback(name, oldValue, null);
      }
    }
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  toggleAttribute(name: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) {
        this.setAttribute(name, '');
        return true;
      } else {
        this.removeAttribute(name);
        return false;
      }
    }
    if (this.attributes.has(name)) {
      this.removeAttribute(name);
      return false;
    } else {
      this.setAttribute(name, '');
      return true;
    }
  }

  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  hasAttributes(): boolean {
    return this.attributes.size > 0;
  }

  setAttributeNS(_namespace: string | null, name: string, value: string): void {
    this.setAttribute(name, value);
  }

  getAttributeNS(_namespace: string | null, name: string): string | null {
    return this.getAttribute(name);
  }

  removeAttributeNS(_namespace: string | null, name: string): void {
    this.removeAttribute(name);
  }

  hasAttributeNS(_namespace: string | null, name: string): boolean {
    return this.hasAttribute(name);
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

    // Lazy import ShadowRoot to check shadow boundary
    const { ShadowRoot: ShadowRootClass } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./shadow.js') as typeof import('./shadow.js');

    // Build path from target to root, crossing shadow boundaries for composed events
    const path: Element[] = [];
    let current: Node | null = this as Node;
    while (current) {
      if (current instanceof Element) {
        path.push(current);
      }
      const parent: Node | null = current.parentNode;
      if (parent instanceof ShadowRootClass) {
        // We hit a shadow root boundary
        if (event.composed) {
          // Cross the boundary: continue from the host element
          current = parent.host;
          continue;
        } else {
          // Non-composed: stop here, don't cross shadow boundary
          break;
        }
      }
      current = parent;
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
    const upperTag = tagName.toUpperCase();
    return new HTMLCollection(
      collectDescendantsByTagName.bind(null, this, tagName, upperTag),
    );
  }

  getElementsByClassName(className: string): HTMLCollection {
    const searchClasses = className.split(/\s+/).filter(Boolean);
    return new HTMLCollection(
      collectDescendantsByClassName.bind(null, this, searchClasses),
    );
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
      this._style._setOnChange((cssText: string) => {
        if (cssText) {
          this.setAttribute('style', cssText);
        } else {
          this.removeAttribute('style');
        }
      });
    }
    return this._style;
  }

  // ---- slot property ----

  get slot(): string {
    return this.getAttribute('slot') ?? '';
  }

  set slot(value: string) {
    this.setAttribute('slot', value);
  }

  get assignedSlot(): Element | null {
    const parent = this.parentNode;
    if (!parent || !(parent instanceof Element)) return null;
    // Parent must be a shadow host with an open shadow root
    const shadow = parent.shadowRoot;
    if (!shadow) return null;
    // Find slot elements in the shadow tree
    const slotName = this.slot;
    const findSlot = (node: Node): Element | null => {
      for (const child of node.childNodes) {
        if (child instanceof Element && child.tagName === 'SLOT') {
          // Lazy import to check HTMLSlotElement
          const { HTMLSlotElement } =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('./html-elements.js') as typeof import('./html-elements.js');
          if (child instanceof HTMLSlotElement && child.name === slotName) {
            return child;
          }
        }
        const found = findSlot(child);
        if (found) return found;
      }
      return null;
    };
    return findSlot(shadow);
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

  /** @internal — returns the shadow root regardless of mode, for internal use only. */
  get _internalShadowRoot(): ShadowRootType | null {
    return this._shadowRoot;
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

  // ---- click ----

  click(): void {
    // Lazy import to avoid circular dependency with events.ts
    const { MouseEvent: MouseEventClass } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./events.js') as typeof import('./events.js');
    const event = new MouseEventClass('click', {
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(event);
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

  // ---- Event handler property helpers ----

  private _getEventHandler(type: string): ((event: Event) => void) | null {
    return this._eventHandlers.get(type) ?? null;
  }

  private _setEventHandler(
    type: string,
    handler: ((event: Event) => void) | null,
  ): void {
    const existing = this._eventHandlers.get(type);
    if (existing) {
      this.removeEventListener(type, existing);
      this._eventHandlers.delete(type);
    }
    if (handler) {
      this._eventHandlers.set(type, handler);
      this.addEventListener(type, handler);
    }
  }

  // ---- On-event properties ----

  get onclick(): ((event: Event) => void) | null {
    return this._getEventHandler('click');
  }
  set onclick(handler: ((event: Event) => void) | null) {
    this._setEventHandler('click', handler);
  }

  get ondblclick(): ((event: Event) => void) | null {
    return this._getEventHandler('dblclick');
  }
  set ondblclick(handler: ((event: Event) => void) | null) {
    this._setEventHandler('dblclick', handler);
  }

  get onmousedown(): ((event: Event) => void) | null {
    return this._getEventHandler('mousedown');
  }
  set onmousedown(handler: ((event: Event) => void) | null) {
    this._setEventHandler('mousedown', handler);
  }

  get onmouseup(): ((event: Event) => void) | null {
    return this._getEventHandler('mouseup');
  }
  set onmouseup(handler: ((event: Event) => void) | null) {
    this._setEventHandler('mouseup', handler);
  }

  get onmousemove(): ((event: Event) => void) | null {
    return this._getEventHandler('mousemove');
  }
  set onmousemove(handler: ((event: Event) => void) | null) {
    this._setEventHandler('mousemove', handler);
  }

  get onmouseover(): ((event: Event) => void) | null {
    return this._getEventHandler('mouseover');
  }
  set onmouseover(handler: ((event: Event) => void) | null) {
    this._setEventHandler('mouseover', handler);
  }

  get onmouseout(): ((event: Event) => void) | null {
    return this._getEventHandler('mouseout');
  }
  set onmouseout(handler: ((event: Event) => void) | null) {
    this._setEventHandler('mouseout', handler);
  }

  get onmouseenter(): ((event: Event) => void) | null {
    return this._getEventHandler('mouseenter');
  }
  set onmouseenter(handler: ((event: Event) => void) | null) {
    this._setEventHandler('mouseenter', handler);
  }

  get onmouseleave(): ((event: Event) => void) | null {
    return this._getEventHandler('mouseleave');
  }
  set onmouseleave(handler: ((event: Event) => void) | null) {
    this._setEventHandler('mouseleave', handler);
  }

  get onkeydown(): ((event: Event) => void) | null {
    return this._getEventHandler('keydown');
  }
  set onkeydown(handler: ((event: Event) => void) | null) {
    this._setEventHandler('keydown', handler);
  }

  get onkeyup(): ((event: Event) => void) | null {
    return this._getEventHandler('keyup');
  }
  set onkeyup(handler: ((event: Event) => void) | null) {
    this._setEventHandler('keyup', handler);
  }

  get onkeypress(): ((event: Event) => void) | null {
    return this._getEventHandler('keypress');
  }
  set onkeypress(handler: ((event: Event) => void) | null) {
    this._setEventHandler('keypress', handler);
  }

  get onfocus(): ((event: Event) => void) | null {
    return this._getEventHandler('focus');
  }
  set onfocus(handler: ((event: Event) => void) | null) {
    this._setEventHandler('focus', handler);
  }

  get onblur(): ((event: Event) => void) | null {
    return this._getEventHandler('blur');
  }
  set onblur(handler: ((event: Event) => void) | null) {
    this._setEventHandler('blur', handler);
  }

  get onchange(): ((event: Event) => void) | null {
    return this._getEventHandler('change');
  }
  set onchange(handler: ((event: Event) => void) | null) {
    this._setEventHandler('change', handler);
  }

  get oninput(): ((event: Event) => void) | null {
    return this._getEventHandler('input');
  }
  set oninput(handler: ((event: Event) => void) | null) {
    this._setEventHandler('input', handler);
  }

  get onsubmit(): ((event: Event) => void) | null {
    return this._getEventHandler('submit');
  }
  set onsubmit(handler: ((event: Event) => void) | null) {
    this._setEventHandler('submit', handler);
  }

  get onreset(): ((event: Event) => void) | null {
    return this._getEventHandler('reset');
  }
  set onreset(handler: ((event: Event) => void) | null) {
    this._setEventHandler('reset', handler);
  }

  get onscroll(): ((event: Event) => void) | null {
    return this._getEventHandler('scroll');
  }
  set onscroll(handler: ((event: Event) => void) | null) {
    this._setEventHandler('scroll', handler);
  }

  get onwheel(): ((event: Event) => void) | null {
    return this._getEventHandler('wheel');
  }
  set onwheel(handler: ((event: Event) => void) | null) {
    this._setEventHandler('wheel', handler);
  }

  get ondrag(): ((event: Event) => void) | null {
    return this._getEventHandler('drag');
  }
  set ondrag(handler: ((event: Event) => void) | null) {
    this._setEventHandler('drag', handler);
  }

  get ondragstart(): ((event: Event) => void) | null {
    return this._getEventHandler('dragstart');
  }
  set ondragstart(handler: ((event: Event) => void) | null) {
    this._setEventHandler('dragstart', handler);
  }

  get ondragend(): ((event: Event) => void) | null {
    return this._getEventHandler('dragend');
  }
  set ondragend(handler: ((event: Event) => void) | null) {
    this._setEventHandler('dragend', handler);
  }

  get ondragover(): ((event: Event) => void) | null {
    return this._getEventHandler('dragover');
  }
  set ondragover(handler: ((event: Event) => void) | null) {
    this._setEventHandler('dragover', handler);
  }

  get ondragenter(): ((event: Event) => void) | null {
    return this._getEventHandler('dragenter');
  }
  set ondragenter(handler: ((event: Event) => void) | null) {
    this._setEventHandler('dragenter', handler);
  }

  get ondragleave(): ((event: Event) => void) | null {
    return this._getEventHandler('dragleave');
  }
  set ondragleave(handler: ((event: Event) => void) | null) {
    this._setEventHandler('dragleave', handler);
  }

  get ondrop(): ((event: Event) => void) | null {
    return this._getEventHandler('drop');
  }
  set ondrop(handler: ((event: Event) => void) | null) {
    this._setEventHandler('drop', handler);
  }

  get onload(): ((event: Event) => void) | null {
    return this._getEventHandler('load');
  }
  set onload(handler: ((event: Event) => void) | null) {
    this._setEventHandler('load', handler);
  }

  get onerror(): ((event: Event) => void) | null {
    return this._getEventHandler('error');
  }
  set onerror(handler: ((event: Event) => void) | null) {
    this._setEventHandler('error', handler);
  }

  get onresize(): ((event: Event) => void) | null {
    return this._getEventHandler('resize');
  }
  set onresize(handler: ((event: Event) => void) | null) {
    this._setEventHandler('resize', handler);
  }

  // ---- tabIndex ----

  private _tabIndex: number | null = null;

  get tabIndex(): number {
    if (this._tabIndex !== null) {
      return this._tabIndex;
    }
    const INTERACTIVE_TAGS = new Set([
      'A',
      'BUTTON',
      'INPUT',
      'SELECT',
      'TEXTAREA',
    ]);
    return INTERACTIVE_TAGS.has(this.tagName) ? 0 : -1;
  }

  set tabIndex(value: number) {
    this._tabIndex = value;
  }
}

/**
 * DOM Document.
 */
export class Document extends Node {
  private _customElements: CustomElementRegistry | null = null;
  private _cookieJar: CookieJar = new CookieJar();

  public readyState: string = 'complete';
  public visibilityState: string = 'visible';
  public activeElement: Element | null = null;
  public contentType: string = 'text/html';
  public characterSet: string = 'UTF-8';
  public URL: string = 'about:blank';
  public domain: string = '';
  public referrer: string = '';
  public defaultView: unknown = null;

  constructor() {
    super(9, '#document');
    this.ownerDocument = null;
  }

  get hidden(): boolean {
    return this.visibilityState === 'hidden';
  }

  get charset(): string {
    return this.characterSet;
  }

  get inputEncoding(): string {
    return this.characterSet;
  }

  get documentURI(): string {
    return this.URL;
  }

  get lastModified(): string {
    return new Date().toString();
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
    const upperTag = tagName.toUpperCase();
    return new HTMLCollection(
      collectDescendantsByTagName.bind(null, this, tagName, upperTag),
    );
  }

  getElementsByClassName(className: string): HTMLCollection {
    const searchClasses = className.split(/\s+/).filter(Boolean);
    return new HTMLCollection(
      collectDescendantsByClassName.bind(null, this, searchClasses),
    );
  }

  createDocumentFragment(): Node {
    return new Node(11, '#document-fragment');
  }

  createRange(): import('./range.js').Range {
    // Lazy import to avoid circular dependency
    const { Range } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./range.js') as typeof import('./range.js');
    return new Range();
  }

  createEvent(_type: string): Event {
    return new Event('');
  }

  createTreeWalker(
    root: Node,
    whatToShow: number = NodeFilter.SHOW_ALL,
    filter: NodeFilterCallback | null = null,
  ): TreeWalker {
    return new TreeWalker(root, whatToShow, filter);
  }

  createNodeIterator(
    root: Node,
    whatToShow: number = NodeFilter.SHOW_ALL,
    filter: NodeFilterCallback | null = null,
  ): NodeIterator {
    return new NodeIterator(root, whatToShow, filter);
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

// tree-walker.ts imports from this module but does not create circular deps
// because it only imports Node. Re-exported here for convenience.
export { NodeFilter, TreeWalker, NodeIterator } from './tree-walker.js';
export type { NodeFilterCallback } from './tree-walker.js';

// Note: html-elements.ts, window.ts, events.ts, range.ts, and selection.ts
// import from this module. To avoid circular dependency issues, they are NOT
// re-exported here. Import them directly from their respective modules.
