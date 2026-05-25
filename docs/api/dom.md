# DOM API Reference

The DOM module provides a complete DOM environment for testing, built entirely
from scratch with zero third-party dependencies. It implements the core DOM
interfaces needed for testing web application UI logic: document creation,
element manipulation, tree traversal, CSS selector queries, event handling,
Shadow DOM, Custom Elements, observers, and much more.

```typescript
import {
  Document,
  DocumentFragment,
  Element,
  Node,
  TextNode,
  Comment,
  Event,
  CustomEvent,
  Window,
  createWindow,
} from '@asymmetric-effort/nogginlessdom';
```

## Core Classes

### Document

`Document` is the root of a DOM tree. It serves as the factory for creating
elements and text nodes, and provides tree-wide query methods.

#### Constructor

```typescript
const doc = new Document();
```

Creates a new, empty document.

#### Methods

- `createElement(tagName: string): Element` -- Create a new element. Returns
  the appropriate typed HTML element class (e.g., `HTMLInputElement` for
  `'input'`). Tag names are stored in uppercase.
- `createTextNode(text: string): TextNode` -- Create a new text node.
- `createComment(text: string): Comment` -- Create a new comment node.
- `createDocumentFragment(): DocumentFragment` -- Create a document fragment.
- `getElementById(id: string): Element | null` -- Find an element by its `id`.
- `querySelector(selector: string): Element | null` -- Find the first matching
  element using a CSS selector.
- `querySelectorAll(selector: string): Element[]` -- Find all matching elements
  using a CSS selector.
- `getElementsByTagName(tagName: string): Element[]` -- Find elements by tag
  name.
- `getElementsByClassName(className: string): Element[]` -- Find elements by
  CSS class name.
- `appendChild(child: Node): Node` -- Append a child node.

```typescript
const doc = new Document();
const div = doc.createElement('div');
div.id = 'app';
doc.appendChild(div);

const found = doc.getElementById('app');
expect(found?.tagName).toBe('DIV');
```

### Element

`Element` represents an HTML element in the DOM tree. It extends `Node` with
attribute handling, event management, class list manipulation, and element-level
query methods.

#### Properties

- `tagName: string` -- Uppercase tag name (e.g., `'DIV'`, `'SPAN'`).
- `id: string` -- Get/set the element's `id` attribute.
- `className: string` -- Get/set the `class` attribute.
- `classList: DOMTokenList` -- Token list for class manipulation.
- `innerHTML: string` -- Get/set HTML content (parses on set).
- `outerHTML: string` -- Serialized HTML including the element itself.
- `textContent: string` -- Get/set text content.
- `style: CSSStyleDeclaration` -- Inline style object.
- `dataset: Record<string, string>` -- Data attribute access.
- `children: Element[]` -- Child elements (excludes text/comment nodes).
- `parentElement: Element | null` -- Parent element.
- `nextSibling / previousSibling` -- Adjacent sibling nodes.
- `nextElementSibling / previousElementSibling` -- Adjacent sibling elements.
- `firstChild / lastChild` -- First/last child nodes.
- `firstElementChild / lastElementChild` -- First/last child elements.

#### Attribute Methods

- `getAttribute(name: string): string | null`
- `setAttribute(name: string, value: string): void`
- `removeAttribute(name: string): void`
- `hasAttribute(name: string): boolean`
- `getAttributeNames(): string[]`
- `toggleAttribute(name: string, force?: boolean): boolean`

#### Event Methods

- `addEventListener(type: string, listener: EventListener, options?): void`
- `removeEventListener(type: string, listener: EventListener): void`
- `dispatchEvent(event: Event): boolean` -- Supports bubbling and capture
  phase propagation.

#### Query Methods

- `querySelector(selector: string): Element | null`
- `querySelectorAll(selector: string): Element[]`
- `getElementsByTagName(tagName: string): Element[]`
- `getElementsByClassName(className: string): Element[]`
- `closest(selector: string): Element | null`
- `matches(selector: string): boolean`

#### Tree Manipulation

