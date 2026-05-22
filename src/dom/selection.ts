/**
 * DOM Selection implementation.
 * @module dom/selection
 */

import { Node } from './index.js';
import { Range } from './range.js';

/**
 * DOM Selection class implementing the Selection API.
 */
export class Selection {
  private _ranges: Range[] = [];

  get anchorNode(): Node | null {
    if (this._ranges.length === 0) return null;
    return this._ranges[0]!.startContainer;
  }

  get anchorOffset(): number {
    if (this._ranges.length === 0) return 0;
    return this._ranges[0]!.startOffset;
  }

  get focusNode(): Node | null {
    if (this._ranges.length === 0) return null;
    const lastRange = this._ranges[this._ranges.length - 1]!;
    return lastRange.endContainer;
  }

  get focusOffset(): number {
    if (this._ranges.length === 0) return 0;
    const lastRange = this._ranges[this._ranges.length - 1]!;
    return lastRange.endOffset;
  }

  get isCollapsed(): boolean {
    if (this._ranges.length === 0) return true;
    return this._ranges[0]!.collapsed;
  }

  get rangeCount(): number {
    return this._ranges.length;
  }

  get type(): string {
    if (this._ranges.length === 0) return 'None';
    if (this._ranges[0]!.collapsed) return 'Caret';
    return 'Range';
  }

  addRange(range: Range): void {
    this._ranges.push(range);
  }

  removeRange(range: Range): void {
    const index = this._ranges.indexOf(range);
    if (index === -1) {
      throw new Error('NotFoundError: range not found in selection');
    }
    this._ranges.splice(index, 1);
  }

  removeAllRanges(): void {
    this._ranges = [];
  }

  getRangeAt(index: number): Range {
    if (index < 0 || index >= this._ranges.length) {
      throw new Error('IndexSizeError: index out of range');
    }
    return this._ranges[index]!;
  }

  collapse(node: Node | null, offset?: number): void {
    this.removeAllRanges();
    if (node === null) return;

    const range = new Range();
    const resolvedOffset = offset ?? 0;
    range.setStart(node, resolvedOffset);
    range.setEnd(node, resolvedOffset);
    this._ranges.push(range);
  }

  collapseToStart(): void {
    if (this._ranges.length === 0) {
      throw new Error('InvalidStateError: no ranges in selection');
    }
    const range = this._ranges[0]!;
    this.collapse(range.startContainer, range.startOffset);
  }

  collapseToEnd(): void {
    if (this._ranges.length === 0) {
      throw new Error('InvalidStateError: no ranges in selection');
    }
    const lastRange = this._ranges[this._ranges.length - 1]!;
    this.collapse(lastRange.endContainer, lastRange.endOffset);
  }

  containsNode(node: Node, allowPartial?: boolean): boolean {
    if (this._ranges.length === 0) return false;

    for (const range of this._ranges) {
      if (allowPartial) {
        // Node is at least partially within the range
        const ancestor = range.commonAncestorContainer;
        if (ancestor.contains(node) || node.contains(ancestor)) {
          return true;
        }
      } else {
        // Node must be fully contained
        const ancestor = range.commonAncestorContainer;
        if (ancestor.contains(node)) {
          return true;
        }
      }
    }
    return false;
  }

  selectAllChildren(node: Node): void {
    this.removeAllRanges();
    const range = new Range();
    range.selectNodeContents(node);
    this._ranges.push(range);
  }

  toString(): string {
    return this._ranges.map((r) => r.toString()).join('');
  }

  /**
   * Alias for removeAllRanges (deprecated).
   */
  empty(): void {
    this.removeAllRanges();
  }
}
