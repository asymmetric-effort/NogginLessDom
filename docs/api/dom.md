# DOM Simulation API Reference

NogginLessDom provides a complete, zero-dependency DOM simulation for testing web
applications without a browser. Every class and function described here is
available from the top-level package import.

```typescript
import {
  Document, Element, Node, TextNode, Comment, DocumentFragment,
  Event, createWindow,
} from '@asymmetric-effort/nogginlessdom';
```

---

## Core Classes

### Node

Base class for all DOM nodes. Provides tree manipulation, traversal, and
comparison methods.

#### Node Type Constants

| Constant | Value |
|---|---|
| `Node.ELEMENT_NODE` | 1 |
| `Node.TEXT_NODE` | 3 |
| `Node.COMMENT_NODE` | 8 |
| `Node.DOCUMENT_NODE` | 9 |
| `Node.DOCUMENT_FRAGMENT_NODE` | 11 |

#### Document Position Constants

| Constant | Value |
|---|---|
| `Node.DOCUMENT_POSITION_DISCONNECTED` | 1 |
| `Node.DOCUMENT_POSITION_PRECEDING` | 2 |
| `Node.DOCUMENT_POSITION_FOLLOWING` | 4 |
| `Node.DOCUMENT_POSITION_CONTAINS` | 8 |
| `Node.DOCUMENT_POSITION_CONTAINED_BY` | 16 |

#### Properties

| Property | Type | Description |
|---|---|---|
| `nodeType` | `number` | The node type constant |
| `nodeName` | `string` | The node name (`#text`, `#comment`, tag name, etc.) |
| `childNodes` | `Node[]` | Direct child nodes |
| `parentNode` | `Node \| null` | Parent node |
| `parentElement` | `Element \| null` | Parent element (null if parent is not an Element) |
| `ownerDocument` | `Document \| null` | The owning document |
| `isConnected` | `boolean` | True if the node is in a document tree |
| `nodeValue` | `string \| null` | Node value (null for non-text nodes) |
| `textContent` | `string` | Text content of the node and all descendants |
| `firstChild` | `Node \| null` | First child node |
| `lastChild` | `Node \| null` | Last child node |
| `nextSibling` | `Node \| null` | Next sibling node |
| `previousSibling` | `Node \| null` | Previous sibling node |

#### Methods

**`appendChild(child: Node): Node`** -- Appends a child node. Removes the child
from its current parent if it has one. Fires `connectedCallback` on custom
elements.

```typescript
const div = document.createElement('div');
const span = document.createElement('span');
div.appendChild(span);
```

**`removeChild(child: Node): Node`** -- Removes a child node. Throws if the
node is not a child. Fires `disconnectedCallback` on custom elements.

**`insertBefore(newChild: Node, referenceChild: Node | null): Node`** -- Inserts
a node before a reference child. If `referenceChild` is null, appends to the
end.

**`replaceChild(newChild: Node, oldChild: Node): Node`** -- Replaces an existing
child with a new node.

**`contains(other: Node): boolean`** -- Returns true if `other` is a descendant
of this node (or is this node itself).

**`hasChildNodes(): boolean`** -- Returns true if the node has children.

**`cloneNode(deep?: boolean): Node`** -- Creates a copy. If `deep` is true,
clones all descendants.

**`normalize(): void`** -- Merges adjacent text nodes and removes empty text
nodes.

**`isEqualNode(other: Node | null): boolean`** -- Deep-compares two nodes
for structural equality.

**`isSameNode(other: Node | null): boolean`** -- Returns true if both
references point to the same node.

**`compareDocumentPosition(other: Node): number`** -- Returns a bitmask
describing the position of `other` relative to this node.

---

### Element

Extends `Node`. Represents an HTML or SVG element with attributes, styling,
events, and DOM manipulation capabilities.

#### Constructor

```typescript
new Element(tagName: string, namespaceURI?: string | null)
```

Tag names are uppercased for HTML, preserved for SVG.

#### Properties

| Property | Type | Description |
|---|---|---|
| `tagName` | `string` | Uppercase tag name (e.g. `'DIV'`) |
| `id` | `string` | The element's ID |
| `className` | `string` | Space-separated class names |
| `namespaceURI` | `string \| null` | Namespace URI |
| `innerHTML` | `string` | HTML content of the element |
| `outerHTML` | `string` (read-only) | HTML including the element itself |
| `classList` | `DOMTokenList` | Token list for class manipulation |
| `style` | `CSSStyleDeclaration` | Inline style object |
| `dataset` | `DOMStringMap` | Data attribute access via `data-*` |
| `children` | `HTMLCollection` | Child elements (not text/comment nodes) |
| `childElementCount` | `number` | Number of child elements |
| `firstElementChild` | `Element \| null` | First child element |
| `lastElementChild` | `Element \| null` | Last child element |
| `nextElementSibling` | `Element \| null` | Next sibling element |
| `previousElementSibling` | `Element \| null` | Previous sibling element |
| `shadowRoot` | `ShadowRoot \| null` | Open shadow root, or null |
| `slot` | `string` | Slot name for shadow DOM distribution |
| `assignedSlot` | `Element \| null` | The slot element this is assigned to |
| `tabIndex` | `number` | Tab order (0 for interactive elements, -1 otherwise) |
| `contentEditable` | `string` | `'true'`, `'false'`, or `'inherit'` |
| `isContentEditable` | `boolean` | Resolved editability |

#### Attribute Methods

```typescript
element.setAttribute('href', '/page');
element.getAttribute('href');        // '/page'
element.hasAttribute('href');        // true
element.removeAttribute('href');
element.toggleAttribute('disabled'); // toggles presence
element.getAttributeNames();         // ['class', 'id', ...]
element.hasAttributes();             // true if any attributes exist

// Namespaced variants
element.setAttributeNS(ns, name, value);
element.getAttributeNS(ns, name);
element.removeAttributeNS(ns, name);
element.hasAttributeNS(ns, name);
```

#### Query Methods

```typescript
element.querySelector('.active');             // first match or null
element.querySelectorAll('li.item');          // NodeList of all matches
element.getElementsByTagName('span');         // live HTMLCollection
element.getElementsByClassName('highlight');  // live HTMLCollection
element.closest('.wrapper');                  // nearest ancestor matching selector
element.matches('.active');                   // true if this element matches
```

#### DOM Manipulation

```typescript
element.before(nodeA, nodeB);      // insert before this element
element.after(nodeA);              // insert after this element
element.prepend(child);            // insert as first child
element.append(childA, childB);    // append children
element.remove();                  // remove from parent
element.replaceWith(newElement);   // replace with another node
element.click();                   // dispatch a click event
element.focus();                   // dispatch focus event
element.blur();                    // dispatch blur event
```

#### Layout and Geometry (Test Helpers)

All layout properties default to 0. Use `setBoundingClientRect` and
`setLayoutMetrics` to configure values for testing.

```typescript
element.setBoundingClientRect({ x: 10, y: 20, width: 100, height: 50 });
const rect = element.getBoundingClientRect();
// { x: 10, y: 20, width: 100, height: 50, top: 20, right: 110, bottom: 70, left: 10 }

element.setLayoutMetrics({
  offsetWidth: 200, offsetHeight: 100,
  clientWidth: 180, clientHeight: 80,
  scrollWidth: 500, scrollHeight: 300,
});

element.scrollIntoView();   // no-op stub
element.scroll(x, y);
element.scrollTo(x, y);
element.scrollBy(dx, dy);
element.getClientRects();   // [getBoundingClientRect()]
```