- `appendChild(child: Node): Node`
- `removeChild(child: Node): Node`
- `insertBefore(newChild: Node, refChild: Node | null): Node`
- `replaceChild(newChild: Node, oldChild: Node): Node`
- `cloneNode(deep?: boolean): Node`
- `remove(): void`
- `append(...nodes: (Node | string)[]): void`
- `prepend(...nodes: (Node | string)[]): void`
- `before(...nodes: (Node | string)[]): void`
- `after(...nodes: (Node | string)[]): void`
- `replaceWith(...nodes: (Node | string)[]): void`
- `replaceChildren(...nodes: (Node | string)[]): void`

#### Shadow DOM

- `attachShadow(init: { mode: 'open' | 'closed' }): ShadowRoot`
- `shadowRoot: ShadowRoot | null`

```typescript
const div = doc.createElement('div');
div.id = 'host';
const shadow = div.attachShadow({ mode: 'open' });
shadow.innerHTML = '<slot></slot>';
```

### Node

`Node` is the base class for all DOM nodes (`Element`, `TextNode`, `Comment`,
`Document`, `DocumentFragment`).

#### Properties

- `nodeType: number` -- `1` for elements, `3` for text, `8` for comments, `9`
  for documents, `11` for document fragments.
- `nodeName: string` -- Tag name, `'#text'`, `'#comment'`, `'#document'`, or
  `'#document-fragment'`.
- `parentNode: Node | null`
- `childNodes: Node[]`
- `textContent: string`
- `ownerDocument: Document | null`
- `isConnected: boolean`

#### Methods

- `appendChild(child: Node): Node`
- `removeChild(child: Node): Node`
- `insertBefore(newChild: Node, refChild: Node | null): Node`
- `replaceChild(newChild: Node, oldChild: Node): Node`
- `cloneNode(deep?: boolean): Node`
- `contains(other: Node | null): boolean`
- `hasChildNodes(): boolean`
- `normalize(): void`
- `getRootNode(): Node`
- `compareDocumentPosition(other: Node): number`
- `isSameNode(other: Node | null): boolean`
- `isEqualNode(other: Node | null): boolean`

### TextNode

Represents a text node (`nodeType === 3`, `nodeName === '#text'`).

### Comment

Represents a comment node (`nodeType === 8`, `nodeName === '#comment'`).

### DocumentFragment

A lightweight container for a group of nodes. Useful for building DOM
structures off-document before inserting them.

## Typed HTML Elements (24 classes)

When `document.createElement()` is called, the appropriate typed element class
is returned based on the tag name:

| Class                    | Tag Name    | Notable Properties / Methods                                                       |
| ------------------------ | ----------- | ---------------------------------------------------------------------------------- |
| `HTMLAnchorElement`      | `a`         | `href`, `target`, `rel`, `download`, `protocol`, `hostname`                        |
| `HTMLButtonElement`      | `button`    | `type`, `disabled`, `form`, `name`, `value`                                        |
| `HTMLInputElement`       | `input`     | `type`, `value`, `checked`, `disabled`, `placeholder`, `name`, `validity`, `files` |
| `HTMLSelectElement`      | `select`    | `value`, `selectedIndex`, `options`, `multiple`, `disabled`                        |
| `HTMLOptionElement`      | `option`    | `value`, `text`, `selected`, `disabled`, `label`                                   |
| `HTMLTextAreaElement`    | `textarea`  | `value`, `rows`, `cols`, `disabled`, `placeholder`                                 |
| `HTMLFormElement`        | `form`      | `action`, `method`, `elements`, `submit()`, `reset()`                              |
| `HTMLImageElement`       | `img`       | `src`, `alt`, `width`, `height`, `naturalWidth`, `complete`                        |
| `HTMLLabelElement`       | `label`     | `htmlFor`, `control`, `form`                                                       |
| `HTMLDialogElement`      | `dialog`    | `open`, `returnValue`, `show()`, `showModal()`, `close()`                          |
| `HTMLCanvasElement`      | `canvas`    | `width`, `height`, `getContext()`, `toDataURL()`                                   |
| `HTMLTemplateElement`    | `template`  | `content` (DocumentFragment)                                                       |
| `HTMLIFrameElement`      | `iframe`    | `src`, `srcdoc`, `width`, `height`, `contentDocument`                              |
| `HTMLVideoElement`       | `video`     | `src`, `width`, `height`, `poster`, `duration`, `currentTime`, `play()`, `pause()` |
| `HTMLAudioElement`       | `audio`     | `src`, `duration`, `currentTime`, `volume`, `play()`, `pause()`                    |
| `HTMLProgressElement`    | `progress`  | `value`, `max`, `position`                                                         |
| `HTMLMeterElement`       | `meter`     | `value`, `min`, `max`, `low`, `high`, `optimum`                                    |
| `HTMLDetailsElement`     | `details`   | `open`                                                                             |
| `HTMLTableElement`       | `table`     | `rows`, `insertRow()`, `deleteRow()`, `caption`, `tHead`                           |
| `HTMLTableRowElement`    | `tr`        | `cells`, `insertCell()`, `deleteCell()`, `rowIndex`                                |
| `HTMLTableCellElement`   | `td` / `th` | `colSpan`, `rowSpan`, `cellIndex`                                                  |
| `HTMLFieldSetElement`    | `fieldset`  | `disabled`, `elements`, `name`                                                     |
| `HTMLScriptElement`      | `script`    | `src`, `type`, `async`, `defer`, `text`                                            |
| `HTMLSlotElement`        | `slot`      | `name`, `assignedNodes()`, `assignedElements()`                                    |

