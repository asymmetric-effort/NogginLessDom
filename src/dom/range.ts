/**
 * DOM Range implementation.
 * @module dom/range
 */

import { Node, TextNode, type DOMRect } from './index.js';

/**
 * Find the common ancestor container of two nodes.
 */
function findCommonAncestor(nodeA: Node, nodeB: Node): Node {
  const ancestors = new Set<Node>();
  let current: Node | null = nodeA;
  while (current) {
    ancestors.add(current);
    current = current.parentNode;
  }
  current = nodeB;
  while (current) {
    if (ancestors.has(current)) return current;
    current = current.parentNode;
  }
  return nodeA;
}

/**
 * Get the index of a child node within its parent.
 */
function indexOfChild(node: Node): number {
  if (!node.parentNode) return 0;
  return node.parentNode.childNodes.indexOf(node);
}

/**
 * Compare two boundary points (container, offset) pairs.
 * Returns -1 if (containerA, offsetA) is before (containerB, offsetB),
 * 0 if equal, 1 if after.
 */
function compareBoundaryPointPositions(
  containerA: Node,
  offsetA: number,
  containerB: Node,
  offsetB: number,
): number {
  if (containerA === containerB) {
    if (offsetA < offsetB) return -1;
    if (offsetA > offsetB) return 1;
    return 0;
  }

  // Check if B is a descendant of A
  if (containerA.contains(containerB)) {
    // Walk up from B to find the child of A that is an ancestor of B
    let child: Node = containerB;
    while (child.parentNode && child.parentNode !== containerA) {
      child = child.parentNode;
    }
    const childIndex = containerA.childNodes.indexOf(child);
    if (offsetA <= childIndex) return -1;
    return 1;
  }

  // Check if A is a descendant of B
  if (containerB.contains(containerA)) {
    let child: Node = containerA;
    while (child.parentNode && child.parentNode !== containerB) {
      child = child.parentNode;
    }
    const childIndex = containerB.childNodes.indexOf(child);
    if (childIndex < offsetB) return -1;
    return 1;
  }

  // Different branches: use document position
  const position = containerA.compareDocumentPosition(containerB);
  // DOCUMENT_POSITION_FOLLOWING = 4
  if (position & 4) return -1;
  return 1;
}

/**
 * Collect text content from nodes within a range.
 */
function collectTextInRange(
  node: Node,
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number,
): string {
  if (node instanceof TextNode) {
    const data = node.data;
    let start = 0;
    let end = data.length;
    if (node === startContainer) start = startOffset;
    if (node === endContainer) end = endOffset;
    return data.slice(start, end);
  }

  let result = '';
  for (const child of node.childNodes) {
    // Check if this child is in range
    const childBeforeStart =
      compareBoundaryPointPositions(
        child,
        child instanceof TextNode ? child.data.length : child.childNodes.length,
        startContainer,
        startOffset,
      ) < 0;
    const childAfterEnd =
      compareBoundaryPointPositions(child, 0, endContainer, endOffset) > 0;
    if (childBeforeStart || childAfterEnd) continue;

    result += collectTextInRange(
      child,
      startContainer,
      startOffset,
      endContainer,
      endOffset,
    );
  }
  return result;
}

/**
 * DOM Range class implementing the Range API.
 */
export class Range {
  /** Comparison constants */
  public static readonly START_TO_START = 0;
  public static readonly START_TO_END = 1;
  public static readonly END_TO_END = 2;
  public static readonly END_TO_START = 3;

  /** Instance-level comparison constants (per spec) */
  public readonly START_TO_START = 0;
  public readonly START_TO_END = 1;
  public readonly END_TO_END = 2;
  public readonly END_TO_START = 3;

  private _startContainer: Node;
  private _startOffset: number;
  private _endContainer: Node;
  private _endOffset: number;

  constructor() {
    const placeholderNode = new Node(11, '#document-fragment');
    this._startContainer = placeholderNode;
    this._startOffset = 0;
    this._endContainer = placeholderNode;
    this._endOffset = 0;
  }

  get startContainer(): Node {
    return this._startContainer;
  }

  get startOffset(): number {
    return this._startOffset;
  }

  get endContainer(): Node {
    return this._endContainer;
  }

  get endOffset(): number {
    return this._endOffset;
  }

  get collapsed(): boolean {
    return (
      this._startContainer === this._endContainer &&
      this._startOffset === this._endOffset
    );
  }

  get commonAncestorContainer(): Node {
    return findCommonAncestor(this._startContainer, this._endContainer);
  }

  setStart(node: Node, offset: number): void {
    this._startContainer = node;
    this._startOffset = offset;
    // If start is after end, collapse to start
    if (
      compareBoundaryPointPositions(
        this._startContainer,
        this._startOffset,
        this._endContainer,
        this._endOffset,
      ) > 0
    ) {
      this._endContainer = this._startContainer;
      this._endOffset = this._startOffset;
    }
  }