#### Event Handler Properties

All standard `on*` event handler properties are supported:

`onclick`, `ondblclick`, `onmousedown`, `onmouseup`, `onmousemove`,
`onmouseover`, `onmouseout`, `onmouseenter`, `onmouseleave`, `onkeydown`,
`onkeyup`, `onkeypress`, `onfocus`, `onblur`, `onchange`, `oninput`,
`onsubmit`, `onreset`, `onscroll`, `onwheel`, `ondrag`, `ondragstart`,
`ondragend`, `ondragover`, `ondragenter`, `ondragleave`, `ondrop`, `onload`,
`onerror`, `onresize`

```typescript
element.onclick = (event) => { console.log('clicked'); };
```

---

### TextNode

Extends `Node` with `nodeType` 3. Represents text content.

```typescript
const text = new TextNode('Hello');
text.data;            // 'Hello'
text.data = 'World';  // updates text; fires characterData mutation
text.textContent;     // 'World'
text.nodeValue;       // 'World'
text.cloneNode();     // new TextNode('World')
```

---

### Comment

Extends `Node` with `nodeType` 8. Represents an HTML comment.

```typescript
const comment = new Comment('TODO: fix this');
comment.data;         // 'TODO: fix this'
comment.textContent;  // 'TODO: fix this'
```

---

### DocumentFragment

Extends `Node` with `nodeType` 11. A lightweight container for nodes that can be
inserted into the DOM as a group.

```typescript
const fragment = new DocumentFragment();
fragment.appendChild(new Element('p'));
fragment.querySelector('p');        // works
fragment.querySelectorAll('*');     // works
parent.appendChild(fragment);       // transfers all children
```

---

### Document

Extends `Node` with `nodeType` 9. The root of a DOM tree.

#### Properties

| Property | Type | Description |
|---|---|---|
| `readyState` | `string` | Always `'complete'` |
| `activeElement` | `Element \| null` | Currently focused element |
| `contentType` | `string` | `'text/html'` |
| `characterSet` | `string` | `'UTF-8'` |
| `URL` | `string` | Document URL |
| `domain` | `string` | Document domain |
| `referrer` | `string` | Referrer URL |
| `defaultView` | `unknown` | The parent Window |
| `visibilityState` | `string` | `'visible'` or `'hidden'` |
| `hidden` | `boolean` | True when `visibilityState` is `'hidden'` |
| `cookie` | `string` | Cookie string (full cookie jar) |
| `body` | `Element \| null` | The `<body>` element |
| `head` | `Element \| null` | The `<head>` element |
| `title` | `string` | Content of the `<title>` element |
| `documentElement` | `Element \| null` | The `<html>` element |
| `customElements` | `CustomElementRegistry` | Custom element registry |

#### Collection Properties

| Property | Description |
|---|---|
| `forms` | All `<form>` elements |
| `images` | All `<img>` elements |
| `links` | All `<a>` and `<area>` elements with `href` |
| `scripts` | All `<script>` elements |
| `embeds` | All `<embed>` elements |
| `anchors` | All `<a>` elements with `name` |

#### Factory Methods

```typescript
document.createElement('div');
document.createElementNS('http://www.w3.org/2000/svg', 'circle');
document.createTextNode('hello');
document.createComment('note');
document.createDocumentFragment();
document.createRange();
document.createEvent('Event');
document.createTreeWalker(root, whatToShow, filter);
document.createNodeIterator(root, whatToShow, filter);
```

#### Query Methods

```typescript
document.getElementById('app');
document.querySelector('#app .content');
document.querySelectorAll('button');
document.getElementsByTagName('div');
document.getElementsByClassName('active');
```

#### Utility Methods

```typescript
document.adoptNode(externalNode);     // removes from original tree
document.importNode(node, deep);      // clone with optional deep copy
document.addEventListener('click', handler);
document.removeEventListener('click', handler);
document.dispatchEvent(event);
```

#### Test Helpers

```typescript
document.setVisibility('hidden');   // changes visibilityState and fires event
```

---

## HTML Elements

### Form Elements

#### HTMLInputElement (input)

| Property | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | `'text'` | Input type |
| `value` | `string` | `''` | Current value |
| `name` | `string` | `''` | Form control name |
| `disabled` | `boolean` | `false` | Disabled state |
| `checked` | `boolean` | `false` | Checked state (checkbox/radio) |
| `placeholder` | `string` | `''` | Placeholder text |
| `readOnly` | `boolean` | `false` | Read-only state |
| `required` | `boolean` | `false` | Required state |
| `min` / `max` / `step` | `string` | `''` | Numeric constraints |
| `pattern` | `string` | `''` | Regex validation pattern |
| `minLength` / `maxLength` | `number` | `-1` | Length constraints |
| `defaultValue` | `string` | `''` | Default value |
| `defaultChecked` | `boolean` | `false` | Default checked |
| `willValidate` | `boolean` | computed | True when not disabled |
| `validity` | `ValidityState` | computed | Full validity state object |
| `validationMessage` | `string` | `''` | Custom validation message |

**Validation methods:** `checkValidity()`, `reportValidity()`,
`setCustomValidity(message)`

**Focus methods:** `focus()`, `blur()`, `select()`, `click()`

```typescript
const input = document.createElement('input');
input.type = 'email';
input.required = true;
input.value = 'invalid';
input.validity.typeMismatch;    // true
input.validity.valid;           // false
```

#### ValidityState

The `validity` property on form elements returns a `ValidityState` with these
boolean properties: `badInput`, `customError`, `patternMismatch`,
`rangeOverflow`, `rangeUnderflow`, `stepMismatch`, `tooLong`, `tooShort`,
`typeMismatch`, `valueMissing`, `valid`.

#### HTMLButtonElement (button)

Properties: `type` (`'submit'`, `'reset'`, `'button'`), `name`, `value`,
`disabled`.

#### HTMLSelectElement (select)

Properties: `name`, `disabled`, `multiple`, `required`, `selectedIndex`,
`value`, `options` (array of `HTMLOptionElement`).

Validation: `validity`, `checkValidity()`, `setCustomValidity()`.

```typescript
const select = document.createElement('select');
const option = document.createElement('option');
option.value = 'a';
option.textContent = 'Option A';
select.appendChild(option);
select.value;  // 'a'
```

#### HTMLOptionElement (option)

Properties: `value`, `selected`, `disabled`, `defaultSelected`, `index`,
`label`, `text`.

#### HTMLTextAreaElement (textarea)

Properties: `value`, `name`, `disabled`, `readOnly`, `required`, `placeholder`,
`rows` (default 2), `cols` (default 20), `minLength`, `maxLength`,
`defaultValue`.

Validation: `validity`, `checkValidity()`, `setCustomValidity()`.

#### HTMLFormElement (form)

Properties: `action`, `method`, `enctype`, `target`, `name`, `elements` (array
of form controls).

Methods: `submit()`, `reset()`.

```typescript
const form = document.createElement('form');
const input = document.createElement('input');
input.name = 'email';
form.appendChild(input);
form.elements; // [input]
```