Additionally, `ValidityState` is provided for form validation.

## Events (20 classes)

Full event system with bubbling, capture phase, `stopPropagation()`,
`stopImmediatePropagation()`, and `preventDefault()`.

### Base Event

```typescript
new Event(type: string, options?: { bubbles?: boolean; cancelable?: boolean; composed?: boolean });
```

### Specialized Event Classes

| Class                | Key Properties                                                                        |
| -------------------- | ------------------------------------------------------------------------------------- |
| `CustomEvent`        | `detail`                                                                              |
| `MouseEvent`         | `clientX`, `clientY`, `button`, `buttons`, `altKey`, `ctrlKey`, `metaKey`, `shiftKey` |
| `KeyboardEvent`      | `key`, `code`, `altKey`, `ctrlKey`, `metaKey`, `shiftKey`, `repeat`                   |
| `FocusEvent`         | `relatedTarget`                                                                       |
| `InputEvent`         | `data`, `inputType`, `isComposing`                                                    |
| `WheelEvent`         | `deltaX`, `deltaY`, `deltaZ`, `deltaMode`                                             |
| `PointerEvent`       | `pointerId`, `width`, `height`, `pressure`, `pointerType`                             |
| `TouchEvent`         | `touches`, `targetTouches`, `changedTouches`                                          |
| `DragEvent`          | `dataTransfer`                                                                        |
| `ClipboardEvent`     | `clipboardData`                                                                       |
| `TransitionEvent`    | `propertyName`, `elapsedTime`, `pseudoElement`                                        |
| `AnimationEvent`     | `animationName`, `elapsedTime`, `pseudoElement`                                       |
| `ErrorEvent`         | `message`, `filename`, `lineno`, `colno`, `error`                                     |
| `MessageEvent`       | `data`, `origin`, `source`                                                            |
| `StorageEvent`       | `key`, `oldValue`, `newValue`, `storageArea`, `url`                                   |
| `PopStateEvent`      | `state`                                                                               |
| `ProgressEvent`      | `lengthComputable`, `loaded`, `total`                                                 |
| `HashChangeEvent`    | `oldURL`, `newURL`                                                                    |
| `BeforeUnloadEvent`  | `returnValue`                                                                         |

## Collections

### NodeList

Array-like collection of nodes with `length`, `item()`, `forEach()`,
`entries()`, `keys()`, `values()`, and indexed access.

### HTMLCollection

Live collection of elements with `length`, `item()`, `namedItem()`, and
indexed access.

### DOMTokenList

Token list for class manipulation: `add()`, `remove()`, `toggle()`,
`contains()`, `replace()`, `item()`, `forEach()`, `entries()`, `keys()`,
`values()`, `length`, and `value`.

### CSSStyleDeclaration

Inline style management supporting `getPropertyValue()`,
`setProperty()`, `removeProperty()`, `cssText`, `length`, and
camelCase property access.

## Shadow DOM and Custom Elements

### ShadowRoot

Created via `element.attachShadow({ mode: 'open' | 'closed' })`. Extends
`Node` and supports query methods (`querySelector`, `querySelectorAll`).

### CustomElementRegistry

Register custom elements with `define()`, retrieve definitions with `get()`,
and check existence with `getName()`.

