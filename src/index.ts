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
  onTestFailed,
  onTestFinished,
} from './test-runner/index.js';

export { expect } from './assertions/index.js';

export {
  Document,
  DocumentFragment,
  Element,
  Node,
  Event,
  TextNode,
  Comment,
  NodeList,
  HTMLCollection,
  DOMTokenList,
  CSSStyleDeclaration,
  NodeFilter,
  TreeWalker,
  NodeIterator,
} from './dom/index.js';

export type { NodeFilterCallback } from './dom/index.js';

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
  HTMLDialogElement,
  HTMLCanvasElement,
  HTMLTemplateElement,
  HTMLIFrameElement,
  HTMLVideoElement,
  HTMLAudioElement,
  HTMLProgressElement,
  HTMLMeterElement,
  HTMLDetailsElement,
  HTMLTableElement,
  HTMLTableRowElement,
  HTMLTableCellElement,
  HTMLFieldSetElement,
  HTMLScriptElement,
  HTMLSlotElement,
  ValidityState,
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

export { Range } from './dom/range.js';
export { Selection } from './dom/selection.js';

export { FormData } from './dom/form-data.js';
export { Headers } from './dom/headers.js';
export { atob, btoa } from './dom/web-apis.js';

export { DOMParser, XMLSerializer } from './dom/dom-parser.js';

export { AbortController, AbortSignal } from './dom/abort.js';

export { DataTransfer, DataTransferItemList } from './dom/data-transfer.js';
export type { DataTransferItem } from './dom/data-transfer.js';

export {
  CustomEvent,
  MouseEvent,
  KeyboardEvent,
  FocusEvent,
  InputEvent,
  WheelEvent,
  PointerEvent,
  TouchEvent,
  DragEvent,
  ClipboardEvent,
  TransitionEvent,
  AnimationEvent,
  ErrorEvent,
  MessageEvent,
  StorageEvent,
  PopStateEvent,
  ProgressEvent,
  HashChangeEvent,
  BeforeUnloadEvent,
} from './dom/events.js';

export type { Touch } from './dom/events.js';

export {
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
  mock,
  vi,
} from './mocking/index.js';

export {
  startCoverage,
  takeCoverage,
  stopCoverage,
  reportCoverage,
  checkCoverageThresholds,
} from './coverage/index.js';

export {
  buildImportGraph,
  matchGlob,
  filterPaths,
  watchTests,
} from './test-runner/watch.js';

export type { WatchOptions, WatchController } from './test-runner/watch.js';

export {
  ReporterManager,
  configureReporters,
  getReporterManager,
  resetReporterManager,
  DefaultReporter,
  VerboseReporter,
  DotReporter,
  JsonReporter,
  SilentReporter,
} from './test-runner/reporter.js';

export type {
  TestEvent,
  RunSummary,
  TestReporter,
  ReporterOptions,
} from './test-runner/reporter.js';