#### HTMLLabelElement (label)

Properties: `htmlFor`, `form`, `control`.

#### HTMLFieldSetElement (fieldset)

Properties: `disabled`, `name`.

#### HTMLOutputElement (output)

Properties: `value` (mapped to `textContent`), `defaultValue`, `htmlFor`.

### Media Elements

#### HTMLImageElement (img)

Properties: `src`, `alt`, `width`, `height`, `naturalWidth`, `naturalHeight`,
`complete`.

#### HTMLVideoElement (video)

Properties: `src`, `controls`, `autoplay`, `loop`, `muted`, `width`, `height`,
`currentTime`, `duration`, `paused`, `ended`.

Methods: `play()` (returns Promise, sets `paused = false`), `pause()`.

#### HTMLAudioElement (audio)

Same media properties and methods as `HTMLVideoElement` (without `width`/
`height`).

#### HTMLPictureElement (picture)

Container element. No additional properties.

#### HTMLSourceElement (source)

Properties: `src`, `type`, `srcset`, `media`.

### Table Elements

#### HTMLTableElement (table)

Properties: `rows` (all TR descendants), `tBodies`, `tHead`, `tFoot`.

Methods: `insertRow(index?)`, `deleteRow(index)`, `createTBody()`,
`createTHead()`, `createTFoot()`.

```typescript
const table = document.createElement('table');
const row = table.insertRow();
const cell = row.insertCell();
cell.textContent = 'Hello';
table.rows.length;  // 1
```

#### HTMLTableRowElement (tr)

Properties: `cells` (array of `HTMLTableCellElement`), `rowIndex`.

Methods: `insertCell(index?)`, `deleteCell(index)`.

#### HTMLTableCellElement (td / th)

Properties: `colSpan`, `rowSpan`, `cellIndex`.

### Interactive Elements

#### HTMLDialogElement (dialog)

Properties: `open`, `returnValue`.

Methods: `show()`, `showModal()`, `close(returnValue?)`.

```typescript
const dialog = document.createElement('dialog');
dialog.showModal();
dialog.open;        // true
dialog.close('ok');
dialog.returnValue; // 'ok'
dialog.open;        // false
```

#### HTMLDetailsElement (details)

Properties: `open`.

#### HTMLProgressElement (progress)

Properties: `value`, `max`.

#### HTMLMeterElement (meter)

Properties: `value`, `min`, `max`, `low`, `high`, `optimum`.

### Other Elements

#### HTMLAnchorElement (a)

Properties: `href`, `target`, `rel`, `download`, `hash`, `host`, `hostname`,
`pathname`, `port`, `protocol`, `search`, `text`.

#### HTMLCanvasElement (canvas)

Properties: `width` (default 300), `height` (default 150).

Methods: `getContext('2d')`, `toDataURL(type?)`, `toBlob(callback)`.

#### HTMLTemplateElement (template)

Properties: `content` (a `DocumentFragment`).

#### HTMLIFrameElement (iframe)

Properties: `src`, `width`, `height`, `name`, `contentDocument`,
`contentWindow`.

#### HTMLScriptElement (script)

Properties: `src`, `type`, `async`, `defer`, `text`.

#### HTMLSlotElement (slot)

Properties: `name`.

Methods: `assignedNodes(options?)`, `assignedElements(options?)`.

#### HTMLLinkElement (link)

Properties: `rel`, `href`, `type`.

Automatically triggers stylesheet loading when `rel="stylesheet"` and a
stylesheet loader is configured on the Window.

#### HTMLTimeElement (time)

Properties: `dateTime`.

---

## SVG Elements

SVG elements are created with `createElementNS` using the SVG namespace.

```typescript
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
circle.setAttribute('cx', '50');
circle.setAttribute('r', '25');
svg.appendChild(circle);
```

### SVGElement (base class)

All SVG elements extend `SVGElement`, which sets `namespaceURI` to
`http://www.w3.org/2000/svg` and preserves lowercase tag names.

Property: `viewBox` -- parses the `viewBox` attribute into
`{ baseVal: { x, y, width, height } }`.

### Supported SVG Element Classes

| Class | Tag | Additional API |
|---|---|---|
| `SVGSVGElement` | svg | `createSVGRect()`, `createSVGPoint()`, `createSVGMatrix()` |
| `SVGPathElement` | path | -- |
| `SVGCircleElement` | circle | `cx`, `cy`, `r` (as `{ baseVal: { value } }`) |
| `SVGRectElement` | rect | -- |
| `SVGLineElement` | line | -- |
| `SVGTextElement` | text | -- |
| `SVGGElement` | g | -- |
| `SVGDefsElement` | defs | -- |
| `SVGUseElement` | use | `href` (as `{ baseVal }`) |

---

## CSS and Styling

### CSSStyleDeclaration

Provides access to inline styles via a `Proxy`, supporting both camelCase
property access and standard methods.

```typescript
const el = document.createElement('div');
el.style.backgroundColor = 'red';                      // camelCase setter
el.style.getPropertyValue('background-color');          // 'red'
el.style.setProperty('color', 'blue');
el.style.setProperty('font-size', '14px', 'important');
el.style.getPropertyPriority('font-size');              // 'important'
el.style.removeProperty('color');                       // returns 'blue'
el.style.cssText;           // 'background-color: red; font-size: 14px'
el.style.cssText = 'margin: 10px; padding: 5px';
el.style.length;            // 2
el.style.item(0);           // 'margin'
```

### getComputedStyle

`Window.getComputedStyle(element, pseudoElement?)` returns a
`CSSStyleDeclaration` with styles resolved from:

1. Default display values based on tag name
2. External stylesheets loaded via `configureStylesheetLoader`
3. `<style>` elements in the document
4. Inline styles
5. Inherited properties from the ancestor chain

```typescript
const win = createWindow();
const doc = win.document;
const style = doc.createElement('style');
style.textContent = '.box { color: red; font-size: 16px; }';
doc.head.appendChild(style);

const div = doc.createElement('div');
div.className = 'box';
doc.body.appendChild(div);

const computed = win.getComputedStyle(div);
computed.getPropertyValue('color');     // 'red'
computed.getPropertyValue('display');   // 'block' (default for div)
```

#### Specificity and Cascade

Rules are sorted by specificity `[id-count, class-count, element-count]` and
then by source order. Higher specificity wins; for equal specificity, the later
rule wins.

#### CSS Inheritance

The following properties are inherited from parent elements when not explicitly
set: `color`, `font-family`, `font-size`, `font-style`, `font-weight`,
`line-height`, `text-align`, `text-indent`, `text-transform`, `visibility`,
`cursor`, `direction`, `letter-spacing`, `word-spacing`, `white-space`,
`list-style-type`, `list-style-position`, `list-style-image`,
`border-collapse`, `border-spacing`, `caption-side`, `empty-cells`, `quotes`,
`speak`, `orphans`, `widows`.

```typescript
const parent = doc.createElement('div');
parent.style.color = 'blue';
doc.body.appendChild(parent);

const child = doc.createElement('span');
parent.appendChild(child);

win.getComputedStyle(child).getPropertyValue('color'); // 'blue' (inherited)
```

#### CSS Variables (Custom Properties)

Custom properties (`--*`) are inherited through the DOM tree and resolved with
`var()`.