  setEnd(node: Node, offset: number): void {
    this._endContainer = node;
    this._endOffset = offset;
    // If end is before start, collapse to end
    if (
      compareBoundaryPointPositions(
        this._startContainer,
        this._startOffset,
        this._endContainer,
        this._endOffset,
      ) > 0
    ) {
      this._startContainer = this._endContainer;
      this._startOffset = this._endOffset;
    }
  }

  setStartBefore(node: Node): void {
    if (!node.parentNode) {
      throw new Error('InvalidNodeTypeError: node has no parent');
    }
    this.setStart(node.parentNode, indexOfChild(node));
  }

  setStartAfter(node: Node): void {
    if (!node.parentNode) {
      throw new Error('InvalidNodeTypeError: node has no parent');
    }
    this.setStart(node.parentNode, indexOfChild(node) + 1);
  }

  setEndBefore(node: Node): void {
    if (!node.parentNode) {
      throw new Error('InvalidNodeTypeError: node has no parent');
    }
    this.setEnd(node.parentNode, indexOfChild(node));
  }

  setEndAfter(node: Node): void {
    if (!node.parentNode) {
      throw new Error('InvalidNodeTypeError: node has no parent');
    }
    this.setEnd(node.parentNode, indexOfChild(node) + 1);
  }

  selectNode(node: Node): void {
    if (!node.parentNode) {
      throw new Error('InvalidNodeTypeError: node has no parent');
    }
    const index = indexOfChild(node);
    this._startContainer = node.parentNode;
    this._startOffset = index;
    this._endContainer = node.parentNode;
    this._endOffset = index + 1;
  }

  selectNodeContents(node: Node): void {
    this._startContainer = node;
    this._startOffset = 0;
    if (node instanceof TextNode) {
      this._endContainer = node;
      this._endOffset = node.data.length;
    } else {
      this._endContainer = node;
      this._endOffset = node.childNodes.length;
    }
  }

  collapse(toStart?: boolean): void {
    if (toStart === undefined || toStart) {
      this._endContainer = this._startContainer;
      this._endOffset = this._startOffset;
    } else {
      this._startContainer = this._endContainer;
      this._startOffset = this._endOffset;
    }
  }

  cloneRange(): Range {
    const range = new Range();
    range._startContainer = this._startContainer;
    range._startOffset = this._startOffset;
    range._endContainer = this._endContainer;
    range._endOffset = this._endOffset;
    return range;
  }

  cloneContents(): Node {
    const fragment = new Node(11, '#document-fragment');

    if (this.collapsed) return fragment;

    // Simple case: start and end in same text node
    if (
      this._startContainer === this._endContainer &&
      this._startContainer instanceof TextNode
    ) {
      const text = this._startContainer.data.slice(
        this._startOffset,
        this._endOffset,
      );
      fragment.appendChild(new TextNode(text));
      return fragment;
    }

    // General case: walk the tree and clone nodes in range
    this._traverseContents(fragment, false);
    return fragment;
  }

  extractContents(): Node {
    const fragment = new Node(11, '#document-fragment');

    if (this.collapsed) return fragment;

    // Simple case: start and end in same text node
    if (
      this._startContainer === this._endContainer &&
      this._startContainer instanceof TextNode
    ) {
      const text = this._startContainer.data.slice(
        this._startOffset,
        this._endOffset,
      );
      this._startContainer.data =
        this._startContainer.data.slice(0, this._startOffset) +
        this._startContainer.data.slice(this._endOffset);
      fragment.appendChild(new TextNode(text));
      this.collapse(true);
      return fragment;
    }

    this._traverseContents(fragment, true);
    this.collapse(true);
    return fragment;
  }

  deleteContents(): void {
    if (this.collapsed) return;

    // Simple case: start and end in same text node
    if (
      this._startContainer === this._endContainer &&
      this._startContainer instanceof TextNode
    ) {
      this._startContainer.data =
        this._startContainer.data.slice(0, this._startOffset) +
        this._startContainer.data.slice(this._endOffset);
      this.collapse(true);
      return;
    }

    // Handle start text node
    if (this._startContainer instanceof TextNode) {
      this._startContainer.data = this._startContainer.data.slice(
        0,
        this._startOffset,
      );
    }

    // Handle end text node
    if (this._endContainer instanceof TextNode) {
      this._endContainer.data = this._endContainer.data.slice(this._endOffset);
    }

    // Remove fully contained nodes
    const ancestor = this.commonAncestorContainer;
    const toRemove: Node[] = [];
    this._collectFullyContainedNodes(ancestor, toRemove);
    for (const node of toRemove) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    this.collapse(true);
  }

