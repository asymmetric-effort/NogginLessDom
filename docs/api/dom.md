# DOM API Reference

The DOM module provides a complete DOM environment for testing, built entirely
from scratch with zero third-party dependencies. It implements the core DOM
interfaces needed for testing web application UI logic: document creation,
element manipulation, tree traversal, CSS selector queries, and event handling.

```typescript
import {
  Document,
  Element,
  Node,
  TextNode,
  Event,
} from '@asymmetric-effort/nogginlessdom';
```

## Document

`Document` is the root of a DOM tree. It serves as the factory for creating
elements and text nodes, and provides tree-wide query methods.

### Constructor

```typescript
const doc = new Document();
```

Creates a new, empty document.

### Methods

#### `createElement(tagName: string): Element`

Create a new element with the given tag name. The tag name is stored in
uppercase, matching browser behavior.

```typescript
const div = doc.createElement('div');
const span = doc.createElement('span');
const input = doc.createElement('input');

console.log(div.tagName); // 'DIV'
```

#### `createTextNode(text: string): TextNode`

Create a new text node with the given content.

```typescript
const textNode = doc.createTextNode('Hello, world!');
div.appendChild(textNode);
```

#### `getElementById(id: string): Element | null`

Find an element by its `id` attribute. Searches the entire document tree.
Returns the first matching element or `null`.

```typescript
const header = doc.createElement('h1');
header.id = 'main-title';
doc.appendChild(header);

const found = doc.getElementById('main-title');
expect(found?.tagName).toBe('H1');
```

#### `querySelector(selector: string): Element | null`

Find the first element matching the given CSS selector. Supports tag selectors,
class selectors (`.class`), ID selectors (`#id`), attribute selectors
(`[attr=value]`), and descendant combinators.

```typescript
const el = doc.querySelector('.container > .item');
const btn = doc.querySelector('button[type="submit"]');
const first = doc.querySelector('ul li:first-child');
```

#### `querySelectorAll(selector: string): Element[]`

Find all elements matching the given CSS selector. Returns an array of matching
elements in document order.

```typescript
const items = doc.querySelectorAll('.item');
expect(items).toHaveLength(3);
```

#### `appendChild(child: Node): Node`

Append a child node to the document. Returns the appended child.

```typescript
const body = doc.createElement('body');
doc.appendChild(body);
```

## Element

`Element` represents an HTML element in the DOM tree. It extends `Node` with
attribute handling, event management, class list manipulation, and element-level
query methods.

### Properties

#### `tagName: string`

The element's tag name in uppercase (e.g., `'DIV'`, `'SPAN'`, `'P'`).

#### `id: string`

Get or set the element's `id` attribute.

```typescript
const div = doc.createElement('div');
div.id = 'app';
expect(div.id).toBe('app');
```

#### `className: string`

Get or set the element's `class` attribute as a space-separated string.

```typescript
div.className = 'container fluid';
expect(div.className).toBe('container fluid');
```

#### `classList: ClassList`

A `ClassList` object providing `add()`, `remove()`, `toggle()`, `contains()`,
and `replace()` methods for manipulating CSS classes.

```typescript
div.classList.add('active');
div.classList.remove('hidden');
expect(div.classList.contains('active')).toBe(true);
div.classList.toggle('selected');
div.classList.replace('active', 'inactive');
```

#### `innerHTML: string`

Get or set the HTML content of the element. When set, the existing children
are replaced with the parsed content. When read, returns the serialized HTML
of all child nodes.

```typescript
div.innerHTML = '<p>Hello</p><p>World</p>';
expect(div.childNodes).toHaveLength(2);
expect(div.innerHTML).toBe('<p>Hello</p><p>World</p>');
```

#### `outerHTML: string`

Get the serialized HTML of the element including the element itself.

```typescript
const p = doc.createElement('p');
p.textContent = 'Hello';
expect(p.outerHTML).toBe('<p>Hello</p>');
```

### Attribute Methods

#### `getAttribute(name: string): string | null`

Get the value of the named attribute, or `null` if not set.

```typescript
input.setAttribute('type', 'text');
expect(input.getAttribute('type')).toBe('text');
expect(input.getAttribute('missing')).toBeNull();
```

#### `setAttribute(name: string, value: string): void`

Set the value of the named attribute.

```typescript
link.setAttribute('href', 'https://example.com');
link.setAttribute('target', '_blank');
```

#### `removeAttribute(name: string): void`

Remove the named attribute.

```typescript
div.removeAttribute('class');
expect(div.hasAttribute('class')).toBe(false);
```

#### `hasAttribute(name: string): boolean`

Check whether the named attribute exists.

```typescript
expect(input.hasAttribute('disabled')).toBe(false);
input.setAttribute('disabled', '');
expect(input.hasAttribute('disabled')).toBe(true);
```

### Event Methods

#### `addEventListener(type: string, listener: EventListener): void`

Register an event listener for the given event type.

```typescript
button.addEventListener('click', (event) => {
  console.log('Button clicked!', event.type);
});
```

#### `removeEventListener(type: string, listener: EventListener): void`

Remove a previously registered event listener. The listener must be the same
function reference that was passed to `addEventListener`.

```typescript
const handler = () => { /* ... */ };
button.addEventListener('click', handler);
button.removeEventListener('click', handler);
```

#### `dispatchEvent(event: Event): boolean`

Dispatch an event to this element, triggering all registered listeners for that
event type. Returns `true` if the event was not cancelled via
`preventDefault()`.