```typescript
const style = doc.createElement('style');
style.textContent = `
  :root { --primary: blue; }
  .btn { color: var(--primary); }
  .btn.alt { color: var(--accent, green); }
`;
doc.head.appendChild(style);
```

Variables resolve through ancestor chains: a `var(--name, fallback)` expression
uses the fallback when the variable is undefined. Nested `var()` references are
resolved iteratively up to 10 levels.

#### calc() Expressions

`calc()` expressions are evaluated when all operands share the same unit.
Mixed-unit expressions are left as-is.

```typescript
style.textContent = '.box { width: calc(100px + 50px); }';
// getComputedStyle resolves to '150px'
```

Supports `+`, `-`, `*`, `/` with units: `px`, `em`, `rem`, `%`, `vh`, `vw`,
and more.

#### Pseudo-elements

`::before` and `::after` pseudo-elements are supported in `getComputedStyle`.

```typescript
style.textContent = '.icon::before { content: "X"; color: gold; }';
const pseudoStyle = win.getComputedStyle(icon, '::before');
pseudoStyle.getPropertyValue('content'); // '"X"'
pseudoStyle.getPropertyValue('color');   // 'gold'
```

#### @media Rules

Rules inside `@media` blocks are only applied when the media query matches the
window's current state.

```typescript
style.textContent = `
  @media (min-width: 768px) { .sidebar { display: block; } }
  @media (max-width: 767px) { .sidebar { display: none; } }
`;
```

#### External Stylesheets

Use `configureStylesheetLoader` to load external CSS files referenced by
`<link rel="stylesheet">` elements.

```typescript
win.configureStylesheetLoader((href) => {
  return '.external { color: purple; }';
});
const link = doc.createElement('link');
link.rel = 'stylesheet';
link.href = '/styles.css';
doc.head.appendChild(link);
```

#### !important Handling

Properties declared `!important` in stylesheets override non-important inline
styles. Inline `!important` declarations override stylesheet `!important`.

```typescript
style.textContent = '.box { color: red !important; }';
div.style.setProperty('color', 'blue');
// getComputedStyle returns 'red' (stylesheet !important wins)

div.style.setProperty('color', 'green', 'important');
// getComputedStyle returns 'green' (inline !important wins)
```

#### Shorthand Expansion

The following shorthand properties are automatically expanded to longhands:

- `margin` / `padding` to `*-top`, `*-right`, `*-bottom`, `*-left`
- `border` to `border-width`, `border-style`, `border-color`
- `background` to `background-color`
- `font` to `font-weight`, `font-size`, `line-height`, `font-family`

---

## Events

### Base Event Class

```typescript
const event = new Event('click', {
  bubbles: true,
  cancelable: true,
  composed: false,
});
```

#### Event Properties

| Property | Type | Description |
|---|---|---|
| `type` | `string` | Event type name |
| `bubbles` | `boolean` | Whether event bubbles |
| `cancelable` | `boolean` | Whether default can be prevented |
| `composed` | `boolean` | Whether event crosses shadow DOM boundaries |
| `isTrusted` | `boolean` | Always `false` (synthetic events) |
| `timeStamp` | `number` | Timestamp when created |
| `defaultPrevented` | `boolean` | Whether `preventDefault()` was called |
| `target` | `Node \| null` | The event target |
| `currentTarget` | `Node \| null` | Current handler's target |
| `eventPhase` | `number` | 0=NONE, 1=CAPTURING, 2=AT\_TARGET, 3=BUBBLING |

#### Event Methods

- `preventDefault()` -- Prevents the default action (if cancelable)
- `stopPropagation()` -- Stops propagation to further listeners
- `stopImmediatePropagation()` -- Stops propagation and skips remaining
  listeners on the current target
- `composedPath()` -- Returns the event path, crossing shadow boundaries if
  composed

### Event Dispatch

Elements support the full W3C event dispatch model: capturing phase,
target phase, and bubbling phase.

```typescript
element.addEventListener('click', handler);
element.addEventListener('click', handler, { capture: true, once: true });
element.removeEventListener('click', handler);
element.dispatchEvent(new Event('click', { bubbles: true }));
```

### Event Subclasses

#### CustomEvent

```typescript
new CustomEvent('my-event', { bubbles: true, detail: { key: 'value' } });
// Properties: detail
```

#### MouseEvent

```typescript
new MouseEvent('click', {
  bubbles: true, cancelable: true,
  clientX: 100, clientY: 200,
  button: 0, buttons: 1,
  altKey: false, ctrlKey: false, shiftKey: false, metaKey: false,
});
```

#### KeyboardEvent

```typescript
new KeyboardEvent('keydown', {
  key: 'Enter', code: 'Enter',
  altKey: false, ctrlKey: true, shiftKey: false, metaKey: false,
  repeat: false,
});
```

#### FocusEvent

Properties: `relatedTarget`.

#### InputEvent

Properties: `data`, `inputType`.

#### WheelEvent

Extends `MouseEvent`. Properties: `deltaX`, `deltaY`, `deltaZ`, `deltaMode`.

Constants: `DOM_DELTA_PIXEL` (0), `DOM_DELTA_LINE` (1), `DOM_DELTA_PAGE` (2).

#### PointerEvent

Extends `MouseEvent`. Properties: `pointerId`, `pointerType`, `isPrimary`,
`width`, `height`, `pressure`, `tiltX`, `tiltY`, `twist`.

#### TouchEvent

Properties: `touches`, `targetTouches`, `changedTouches` (arrays of `Touch`
objects with `identifier`, `target`, `clientX`, `clientY`, `pageX`, `pageY`,
`screenX`, `screenY`).

#### DragEvent

Extends `MouseEvent`. Properties: `dataTransfer` (a `DataTransfer` instance).

#### ClipboardEvent

Properties: `clipboardData` (a `DataTransfer` instance).

#### TransitionEvent

Properties: `propertyName`, `elapsedTime`, `pseudoElement`.

#### AnimationEvent

Properties: `animationName`, `elapsedTime`, `pseudoElement`.

#### ErrorEvent

Properties: `message`, `filename`, `lineno`, `colno`, `error`.

#### MessageEvent

Properties: `data`, `origin`, `source`, `ports`.

#### StorageEvent

Properties: `key`, `oldValue`, `newValue`, `url`, `storageArea`.

#### PopStateEvent

Properties: `state`.

#### ProgressEvent

Properties: `lengthComputable`, `loaded`, `total`.

#### HashChangeEvent

Properties: `oldURL`, `newURL`.

#### PromiseRejectionEvent

Properties: `promise`, `reason`.

#### BeforeUnloadEvent

Properties: `returnValue` (settable string).

---

## Selectors

NogginLessDom implements a CSS selector engine supporting:

- **Tag name**: `div`, `span`, `*`
- **ID**: `#my-id`
- **Class**: `.my-class`
- **Attribute selectors**: `[attr]`, `[attr=value]`, `[attr~=value]`,
  `[attr|=value]`, `[attr^=value]`, `[attr$=value]`, `[attr*=value]`
- **Pseudo-classes**: `:first-child`, `:last-child`, `:nth-child(n)`,
  `:not(selector)`
- **Combinators**: descendant (space), child (`>`)
- **Comma-separated lists**: `div, span`
- **Compound selectors**: `div.class#id[attr]`