  insertNode(node: Node): void {
    if (this._startContainer instanceof TextNode) {
      const textNode = this._startContainer;
      const parent = textNode.parentNode;
      if (!parent) {
        throw new Error('HierarchyRequestError: text node has no parent');
      }
      const afterText = textNode.data.slice(this._startOffset);
      textNode.data = textNode.data.slice(0, this._startOffset);
      const afterNode = new TextNode(afterText);
      afterNode.ownerDocument = textNode.ownerDocument;
      parent.insertBefore(afterNode, textNode.nextSibling);
      parent.insertBefore(node, afterNode);
    } else {
      const refChild =
        this._startContainer.childNodes[this._startOffset] ?? null;
      this._startContainer.insertBefore(node, refChild);
    }
  }

  toString(): string {
    if (this.collapsed) return '';

    // Same text node case
    if (
      this._startContainer === this._endContainer &&
      this._startContainer instanceof TextNode
    ) {
      return this._startContainer.data.slice(
        this._startOffset,
        this._endOffset,
      );
    }

    const ancestor = this.commonAncestorContainer;
    return collectTextInRange(
      ancestor,
      this._startContainer,
      this._startOffset,
      this._endContainer,
      this._endOffset,
    );
  }

  compareBoundaryPoints(how: number, sourceRange: Range): number {
    let thisContainer: Node;
    let thisOffset: number;
    let sourceContainer: Node;
    let sourceOffset: number;

    switch (how) {
      case Range.START_TO_START:
        thisContainer = this._startContainer;
        thisOffset = this._startOffset;
        sourceContainer = sourceRange._startContainer;
        sourceOffset = sourceRange._startOffset;
        break;
      case Range.START_TO_END:
        thisContainer = this._endContainer;
        thisOffset = this._endOffset;
        sourceContainer = sourceRange._startContainer;
        sourceOffset = sourceRange._startOffset;
        break;
      case Range.END_TO_END:
        thisContainer = this._endContainer;
        thisOffset = this._endOffset;
        sourceContainer = sourceRange._endContainer;
        sourceOffset = sourceRange._endOffset;
        break;
      case Range.END_TO_START:
        thisContainer = this._startContainer;
        thisOffset = this._startOffset;
        sourceContainer = sourceRange._endContainer;
        sourceOffset = sourceRange._endOffset;
        break;
      default:
        throw new Error('NotSupportedError: invalid comparison type');
    }

    return compareBoundaryPointPositions(
      thisContainer,
      thisOffset,
      sourceContainer,
      sourceOffset,
    );
  }

  getBoundingClientRect(): DOMRect {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  detach(): void {
    // No-op (deprecated)
  }

  /**
   * Traverse range contents, optionally extracting (removing) them.
   */
  private _traverseContents(fragment: Node, extract: boolean): void {
    const ancestor = this.commonAncestorContainer;

    // Handle start partial text node
    if (this._startContainer instanceof TextNode) {
      const text = this._startContainer.data.slice(this._startOffset);
      fragment.appendChild(new TextNode(text));
      if (extract) {
        this._startContainer.data = this._startContainer.data.slice(
          0,
          this._startOffset,
        );
      }
    }

    // Handle end partial text node
    let endPartialText: TextNode | null = null;
    if (
      this._endContainer instanceof TextNode &&
      this._endContainer !== this._startContainer
    ) {
      const text = this._endContainer.data.slice(0, this._endOffset);
      endPartialText = new TextNode(text);
      if (extract) {
        this._endContainer.data = this._endContainer.data.slice(
          this._endOffset,
        );
      }
    }

    // Clone/extract fully contained nodes
    const fullyContained: Node[] = [];
    this._collectFullyContainedNodes(ancestor, fullyContained);
    for (const node of fullyContained) {
      fragment.appendChild(node.cloneNode(true));
      if (extract && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    if (endPartialText) {
      fragment.appendChild(endPartialText);
    }
  }

  /**
   * Collect nodes that are fully contained within the range.
   */
  private _collectFullyContainedNodes(node: Node, result: Node[]): void {
    for (const child of node.childNodes) {
      if (this._isFullyContained(child)) {
        result.push(child);
      } else if (this._isPartiallyContained(child)) {
        this._collectFullyContainedNodes(child, result);
      }
    }
  }

  /**
   * Check if a node is fully contained within the range.
   */
  private _isFullyContained(node: Node): boolean {
    const nodeStart = compareBoundaryPointPositions(
      node,
      0,
      this._startContainer,
      this._startOffset,
    );
    const nodeEndOffset =
      node instanceof TextNode ? node.data.length : node.childNodes.length;
    const nodeEnd = compareBoundaryPointPositions(
      node,
      nodeEndOffset,
      this._endContainer,
      this._endOffset,
    );
    return nodeStart >= 0 && nodeEnd <= 0;
  }

  /**
   * Check if a node is partially contained within the range.
   */
  private _isPartiallyContained(node: Node): boolean {
    const isAncestorOfStart = node.contains(this._startContainer);
    const isAncestorOfEnd = node.contains(this._endContainer);
    return (
      (isAncestorOfStart && !isAncestorOfEnd) ||
      (!isAncestorOfStart && isAncestorOfEnd)
    );
  }
}
