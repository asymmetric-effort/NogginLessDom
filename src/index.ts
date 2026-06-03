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
  setTestNamePattern,
  clearTestNamePattern,
  getTestNamePattern,
  setTestFilePattern,
  clearTestFilePattern,
  getTestFilePattern,
  configureIsolation,
  installAutoMockCleanup,
  setSerialMode,
  getSerialMode,
} from './test-runner/index.js';
export type { IsolationConfig } from './test-runner/index.js';

export { expect } from './assertions/index.js';

export {
  objectDiff,
  stringDiff,
  formatExpectedReceived,
  configureDiff,
  stripAnsi,
} from './assertions/diff.js';

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
  getImplicitRole,
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
  HTMLLinkElement,
  HTMLOutputElement,
  HTMLTimeElement,
  HTMLPictureElement,
  HTMLSourceElement,
  ValidityState,
} from './dom/html-elements.js';

export {
  Window,
  createWindow,
  Storage,
  Location,
  History,
  Navigator,
  Clipboard,
  Permissions,
  MediaQueryList,
  Request,
  Response,
} from './dom/window.js';

export {
  Performance,
  PerformanceObserver,
  PerformanceObserverEntryList,
} from './dom/performance.js';
export type {
  PerformanceEntry,
  PerformanceMark,
  PerformanceMeasure,
} from './dom/performance.js';

export {
  Animation,
  KeyframeEffect,
  AnimationTimeline,
} from './dom/animation.js';
export type { EffectTiming, KeyframeEffectOptions } from './dom/animation.js';

export {
  WebSocket,
  CloseEvent as WSCloseEvent,
  WSMessageEvent,
} from './dom/websocket.js';
export type { WebSocketHandler } from './dom/websocket.js';

export { ShadowRoot } from './dom/shadow.js';
export { CustomElementRegistry } from './dom/custom-elements.js';
export { CookieJar } from './dom/cookie.js';

export { Range } from './dom/range.js';
export { Selection } from './dom/selection.js';

export { FormData } from './dom/form-data.js';
export { Blob } from './dom/blob.js';
export { Headers } from './dom/headers.js';
export { atob, btoa } from './dom/web-apis.js';

export { DOMParser, XMLSerializer } from './dom/dom-parser.js';

export { AbortController, AbortSignal } from './dom/abort.js';

export {
  IDBFactory,
  IDBDatabase,
  IDBObjectStore,
  IDBTransaction,
  IDBRequest,
  IDBOpenDBRequest,
  IDBIndex,
  IDBCursor,
  IDBKeyRange,
} from './dom/indexeddb.js';

export {
  CanvasRenderingContext2D,
  CanvasGradient,
  CanvasPattern,
  ImageData,
} from './dom/canvas.js';

export { XMLHttpRequest } from './dom/xhr.js';
export type { XHRHandler } from './dom/xhr.js';

export { parseMediaQuery, evaluateMediaQuery } from './dom/media-query.js';
export type {
  MediaCondition,
  ParsedMediaQuery,
  MediaContext,
} from './dom/media-query.js';

export {
  DataTransfer,
  DataTransferItemList,
  DataTransferItem,
} from './dom/data-transfer.js';

export {
  Worker,
  SharedWorker,
  MessagePort,
  ServiceWorkerContainer,
  ServiceWorker,
  ServiceWorkerRegistration,
} from './dom/workers.js';

export {
  SVGElement,
  SVGSVGElement,
  SVGPathElement,
  SVGCircleElement,
  SVGRectElement,
  SVGLineElement,
  SVGTextElement,
  SVGGElement,
  SVGDefsElement,
  SVGUseElement,
} from './dom/svg.js';

export {
  parseStyleSheet,
  computeSpecificity,
  INHERITED_PROPERTIES,
  expandShorthand,
  collectApplicableStyles,
  collectApplicableStylesWithImportance,
} from './dom/css-cascade.js';
export type { CSSRule } from './dom/css-cascade.js';

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
  PromiseRejectionEvent,
} from './dom/events.js';

export type { Touch } from './dom/events.js';

export {
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
  mock,
  vi,
  configureMockBehavior,
  getMockConfig,
} from './mocking/index.js';
export type { MockConfig } from './mocking/index.js';

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

export { hoistMocks } from './hoist/index.js';