```typescript
import { CustomElementRegistry, Document } from '@asymmetric-effort/nogginlessdom';

const registry = new CustomElementRegistry();
class MyElement extends Element {}
registry.define('my-element', MyElement);
```

## Observer APIs

### MutationObserver

Observe changes to the DOM tree: child list mutations, attribute changes, and
character data changes.

```typescript
import { MutationObserver, Document } from '@asymmetric-effort/nogginlessdom';

const doc = new Document();
const div = doc.createElement('div');

const observer = new MutationObserver((records) => {
  console.log('Mutations:', records.length);
});

observer.observe(div, { childList: true, attributes: true });
div.appendChild(doc.createElement('span'));
// Observer callback fires with a MutationRecord
```

Includes `MutationRecord` with `type`, `target`, `addedNodes`, `removedNodes`,
`attributeName`, `oldValue`, and other standard properties.

### IntersectionObserver

Simulate intersection observation with `observe()`, `unobserve()`,
`disconnect()`, and the `triggerIntersection()` helper for testing.

### ResizeObserver

Simulate resize observation with `observe()`, `unobserve()`, `disconnect()`,
and the `triggerResize()` helper for testing.

## Traversal

### TreeWalker

Walk a DOM tree with configurable filters. Created via
`new TreeWalker(root, whatToShow, filter)`.

Methods: `firstChild()`, `lastChild()`, `nextNode()`, `previousNode()`,
`parentNode()`, `nextSibling()`, `previousSibling()`.

### NodeIterator

Iterate through a DOM tree in document order. Created via
`new NodeIterator(root, whatToShow, filter)`.

Methods: `nextNode()`, `previousNode()`, `detach()`.

### NodeFilter

Constants for `whatToShow` bitmask: `SHOW_ALL`, `SHOW_ELEMENT`,
`SHOW_TEXT`, `SHOW_COMMENT`, `SHOW_DOCUMENT`, `SHOW_DOCUMENT_FRAGMENT`.

Filter return values: `FILTER_ACCEPT`, `FILTER_REJECT`, `FILTER_SKIP`.

### Range

Represents a range of content in the DOM. Methods include `setStart()`,
`setEnd()`, `setStartBefore()`, `setStartAfter()`, `setEndBefore()`,
`setEndAfter()`, `selectNode()`, `selectNodeContents()`, `collapse()`,
`cloneContents()`, `extractContents()`, `deleteContents()`,
`insertNode()`, `surroundContents()`, `compareBoundaryPoints()`,
`cloneRange()`, `detach()`, `toString()`.

### Selection

Represents the user's selection. Methods include `getRangeAt()`,
`addRange()`, `removeRange()`, `removeAllRanges()`, `collapse()`,
`collapseToStart()`, `collapseToEnd()`, `extend()`, `selectAllChildren()`,
`containsNode()`, `toString()`.

## Parsing and Serialization

### DOMParser

Parse HTML strings into documents with
`parseFromString(str, 'text/html')`.

### XMLSerializer

Serialize DOM trees back to string with `serializeToString(node)`.

### HTML Parser

Internal `parseHTML()` function handles HTML string parsing for `innerHTML`
assignments.

### HTML Serializer

Internal `serializeNode()` and `serializeChildren()` functions for generating
HTML output.

### CSS Selector Engine

Full selector engine supporting:

- Tag selectors (`div`, `span`)
- Class selectors (`.class`)
- ID selectors (`#id`)
- Attribute selectors (`[attr]`, `[attr=value]`, `[attr^=value]`,
  `[attr$=value]`, `[attr*=value]`, `[attr~=value]`, `[attr|=value]`)
- Combinators (descendant, child `>`, adjacent sibling `+`, general sibling `~`)
- Pseudo-classes (`:first-child`, `:last-child`, `:nth-child()`, etc.)
- Universal selector (`*`)

## Data APIs

### FormData

Standard `FormData` implementation with `append()`, `delete()`, `get()`,
`getAll()`, `has()`, `set()`, `entries()`, `keys()`, `values()`, `forEach()`.

### Headers

HTTP headers collection with `append()`, `delete()`, `get()`, `has()`,
`set()`, `entries()`, `keys()`, `values()`, `forEach()`.

### DataTransfer / DataTransferItemList