```typescript
document.querySelector('div.container > p:first-child');
document.querySelectorAll('input[type="text"], textarea');
element.matches('.active:not(.disabled)');
element.closest('form');
```

---

## Observers

### MutationObserver

Observes changes to the DOM tree: child additions/removals, attribute changes,
and text content changes.

```typescript
const observer = new MutationObserver((mutations) => {
  for (const record of mutations) {
    console.log(record.type, record.target);
  }
});

observer.observe(element, {
  childList: true,
  attributes: true,
  characterData: true,
  subtree: true,
  attributeOldValue: true,
  characterDataOldValue: true,
  attributeFilter: ['class', 'id'],
});

// Mutations are delivered asynchronously via microtask
element.setAttribute('class', 'new');
await Promise.resolve(); // mutations delivered

observer.takeRecords();  // get pending records synchronously
observer.disconnect();   // stop observing
```

#### MutationRecord Properties

| Property | Type | Description |
|---|---|---|
| `type` | `'attributes' \| 'characterData' \| 'childList'` | Mutation type |
| `target` | `Node` | The mutated node |
| `addedNodes` | `Node[]` | Nodes added (childList) |
| `removedNodes` | `Node[]` | Nodes removed (childList) |
| `previousSibling` | `Node \| null` | Previous sibling of added/removed node |
| `nextSibling` | `Node \| null` | Next sibling of added/removed node |
| `attributeName` | `string \| null` | Changed attribute name |
| `oldValue` | `string \| null` | Previous value (when old-value tracking enabled) |

### IntersectionObserver

Tracks element visibility. Since there is no layout engine, use the
`triggerIntersection` helper to simulate intersections.

```typescript
import { triggerIntersection } from '@asymmetric-effort/nogginlessdom';

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    console.log(entry.target, entry.isIntersecting, entry.intersectionRatio);
  });
}, {
  root: null,
  rootMargin: '0px',
  threshold: [0, 0.5, 1],
});

observer.observe(element);

triggerIntersection(observer, [
  { target: element, isIntersecting: true, intersectionRatio: 0.75 },
]);

observer.takeRecords();
observer.unobserve(element);
observer.disconnect();
```

### ResizeObserver

Tracks element size changes. Use `triggerResize` to simulate.

```typescript
import { triggerResize } from '@asymmetric-effort/nogginlessdom';

const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    console.log(entry.contentRect.width, entry.contentRect.height);
    console.log(entry.borderBoxSize, entry.contentBoxSize);
  }
});

observer.observe(element, { box: 'content-box' });

// Single-target form
triggerResize(observer, element, {
  x: 0, y: 0, width: 200, height: 100,
  top: 0, right: 200, bottom: 100, left: 0,
});

// Array form with partial entries
triggerResize(observer, [
  { target: element, contentRect: { width: 300, height: 150 } },
]);

observer.unobserve(element);
observer.disconnect();
```

---

## Fetch API

The `Window.fetch` method defaults to making real HTTP/HTTPS requests via
`node:http`/`node:https`. For testing, configure a mock handler.

```typescript
const win = createWindow();

// Configure a mock fetch handler
win.configureFetch((url, options) => {
  return new Response(JSON.stringify({ id: 1 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});

const response = await win.fetch('/api/users');
const data = await response.json();
```

### Request

```typescript
const req = new Request('/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{"key":"value"}',
});

req.url;       // '/api'
req.method;    // 'POST'
req.headers;   // Map { 'Content-Type' => 'application/json' }
req.clone();   // new Request with same properties

// Body methods (can only be called once)
await req.json();
await req.text();
await req.blob();
await req.arrayBuffer();
await req.formData();
```

### Response

```typescript
const res = new Response('body text', {
  status: 201,
  statusText: 'Created',
  headers: { 'X-Custom': 'value' },
});

res.status;      // 201
res.ok;          // true (200-299)
res.statusText;  // 'Created'
res.headers;     // Map
res.bodyUsed;    // false
res.clone();     // new Response

// Body methods (can only be called once)
await res.json();
await res.text();
await res.blob();
await res.arrayBuffer();
await res.formData();
```

### Headers

A standard `Headers` class wrapping `Map<string, string>`.

### FormData

A standard `FormData` implementation with `append`, `get`, `getAll`, `has`,
`set`, `delete`, `entries`, `keys`, `values`, and `forEach`.

### Blob

Re-exported from `globalThis.Blob`.

---

## XMLHttpRequest

Simulates the full XMLHttpRequest lifecycle. Configure a handler via
`Window.configureXHR`.

### State Constants

| Constant | Value |
|---|---|
| `XMLHttpRequest.UNSENT` | 0 |
| `XMLHttpRequest.OPENED` | 1 |
| `XMLHttpRequest.HEADERS_RECEIVED` | 2 |
| `XMLHttpRequest.LOADING` | 3 |
| `XMLHttpRequest.DONE` | 4 |

### Usage

```typescript
const win = createWindow();

win.configureXHR(async (request) => {
  return {
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    body: '{"result": true}',
  };
});

const xhr = new win.XMLHttpRequest();
xhr.open('GET', '/api/data');
xhr.responseType = 'json';
xhr.onload = function () {
  console.log(this.response); // { result: true }
};
xhr.send();
```

### Properties

`readyState`, `status`, `statusText`, `responseText`, `response`,
`responseType` (`''`, `'text'`, `'json'`, `'arraybuffer'`), `responseURL`,
`timeout`, `withCredentials`.

### Event Handlers

`onreadystatechange`, `onload`, `onerror`, `onabort`, `ontimeout`,
`onloadstart`, `onloadend`, `onprogress`.

### Methods

`open(method, url)`, `send(body?)`, `abort()`, `setRequestHeader(name, value)`,
`getResponseHeader(name)`, `getAllResponseHeaders()`,
`addEventListener(type, listener)`, `removeEventListener(type, listener)`.

---

## WebSocket

Simulates WebSocket connections for testing. Configure a handler via
`Window.configureWebSocket`.

### State Constants

| Constant | Value |
|---|---|
| `WebSocket.CONNECTING` | 0 |
| `WebSocket.OPEN` | 1 |
| `WebSocket.CLOSING` | 2 |
| `WebSocket.CLOSED` | 3 |

### Usage

```typescript
const win = createWindow();

win.configureWebSocket({
  onOpen: () => console.log('opened'),
  send: (data) => console.log('sent:', data),
  onClose: (code, reason) => console.log('closed', code, reason),
});

const ws = new win.WebSocket('ws://localhost:8080');
ws.onmessage = (event) => console.log(event.data);

// Simulate server events
ws.simulateOpen();
ws.simulateMessage('hello from server');
ws.simulateClose(1000, 'normal');
ws.simulateError(new Error('connection lost'));
```

### Properties

`readyState`, `url`, `protocol`, `bufferedAmount`, `extensions`, `binaryType`.

### Event Handlers

`onopen`, `onmessage`, `onclose`, `onerror`.

### Test Helpers

- `simulateOpen()` -- Sets state to OPEN and fires `open` event
- `simulateMessage(data)` -- Fires `message` event with data
- `simulateClose(code?, reason?)` -- Sets state to CLOSED and fires `close`
  event
- `simulateError(error?)` -- Fires `error` event

### WebSocket Events

