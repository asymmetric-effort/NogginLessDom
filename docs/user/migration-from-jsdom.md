# Migration from jsdom

This guide walks you through replacing jsdom with NogginLessDom's built-in DOM
simulation. NogginLessDom provides a zero-dependency DOM implementation that
covers the most commonly used DOM APIs for testing.

## Overview

jsdom is a comprehensive DOM implementation that aims to replicate a full
browser environment. NogginLessDom's DOM module takes a different approach: it
implements the subset of DOM APIs that are most commonly used in tests, with
zero third-party dependencies. The trade-off is completeness versus supply chain
security.

## Step-by-Step Migration

### Step 1: Install NogginLessDom

```bash
bun add -d @asymmetric-effort/nogginlessdom
```

### Step 2: Replace jsdom Document Creation

**Before (jsdom):**

```typescript
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const document = dom.window.document;
```

**After (NogginLessDom):**

```typescript
import { Document } from '@asymmetric-effort/nogginlessdom';

const document = new Document();
```

NogginLessDom creates an empty document. There is no `window` object -- you
work directly with the `Document` instance.

### Step 3: Replace Element Creation

**Before (jsdom):**

```typescript
const div = document.createElement('div');
div.id = 'container';
div.className = 'main-content';
document.body.appendChild(div);
```

**After (NogginLessDom):**

```typescript
const div = document.createElement('div');
div.id = 'container';
div.className = 'main-content';
document.appendChild(div);
```

The `createElement` API is identical. The main difference is that NogginLessDom
does not have a pre-existing `document.body` -- you append directly to the
document or create your own body element.

### Step 4: Replace Text Nodes

**Before (jsdom):**

```typescript
const text = document.createTextNode('Hello, world!');
element.appendChild(text);
```

**After (NogginLessDom):**

```typescript
const text = document.createTextNode('Hello, world!');
element.appendChild(text);
```

Text node creation is identical in both APIs.

### Step 5: Replace Element Queries

All standard query methods are supported:

```typescript
// By ID
const el = document.getElementById('app');

// By CSS selector (single)
const button = document.querySelector('button.primary');

// By CSS selector (all)
const items = document.querySelectorAll('.list-item');

// By tag name
const paragraphs = container.getElementsByTagName('p');

// By class name
const highlights = container.getElementsByClassName('highlight');
```

These APIs work the same way in both jsdom and NogginLessDom.

### Step 6: Replace Attribute Operations

```typescript
// Setting attributes
element.setAttribute('data-id', '42');
element.setAttribute('aria-label', 'Close');

// Getting attributes
const id = element.getAttribute('data-id'); // '42'

// Checking existence
if (element.hasAttribute('disabled')) {
  // ...
}

// Removing attributes
element.removeAttribute('data-id');
```

Attribute operations are identical in both APIs.

### Step 7: Replace Event Handling

**Before (jsdom):**

```typescript
const handler = (event: Event) => {
  console.log('Clicked:', event.type);
};

element.addEventListener('click', handler);
element.dispatchEvent(new dom.window.Event('click'));
element.removeEventListener('click', handler);
```

**After (NogginLessDom):**

```typescript
import { Event } from '@asymmetric-effort/nogginlessdom';

const handler = (event: Event) => {
  console.log('Clicked:', event.type);
};

element.addEventListener('click', handler);
element.dispatchEvent(new Event('click'));
element.removeEventListener('click', handler);
```

The key difference is that `Event` is imported from NogginLessDom instead of
accessed through `dom.window`. The `Event` constructor accepts the same
`type` and `options` parameters (`bubbles`, `cancelable`).

### Step 8: Replace classList Operations

```typescript
element.classList.add('active');
element.classList.remove('hidden');
element.classList.toggle('selected');
element.classList.contains('active'); // true
element.classList.replace('active', 'inactive');
```

These operations are identical in both APIs.

### Step 9: Replace innerHTML/outerHTML

```typescript
// Setting HTML content
container.innerHTML = '<p>Hello</p><p>World</p>';

// Reading HTML content
const html = container.innerHTML;    // '<p>Hello</p><p>World</p>'
const outer = container.outerHTML;   // '<div><p>Hello</p><p>World</p></div>'
```