Drag-and-drop data transfer support with `setData()`, `getData()`,
`clearData()`, `items`, `types`, `files`, `dropEffect`, `effectAllowed`.

### CookieJar

Cookie management with `setCookie()`, `getCookie()`, `getAllCookies()`,
`deleteCookie()`, `clearAll()`, with support for path, domain, expiry,
secure, and httpOnly flags.

## Abort API

### AbortController / AbortSignal

Standard abort controller for cancelling operations.

```typescript
import { AbortController } from '@asymmetric-effort/nogginlessdom';

const controller = new AbortController();
const signal = controller.signal;

signal.addEventListener('abort', () => {
  console.log('Aborted!');
});

controller.abort();
expect(signal.aborted).toBe(true);
```

## Window Environment

### Window

Full window environment with:

- `document` -- A `Document` instance.
- `localStorage` / `sessionStorage` -- `Storage` instances.
- `location` -- `Location` instance.
- `history` -- `History` instance.
- `navigator` -- `Navigator` instance.
- `matchMedia()` -- Returns `MediaQueryList` instances.
- `getComputedStyle()` -- Returns a `CSSStyleDeclaration`.
- `fetch()` -- Simulated fetch API.
- `requestAnimationFrame()` / `cancelAnimationFrame()`
- `addEventListener()` / `removeEventListener()` / `dispatchEvent()`
- `setTimeout` / `setInterval` / `clearTimeout` / `clearInterval`

### `createWindow(options?)`

Factory function that creates an isolated `Window` instance.

### Storage

`localStorage` / `sessionStorage` simulation with `getItem()`, `setItem()`,
`removeItem()`, `clear()`, `key()`, and `length`.

### Location

URL properties: `href`, `protocol`, `host`, `hostname`, `port`, `pathname`,
`search`, `hash`, `origin`. Methods: `assign()`, `replace()`, `reload()`.

### History

Navigation history with `pushState()`, `replaceState()`, `go()`, `back()`,
`forward()`, `length`, and `state`.

### Navigator

Browser identification: `userAgent`, `language`, `languages`, `platform`,
`onLine`, `cookieEnabled`.

### MediaQueryList

Media query matching with `matches`, `media`, `addEventListener()`,
`removeEventListener()`.

### Request / Response

HTTP request and response simulation for the fetch API.

## Web API Utilities

- `atob(data)` -- Decode a base64 string.
- `btoa(data)` -- Encode a string to base64.
- `TextEncoder` / `TextDecoder` -- Text encoding utilities.
- `Blob` -- Binary large object.
- `structuredClone` -- Deep clone.
- `queueMicrotask` -- Microtask scheduling.
- `crypto` -- Web Crypto API.

## Complete Example

```typescript
import {
  describe,
  it,
  expect,
  Document,
  Event,
  CustomEvent,
  MutationObserver,
  Window,
  createWindow,
} from '@asymmetric-effort/nogginlessdom';

describe('Todo App', () => {
  it('should add and remove items', () => {
    const doc = new Document();
    const ul = doc.createElement('ul');
    ul.id = 'todo-list';
    doc.appendChild(ul);

    for (const text of ['Buy groceries', 'Walk the dog', 'Write tests']) {
      const li = doc.createElement('li');
      li.className = 'todo-item';
      li.textContent = text;
      ul.appendChild(li);
    }

    expect(doc.querySelectorAll('.todo-item')).toHaveLength(3);
    expect(doc.querySelector('li')?.textContent).toBe('Buy groceries');

    const firstItem = ul.childNodes[0];
    ul.removeChild(firstItem);
    expect(doc.querySelectorAll('.todo-item')).toHaveLength(2);
  });

  it('should handle events with bubbling', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const button = doc.createElement('button');
    div.appendChild(button);
    doc.appendChild(div);

    const clicks: string[] = [];
    div.addEventListener('click', () => clicks.push('div'));
    button.addEventListener('click', () => clicks.push('button'));

    button.dispatchEvent(new Event('click', { bubbles: true }));
    expect(clicks).toEqual(['button', 'div']);
  });

  it('should use a window environment', () => {
    const win = createWindow();
    win.localStorage.setItem('key', 'value');
    expect(win.localStorage.getItem('key')).toBe('value');

    win.location.href = 'https://example.com/page?q=test';
    expect(win.location.hostname).toBe('example.com');
  });
});
```