- `WSMessageEvent` -- extends `Event` with `data: string`
- `CloseEvent` -- extends `Event` with `code`, `reason`, `wasClean`

---

## IndexedDB

In-memory implementation of the IndexedDB API, available as `window.indexedDB`.

### IDBFactory

```typescript
const win = createWindow();
const request = win.indexedDB.open('mydb', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const store = db.createObjectStore('users', { keyPath: 'id' });
  store.createIndex('name', 'name', { unique: false });
};

request.onsuccess = (event) => {
  const db = event.target.result;
  // use database...
};
```

Methods: `open(name, version?)`, `deleteDatabase(name)`, `databases()`.

### IDBDatabase

Properties: `name`, `version`, `objectStoreNames`.

Methods: `createObjectStore(name, options?)`, `deleteObjectStore(name)`,
`transaction(storeNames, mode?)`, `close()`.

### IDBTransaction

Properties: `db`, `mode` (`'readonly'`, `'readwrite'`, `'versionchange'`),
`error`, `objectStoreNames`.

Methods: `objectStore(name)`, `abort()`.

Events: `oncomplete`, `onabort`, `onerror`.

### IDBObjectStore

Properties: `name`, `keyPath`, `autoIncrement`, `indexNames`.

Methods: `add(value, key?)`, `put(value, key?)`, `get(key)`, `getAll(query?,
count?)`, `delete(key)`, `clear()`, `count(query?)`, `createIndex(name,
keyPath, options?)`, `deleteIndex(name)`, `index(name)`,
`openCursor(query?, direction?)`.

```typescript
const tx = db.transaction('users', 'readwrite');
const store = tx.objectStore('users');
store.add({ id: 1, name: 'Alice', age: 30 });
store.put({ id: 1, name: 'Alice', age: 31 });

const getReq = store.get(1);
getReq.onsuccess = () => console.log(getReq.result);
```

### IDBIndex

Properties: `name`, `keyPath`, `unique`, `multiEntry`.

Methods: `get(key)`, `getAll(query?, count?)`, `count(query?)`,
`openCursor(query?, direction?)`.

### IDBCursor

Properties: `source`, `direction`, `key`, `primaryKey`, `value`.

Methods: `continue()`, `advance(count)`, `delete()`, `update(value)`.

Directions: `'next'`, `'nextunique'`, `'prev'`, `'prevunique'`.

### IDBKeyRange

Static factory methods for defining key ranges:

```typescript
IDBKeyRange.only(42);
IDBKeyRange.lowerBound(10);
IDBKeyRange.lowerBound(10, true);     // open (exclusive)
IDBKeyRange.upperBound(100);
IDBKeyRange.bound(10, 100, false, true);

range.includes(50); // true
```

### IDBRequest and IDBOpenDBRequest

Properties: `result`, `error`, `source`, `transaction`, `readyState`.

Events: `onsuccess`, `onerror`. `IDBOpenDBRequest` adds `onupgradeneeded`
and `onblocked`.

---

## Canvas

### CanvasRenderingContext2D

A stub that records all draw calls for test inspection.

```typescript
const canvas = document.createElement('canvas');
canvas.width = 400;
canvas.height = 300;
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#ff0000';
ctx.fillRect(10, 10, 100, 50);
ctx.beginPath();
ctx.arc(200, 150, 50, 0, Math.PI * 2);
ctx.fill();

// Inspect recorded draw calls
const calls = ctx.__getDrawCalls();
// [
//   { method: 'fillRect', args: [10, 10, 100, 50] },
//   { method: 'beginPath', args: [] },
//   { method: 'arc', args: [200, 150, 50, 0, 6.28..., undefined] },
//   { method: 'fill', args: [] },
// ]

ctx.__clearDrawCalls(); // reset for next assertions
```

#### State Properties

`fillStyle`, `strokeStyle`, `lineWidth`, `lineCap`, `lineJoin`, `font`,
`textAlign`, `textBaseline`, `globalAlpha`, `globalCompositeOperation`.

#### Path Methods

`beginPath()`, `closePath()`, `moveTo(x, y)`, `lineTo(x, y)`,
`arc(x, y, r, start, end, ccw?)`,
`arcTo(x1, y1, x2, y2, r)`,
`bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)`,
`quadraticCurveTo(cpx, cpy, x, y)`, `rect(x, y, w, h)`,
`ellipse(x, y, rx, ry, rotation, start, end, ccw?)`.

#### Drawing Methods

`fill()`, `stroke()`, `fillRect(x, y, w, h)`, `strokeRect(x, y, w, h)`,
`clearRect(x, y, w, h)`, `fillText(text, x, y, maxWidth?)`,
`strokeText(text, x, y, maxWidth?)`, `drawImage(...)`, `clip()`.

#### Measurement

`measureText(text)` -- Returns `{ width: text.length * 10 }`.

#### Image Data

`createImageData(w, h)`, `getImageData(sx, sy, sw, sh)`,
`putImageData(data, dx, dy)`.

### CanvasGradient

```typescript
const grad = ctx.createLinearGradient(0, 0, 100, 0);
grad.addColorStop(0, 'red');
grad.addColorStop(1, 'blue');
ctx.fillStyle = grad;

grad.__getStops(); // [{ offset: 0, color: 'red' }, { offset: 1, color: 'blue' }]
```

Also: `createRadialGradient(x0, y0, r0, x1, y1, r1)`.

### CanvasPattern

`createPattern(image, repetition)` -- Returns a `CanvasPattern` stub.

### ImageData

```typescript
const imageData = new ImageData(100, 100);
imageData.width;   // 100
imageData.height;  // 100
imageData.data;    // Uint8ClampedArray of length 40000
```

#### Transform Methods

`translate(x, y)`, `rotate(angle)`, `scale(x, y)`,
`transform(a, b, c, d, e, f)`, `setTransform(a, b, c, d, e, f)`,
`resetTransform()`.

#### State Stack

`save()` and `restore()` push/pop the full drawing state (fill, stroke, line,
font, alpha, composite operation).

---

## Web Animations

### element.animate()

```typescript
const animation = element.animate(
  [
    { opacity: '0', transform: 'translateY(-10px)' },
    { opacity: '1', transform: 'translateY(0)' },
  ],
  { duration: 300, easing: 'ease-in', fill: 'forwards' },
);

animation.playState;    // 'running'
animation.currentTime;  // 0
animation.pause();
animation.playState;    // 'paused'
animation.finish();     // jumps to end, fires onfinish
animation.cancel();     // resets, fires oncancel
animation.reverse();    // reverses playbackRate
```

### Animation

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Animation ID |
| `playState` | `string` | `'idle'`, `'running'`, `'paused'`, `'finished'` |
| `currentTime` | `number \| null` | Current playback time |
| `startTime` | `number \| null` | Start time |
| `playbackRate` | `number` | Playback speed multiplier |
| `effect` | `KeyframeEffect \| null` | The animation effect |
| `timeline` | `AnimationTimeline \| null` | The timeline |
| `onfinish` | callback | Fired when animation finishes |
| `oncancel` | callback | Fired when animation is cancelled |
| `finished` | `Promise<Animation>` | Resolves when finished |
| `ready` | `Promise<Animation>` | Resolves when ready to play |

Methods: `play()`, `pause()`, `cancel()`, `finish()`, `reverse()`.

### KeyframeEffect