```typescript
const event = new Event('click', { bubbles: true });
const wasCancelled = !button.dispatchEvent(event);
```

### Query Methods

#### `querySelector(selector: string): Element | null`

Find the first descendant element matching the CSS selector.

```typescript
const container = doc.querySelector('#app');
const firstButton = container?.querySelector('button');
```

#### `querySelectorAll(selector: string): Element[]`

Find all descendant elements matching the CSS selector.

```typescript
const listItems = ul.querySelectorAll('li.active');
```

#### `getElementsByTagName(tagName: string): Element[]`

Find all descendant elements with the given tag name (case-insensitive).

```typescript
const paragraphs = div.getElementsByTagName('p');
```

#### `getElementsByClassName(className: string): Element[]`

Find all descendant elements that have the given CSS class.

```typescript
const highlighted = div.getElementsByClassName('highlight');
```

## Node

`Node` is the base class for all DOM nodes (`Element`, `TextNode`, `Document`).
It provides tree structure operations and basic node information.

### Properties

#### `nodeType: number`

Numeric type identifier. `1` for elements, `3` for text nodes, `9` for
documents.

#### `nodeName: string`

The node name. For elements, this is the uppercase tag name. For text nodes,
it is `'#text'`. For documents, it is `'#document'`.

#### `parentNode: Node | null`

Reference to the parent node, or `null` for the root.

#### `childNodes: Node[]`

Array of child nodes.

#### `textContent: string`

Get or set the text content. When read on an element, returns the concatenated
text content of all descendant text nodes. When set on an element, replaces all
children with a single text node.

```typescript
div.innerHTML = '<p>Hello</p><p>World</p>';
expect(div.textContent).toBe('HelloWorld');

div.textContent = 'New content';
expect(div.childNodes).toHaveLength(1);
```

### Methods

#### `appendChild(child: Node): Node`

Append a child node. If the child already has a parent, it is removed from its
current parent first. Returns the appended child.

```typescript
const li = doc.createElement('li');
li.textContent = 'Item';
ul.appendChild(li);
```

#### `removeChild(child: Node): Node`

Remove a child node. Throws if the node is not a child of this node. Returns
the removed child.

```typescript
ul.removeChild(li);
expect(li.parentNode).toBeNull();
```

#### `cloneNode(deep?: boolean): Node`

Create a copy of this node. If `deep` is `true`, all descendants are cloned
recursively. If `false` or omitted, only the node itself is cloned (without
children).

```typescript
const shallow = div.cloneNode();       // no children
const deep = div.cloneNode(true);      // with all descendants
```

## TextNode

`TextNode` represents a text node in the DOM tree. It extends `Node`.

### Properties

- `nodeType` -- Always `3`.
- `nodeName` -- Always `'#text'`.
- `textContent` -- The text content of the node.

```typescript
const text = doc.createTextNode('Hello');
expect(text.nodeType).toBe(3);
expect(text.textContent).toBe('Hello');
```

## Event

`Event` represents a DOM event that can be dispatched to elements.

### Constructor

```typescript
new Event(type: string, options?: EventInit);
```

**EventInit:**

| Option       | Type      | Default | Description                        |
| ------------ | --------- | ------- | ---------------------------------- |
| `bubbles`    | `boolean` | `false` | Whether the event bubbles up       |
| `cancelable` | `boolean` | `false` | Whether the event can be cancelled |

### Properties

#### `type: string`

The event type string (e.g., `'click'`, `'input'`, `'submit'`).

#### `bubbles: boolean`

Whether this event bubbles up through the DOM tree.

#### `cancelable: boolean`

Whether this event can be cancelled via `preventDefault()`.

### Methods

#### `preventDefault(): void`

Cancel the event's default action (if the event is cancelable).

```typescript
const event = new Event('submit', { cancelable: true });
form.addEventListener('submit', (e) => {
  e.preventDefault();
});
form.dispatchEvent(event);
```

#### `stopPropagation(): void`

Stop the event from propagating further up or down the DOM tree.

```typescript
inner.addEventListener('click', (e) => {
  e.stopPropagation(); // outer's click handler will not fire
});
```

## Complete Example

```typescript
import {
  describe,
  it,
  expect,
  Document,
  Event,
} from '@asymmetric-effort/nogginlessdom';

describe('Todo List', () => {
  it('should add and remove items', () => {
    const doc = new Document();
    const ul = doc.createElement('ul');
    ul.id = 'todo-list';
    doc.appendChild(ul);

    // Add items
    for (const text of ['Buy groceries', 'Walk the dog', 'Write tests']) {
      const li = doc.createElement('li');
      li.className = 'todo-item';
      li.textContent = text;
      ul.appendChild(li);
    }

    expect(doc.querySelectorAll('.todo-item')).toHaveLength(3);
    expect(doc.querySelector('li')?.textContent).toBe('Buy groceries');

    // Remove the first item
    const firstItem = ul.childNodes[0];
    ul.removeChild(firstItem);
    expect(doc.querySelectorAll('.todo-item')).toHaveLength(2);
  });

  it('should handle click events on items', () => {
    const doc = new Document();
    const button = doc.createElement('button');
    button.id = 'add-btn';
    button.textContent = 'Add';
    doc.appendChild(button);

    const clicks: string[] = [];
    button.addEventListener('click', () => {
      clicks.push('clicked');
    });

    button.dispatchEvent(new Event('click'));
    button.dispatchEvent(new Event('click'));

    expect(clicks).toHaveLength(2);
  });
});
```