Both reading and writing `innerHTML` and reading `outerHTML` work the same way.

### Step 10: Remove jsdom

Once all tests pass:

```bash
bun remove jsdom @types/jsdom
```

If you were using jsdom as a vitest environment, also update your test
configuration. See the [vitest migration guide](migration-from-vitest.md).

## API Differences

### No `window` Object

jsdom provides a full `window` object with `window.document`,
`window.location`, `window.history`, etc. NogginLessDom does not provide a
`window` object. You work directly with `Document`, `Element`, and `Event`
instances.

**Workaround:** If your code depends on `window`, create a minimal mock:

```typescript
const doc = new Document();
const window = {
  document: doc,
  location: { href: 'http://localhost/' },
  // Add other properties as needed
};
```

### No HTML Parsing from String

jsdom accepts an HTML string in its constructor (`new JSDOM('<html>...</html>')`).
NogginLessDom's `Document` constructor does not accept HTML. Build the DOM
tree programmatically or use `innerHTML` on a root element.

**Workaround:**

```typescript
const doc = new Document();
const root = doc.createElement('div');
root.innerHTML = '<header><nav><a href="/">Home</a></nav></header><main></main>';
doc.appendChild(root);
```

### No Cookie Support

jsdom provides `document.cookie` for managing cookies. NogginLessDom does not
implement cookie handling.

**Workaround:** Mock cookie behavior at the application level rather than the
DOM level.

### No `fetch`, `XMLHttpRequest`, or Network APIs

jsdom provides limited network API support. NogginLessDom does not implement
any network APIs.

**Workaround:** Use `fn()` to mock network functions:

```typescript
const mockFetch = fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({ data: 'test' }),
}));
```

### No `window.getComputedStyle()`

jsdom provides limited CSS computed style support. NogginLessDom does not
implement computed styles.

**Workaround:** Test styles via attribute assertions:

```typescript
element.setAttribute('style', 'color: red; font-size: 16px');
expect(element.getAttribute('style')).toContain('color: red');
```

### No Form Submission or Navigation

jsdom provides limited form submission and navigation simulation. NogginLessDom
does not implement these features.

**Workaround:** Test form behavior through event listeners and manual state
management, which is what most modern applications do anyway.

## Comparison Table

| Feature                     | jsdom              | NogginLessDom     |
| --------------------------- | ------------------ | ----------------- |
| `createElement`             | Supported          | Supported         |
| `createTextNode`            | Supported          | Supported         |
| `getElementById`            | Supported          | Supported         |
| `querySelector`             | Supported          | Supported         |
| `querySelectorAll`          | Supported          | Supported         |
| `getElementsByTagName`      | Supported          | Supported         |
| `getElementsByClassName`    | Supported          | Supported         |
| `getAttribute/setAttribute` | Supported          | Supported         |
| `addEventListener`          | Supported          | Supported         |
| `dispatchEvent`             | Supported          | Supported         |
| `innerHTML`                 | Supported          | Supported         |
| `outerHTML`                 | Supported          | Supported         |
| `textContent`               | Supported          | Supported         |
| `classList`                  | Supported          | Supported         |
| `appendChild/removeChild`   | Supported          | Supported         |
| `cloneNode`                 | Supported          | Supported         |
| `window` object             | Supported          | Not available     |
| HTML parsing (constructor)  | Supported          | Not available     |
| `document.cookie`           | Supported          | Not available     |
| `fetch` / `XMLHttpRequest`  | Partial            | Not available     |
| `getComputedStyle`          | Partial            | Not available     |
| Form submission             | Partial            | Not available     |
| Navigation / `location`     | Partial            | Not available     |
| Custom elements             | Partial            | Not available     |
| Shadow DOM                  | Partial            | Not available     |
| Runtime dependencies        | 20+ packages       | Zero              |

## When to Stay on jsdom

NogginLessDom's DOM simulation covers the most common testing scenarios, but if
your tests rely heavily on features like full HTML parsing from strings, cookie
management, computed styles, or the `window` object, you may want to keep jsdom
for those specific test files while using NogginLessDom for everything else.

The two can coexist in the same project. Use NogginLessDom for new tests and
gradually migrate existing tests as coverage allows.