```typescript
const effect = new KeyframeEffect(element, keyframes, {
  duration: 500,
  delay: 100,
  easing: 'ease-out',
  iterations: 3,
  direction: 'alternate',
  fill: 'both',
});

effect.getKeyframes();
effect.setKeyframes(newKeyframes);
effect.getTiming();
effect.updateTiming({ duration: 1000 });
```

---

## Workers

### Worker

```typescript
const worker = new Worker('/worker.js', { type: 'module', name: 'my-worker' });

worker.onmessage = (event) => console.log(event.data);
worker.onerror = (event) => console.error(event.message);
worker.postMessage({ cmd: 'start' });
worker.terminate();

// Test helpers
worker.simulateMessage({ result: 42 });
worker.simulateError(new Error('worker failed'));
```

### SharedWorker

```typescript
const shared = new SharedWorker('/shared.js', { name: 'cache' });
shared.port.start();
shared.port.onmessage = (event) => console.log(event.data);
shared.port.postMessage('ping');

// Test helper
shared.port.simulateMessage('pong');
shared.port.close();
```

### MessagePort

Properties: `onmessage`, `onmessageerror`.

Methods: `postMessage(data)`, `start()`, `close()`, `addEventListener(...)`,
`removeEventListener(...)`.

Test helper: `simulateMessage(data)`.

### ServiceWorker and ServiceWorkerContainer

```typescript
const registration = await navigator.serviceWorker.register('/sw.js', {
  scope: '/',
});

registration.active;   // ServiceWorker instance
registration.scope;    // '/'
await registration.unregister();
await registration.update();

await navigator.serviceWorker.getRegistration('/');
await navigator.serviceWorker.getRegistrations();
await navigator.serviceWorker.ready; // resolves with first registration
```

---

## Window

`createWindow(options?)` is the primary entry point for creating a full DOM
environment.

```typescript
import { createWindow } from '@asymmetric-effort/nogginlessdom';

const win = createWindow({
  innerWidth: 1024,
  innerHeight: 768,
  screenWidth: 1920,
  screenHeight: 1080,
  devicePixelRatio: 2,
  colorScheme: 'dark',
  reducedMotion: false,
});
```

### Window Properties

| Property | Type | Description |
|---|---|---|
| `document` | `Document` | The document (with html/head/body structure) |
| `location` | `Location` | Location stub |
| `history` | `History` | History with push/pop/replace state |
| `navigator` | `Navigator` | Navigator stub |
| `localStorage` | `Storage` | In-memory storage (5 MB quota) |
| `sessionStorage` | `Storage` | In-memory storage (5 MB quota) |
| `innerWidth` / `innerHeight` | `number` | Viewport dimensions |
| `performance` | `Performance` | Performance API |
| `screen` | `object` | Screen stub with `width`, `height`, etc. |
| `devicePixelRatio` | `number` | DPR |
| `scrollX` / `scrollY` | `number` | Scroll position |
| `pageXOffset` / `pageYOffset` | `number` | Scroll position aliases |
| `indexedDB` | `IDBFactory` | IndexedDB factory |
| `CSS` | `object` | `CSS.supports(prop, val)` |
| `console` | `Console` | Re-exported globalThis.console |

### Web API Properties on Window

`FormData`, `Headers`, `Request`, `Response`, `TextEncoder`, `TextDecoder`,
`Blob`, `atob`, `btoa`, `structuredClone`, `DOMParser`, `XMLSerializer`,
`queueMicrotask`, `AbortController`, `AbortSignal`, `crypto`, `Worker`,
`SharedWorker`.

### Storage

In-memory implementation with quota enforcement and `StorageEvent` dispatch.

```typescript
win.localStorage.setItem('key', 'value');
win.localStorage.getItem('key');   // 'value'
win.localStorage.removeItem('key');
win.localStorage.clear();
win.localStorage.length;           // 0
win.localStorage.key(0);           // null

// StorageEvent fires on the Window when values change
win.addEventListener('storage', (e) => {
  console.log(e.key, e.oldValue, e.newValue);
});
```

Quota: 5 MB (UTF-16). Throws a `QuotaExceededError` when exceeded.

### Navigator

Properties: `userAgent`, `language`, `languages`, `onLine`, `cookieEnabled`,
`platform`, `vendor`, `hardwareConcurrency`, `maxTouchPoints`, `clipboard`,
`permissions`, `serviceWorker`.

Methods: `sendBeacon(url, data?)`, `vibrate(pattern)`.

### Clipboard

```typescript
await win.navigator.clipboard.writeText('hello');
await win.navigator.clipboard.readText(); // 'hello'
```

### Permissions

```typescript
const result = await win.navigator.permissions.query({ name: 'clipboard-read' });
result.state; // 'granted' (always)
```

### History

```typescript
win.history.pushState({ page: 1 }, '', '/page/1');
win.history.replaceState({ page: 2 }, '', '/page/2');
win.history.back();     // fires popstate
win.history.forward();  // fires popstate
win.history.go(-2);     // fires popstate
win.history.length;
win.history.state;
```

### Location

Properties: `href`, `hash`, `pathname`, `search`, `origin`, `protocol`, `host`,
`hostname`, `port`.

Methods: `assign(url)`, `replace(url)`, `reload()`.

### matchMedia

```typescript
const mql = win.matchMedia('(min-width: 768px)');
mql.matches;   // true if innerWidth >= 768
mql.media;     // '(min-width: 768px)'

mql.addEventListener('change', (e) => {
  console.log(e.matches, e.media);
});

// Changing dimensions fires change events on affected MediaQueryLists
win.setDimensions(500, 400);
```

Supported media features: `min-width`, `max-width`, `min-height`,
`max-height`, `prefers-color-scheme`, `prefers-reduced-motion`, media types
(`all`, `screen`, `print`).

### Performance API

```typescript
win.performance.now();                         // ms since creation
win.performance.timeOrigin;                    // creation timestamp
win.performance.mark('start');
win.performance.mark('end');
win.performance.measure('duration', 'start', 'end');
win.performance.getEntries();
win.performance.getEntriesByName('start');
win.performance.getEntriesByType('mark');
win.performance.clearMarks('start');
win.performance.clearMeasures();
```

#### PerformanceObserver

```typescript
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  console.log(entries);
});
observer.observe({ entryTypes: ['mark', 'measure'] });
observer.disconnect();
observer.takeRecords();
```

### requestAnimationFrame

```typescript
const id = win.requestAnimationFrame((timestamp) => {
  console.log('frame at', timestamp);
});
win.cancelAnimationFrame(id);

// Test helper: synchronously flush all queued callbacks
win.flushAnimationFrames();
```

### requestIdleCallback

```typescript
const id = win.requestIdleCallback((deadline) => {
  console.log(deadline.timeRemaining(), deadline.didTimeout);
});
win.cancelIdleCallback(id);

// Test helper: synchronously flush all queued callbacks
win.flushIdleCallbacks();
```

### postMessage

```typescript
win.addEventListener('message', (event) => {
  console.log(event.data, event.origin);
});
win.postMessage({ type: 'init' }, '*');
// Delivered asynchronously via queueMicrotask
```

### Page Visibility

```typescript
win.document.visibilityState; // 'visible'
win.document.hidden;          // false

win.document.setVisibility('hidden');
// Fires 'visibilitychange' event on document
```

