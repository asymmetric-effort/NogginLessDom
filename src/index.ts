/**
 * NogginLessDom — A zero-dependency testing framework.
 *
 * Provides a comprehensive test runner, assertion library, DOM simulation,
 * and mocking utilities built entirely on Node.js built-in modules.
 *
 * @packageDocumentation
 */

export {
  describe,
  it,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from './test-runner/index.js';

export { expect } from './assertions/index.js';

export {
  Document,
  Element,
  Node,
  Event,
  TextNode,
  Comment,
  NodeList,
  HTMLCollection,
  DOMTokenList,
  CSSStyleDeclaration,
} from './dom/index.js';

export { MutationObserver, MutationRecord } from './dom/mutation-observer.js';
export { ResizeObserver, triggerResize } from './dom/resize-observer.js';
export {
  IntersectionObserver,
  triggerIntersection,
} from './dom/intersection-observer.js';

export {
  HTMLAnchorElement,
  HTMLButtonElement,
  HTMLInputElement,
  HTMLSelectElement,
  HTMLTextAreaElement,
  HTMLFormElement,
  HTMLImageElement,
  HTMLLabelElement,
  HTMLOptionElement,
} from './dom/html-elements.js';

export {
  Window,
  createWindow,
  Storage,
  Location,
  History,
  Navigator,
  MediaQueryList,
} from './dom/window.js';

export { ShadowRoot } from './dom/shadow.js';
export { CustomElementRegistry } from './dom/custom-elements.js';
export { CookieJar } from './dom/cookie.js';

export {
  CustomEvent,
  MouseEvent,
  KeyboardEvent,
  FocusEvent,
  InputEvent,
} from './dom/events.js';

export {
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
  mock,
} from './mocking/index.js';

export {
  startCoverage,
  takeCoverage,
  stopCoverage,
  reportCoverage,
  checkCoverageThresholds,
} from './coverage/index.js';