### Timer Methods

`setTimeout`, `setInterval`, `clearTimeout`, `clearInterval` delegate to
`globalThis`. Use fake timers from the mocking module to control them.

### Configuration Methods

```typescript
win.configureFetch(handler);
win.configureXHR(handler);
win.configureWebSocket(handler);
win.configureStylesheetLoader(loader);
```

---

## ARIA and Accessibility

### Property Accessors

All standard ARIA property accessors are implemented as getters/setters that
map to the corresponding `aria-*` attributes:

```typescript
element.ariaLabel = 'Close dialog';
element.getAttribute('aria-label');  // 'Close dialog'

element.ariaHidden = 'true';
element.ariaDisabled = 'true';
element.ariaExpanded = 'false';
element.ariaSelected = 'true';
element.ariaChecked = 'mixed';
element.ariaRequired = 'true';
element.ariaPressed = 'true';
element.ariaLive = 'polite';
element.ariaDescribedBy = 'desc-id';
element.ariaLabelledBy = 'label-id';
element.ariaControls = 'panel-id';
element.ariaValueNow = '50';
element.ariaValueMin = '0';
element.ariaValueMax = '100';
element.ariaValueText = 'fifty percent';
```

### Role

```typescript
element.role = 'button';
element.getAttribute('role'); // 'button'
```

### Implicit Roles

`getImplicitRole(element)` returns the implicit ARIA role based on the tag name
and attributes. An explicit `role` attribute always takes precedence.

```typescript
import { getImplicitRole } from '@asymmetric-effort/nogginlessdom';

getImplicitRole(button);      // 'button'
getImplicitRole(nav);         // 'navigation'
getImplicitRole(header);      // 'banner'
getImplicitRole(footer);      // 'contentinfo'
getImplicitRole(main);        // 'main'

// Context-dependent:
getImplicitRole(anchor);                       // null (no href)
anchor.setAttribute('href', '/');
getImplicitRole(anchor);                       // 'link'

input.setAttribute('type', 'checkbox');
getImplicitRole(input);                        // 'checkbox'
```

---

## Pointer Capture

```typescript
element.setPointerCapture(1);
element.hasPointerCapture(1);    // true
element.releasePointerCapture(1);
element.hasPointerCapture(1);    // false
```

---

## Drag and Drop

### DataTransfer

```typescript
const dt = new DataTransfer();
dt.setData('text/plain', 'Hello');
dt.setData('text/html', '<b>Hello</b>');
dt.getData('text/plain');   // 'Hello'
dt.types;                   // ['text/plain', 'text/html']
dt.clearData('text/html');
dt.clearData();             // clears all

dt.dropEffect = 'copy';
dt.effectAllowed = 'copyMove';
dt.setDragImage(element, 0, 0);  // no-op
```

### DataTransferItem

```typescript
dt.items.length;    // number of items
dt.items.add('data', 'text/plain');
const item = dt.items.get(0);
item.kind;          // 'string'
item.type;          // 'text/plain'
item.getAsString((data) => console.log(data));
item.getAsFile();   // null (files not supported)
dt.items.remove(0);
dt.items.clear();
```

### DragEvent

```typescript
const dragEvent = new DragEvent('drop', {
  bubbles: true,
  cancelable: true,
  dataTransfer: dt,
});
element.dispatchEvent(dragEvent);
```

---

## HTML Parser

### parseHTML

Parses HTML strings into DOM nodes. Used internally by `innerHTML` setter.

```typescript
import { parseHTML } from '@asymmetric-effort/nogginlessdom';

const nodes = parseHTML('<div class="box"><p>Hello</p></div>');
```

Supported features:

- Standard HTML elements and attributes (quoted and unquoted values)
- Void elements (br, img, input, etc.)
- Self-closing tags
- Raw text elements (script, style, textarea) -- content is not parsed as HTML
- HTML entities: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`,
  `&copy;`, `&reg;`, `&trade;`, `&mdash;`, `&ndash;`, `&laquo;`, `&raquo;`,
  `&bull;`, `&hellip;`, `&euro;`, `&pound;`, `&yen;`, `&cent;`
- Numeric entities: `&#123;`, `&#x1F4A9;`
- DOCTYPE declarations (skipped)
- HTML comments (skipped)
- Maximum nesting depth of 5000 to prevent stack overflow

---

## Shadow DOM and Custom Elements

### Shadow DOM

```typescript
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'open' });

shadow.innerHTML = '<slot></slot>';
shadow.getElementById('id');
shadow.querySelector('.cls');
shadow.querySelectorAll('*');

host.shadowRoot;  // shadow (open mode)
// Closed mode: host.shadowRoot returns null
```

`ShadowRoot` extends `Node` and supports `innerHTML`, `getElementById`,
`querySelector`, and `querySelectorAll`.

Events with `composed: true` cross shadow boundaries during dispatch.
Non-composed events stop at the shadow root.

### Custom Elements

```typescript
class MyButton extends Element {
  static observedAttributes = ['variant'];

  connectedCallback() { /* called on appendChild */ }
  disconnectedCallback() { /* called on removeChild */ }
  attributeChangedCallback(name, oldVal, newVal) { /* called on setAttribute */ }

  constructor() {
    super('my-button');
  }
}

document.customElements.define('my-button', MyButton);
document.customElements.get('my-button');        // MyButton
document.customElements.getName(MyButton);       // 'my-button'
await document.customElements.whenDefined('my-button'); // resolves immediately

const btn = document.createElement('my-button'); // uses registered constructor
```

### Slots

```typescript
const slot = document.createElement('slot');
slot.name = 'header';
slot.assignedNodes();    // nodes distributed to this slot
slot.assignedElements(); // elements only
```

---

## Collections and Utilities

### NodeList

Returned by `querySelectorAll`. Supports `length`, `[index]`, and `forEach`.

### HTMLCollection

Returned by `getElementsByTagName`, `getElementsByClassName`, and `children`.
Live collection: re-evaluates on each access.

### DOMTokenList

Returned by `element.classList`. Methods: `add(token)`, `remove(token)`,
`toggle(token, force?)`, `contains(token)`, `replace(old, new)`, `item(index)`,
`toString()`.

```typescript
element.classList.add('active', 'visible');
element.classList.remove('hidden');
element.classList.toggle('selected');
element.classList.contains('active');  // true
```

### TreeWalker and NodeIterator

```typescript
const walker = document.createTreeWalker(
  root,
  NodeFilter.SHOW_ELEMENT,
  (node) => NodeFilter.FILTER_ACCEPT,
);

while (walker.nextNode()) {
  console.log(walker.currentNode);
}

walker.previousNode();
walker.firstChild();
walker.lastChild();
walker.nextSibling();
walker.previousSibling();
walker.parentNode();
```

### NodeFilter Constants

| Constant | Value |
|---|---|
| `NodeFilter.SHOW_ALL` | `0xFFFFFFFF` |
| `NodeFilter.SHOW_ELEMENT` | `0x1` |
| `NodeFilter.SHOW_TEXT` | `0x4` |
| `NodeFilter.SHOW_COMMENT` | `0x80` |
| `NodeFilter.FILTER_ACCEPT` | `1` |
| `NodeFilter.FILTER_REJECT` | `2` |
| `NodeFilter.FILTER_SKIP` | `3` |
