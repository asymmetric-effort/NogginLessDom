/**
 * TreeWalker and NodeIterator — DOM traversal utilities.
 * @module dom/tree-walker
 */

import { Node } from './index.js';

/**
 * NodeFilter constants and types.
 */
export const NodeFilter = {
  // Filter return values
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,

  // whatToShow bitmask constants
  SHOW_ALL: 0xffffffff,
  SHOW_ELEMENT: 0x1,
  SHOW_ATTRIBUTE: 0x2,
  SHOW_TEXT: 0x4,
  SHOW_CDATA_SECTION: 0x8,
  SHOW_PROCESSING_INSTRUCTION: 0x40,
  SHOW_COMMENT: 0x80,
  SHOW_DOCUMENT: 0x100,
  SHOW_DOCUMENT_TYPE: 0x200,
  SHOW_DOCUMENT_FRAGMENT: 0x400,
} as const;

/** Filter callback type. */
export type NodeFilterCallback = (node: Node) => number;

/**
 * Map nodeType to the corresponding SHOW_ bitmask.
 */
function nodeTypeToBit(nodeType: number): number {
  // The mapping is: bit = 1 << (nodeType - 1)
  // ELEMENT_NODE=1 -> 0x1, ATTRIBUTE_NODE=2 -> 0x2, TEXT_NODE=3 -> 0x4, etc.
  return 1 << (nodeType - 1);
}

/**
 * Check if a node passes the whatToShow bitmask and optional filter.
 * Returns NodeFilter.FILTER_ACCEPT, FILTER_REJECT, or FILTER_SKIP.
 */
function applyFilter(
  node: Node,
  whatToShow: number,
  filter: NodeFilterCallback | null,
): number {
  // Check whatToShow bitmask
  const bit = nodeTypeToBit(node.nodeType);
  if ((whatToShow & bit) === 0) {
    return NodeFilter.FILTER_SKIP;
  }

  // Apply custom filter if provided
  if (filter !== null) {
    return filter(node);
  }

  return NodeFilter.FILTER_ACCEPT;
}

/**
 * TreeWalker provides a way to traverse a DOM tree with filtering.
 */
export class TreeWalker {
  public readonly root: Node;
  public readonly whatToShow: number;
  public readonly filter: NodeFilterCallback | null;
  public currentNode: Node;

  constructor(
    root: Node,
    whatToShow: number = NodeFilter.SHOW_ALL,
    filter: NodeFilterCallback | null = null,
  ) {
    this.root = root;
    this.whatToShow = whatToShow;
    this.filter = filter;
    this.currentNode = root;
  }

  parentNode(): Node | null {
    let node: Node | null = this.currentNode;
    while (node !== null && node !== this.root) {
      node = node.parentNode;
      if (node !== null && node !== null) {
        const result = applyFilter(node, this.whatToShow, this.filter);
        if (result === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = node;
          return node;
        }
      }
    }
    return null;
  }

  firstChild(): Node | null {
    return this._traverseChildren('first');
  }

  lastChild(): Node | null {
    return this._traverseChildren('last');
  }

  nextSibling(): Node | null {
    return this._traverseSiblings('next');
  }

  previousSibling(): Node | null {
    return this._traverseSiblings('previous');
  }

  nextNode(): Node | null {
    let node: Node | null = this.currentNode;

    for (;;) {
      // Try to go to first child
      if (node.childNodes.length > 0) {
        node = node.childNodes[0]!;
        const result = applyFilter(node, this.whatToShow, this.filter);
        if (result === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = node;
          return node;
        }
        // If FILTER_REJECT, skip children; if FILTER_SKIP, try children
        if (result === NodeFilter.FILTER_REJECT) {
          // Skip this subtree, try next sibling
          node = this._nextSkippingChildren(node);
          if (node === null) return null;
          const r2 = applyFilter(node, this.whatToShow, this.filter);
          if (r2 === NodeFilter.FILTER_ACCEPT) {
            this.currentNode = node;
            return node;
          }
          continue;
        }
        continue;
      }

      // No children, try siblings and ancestors' siblings
      node = this._nextSkippingChildren(node);
      if (node === null) return null;
      const result = applyFilter(node, this.whatToShow, this.filter);
      if (result === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node;
        return node;
      }
      if (result === NodeFilter.FILTER_REJECT) {
        // Skip subtree
        node = this._nextSkippingChildren(node);
        if (node === null) return null;
        const r2 = applyFilter(node, this.whatToShow, this.filter);
        if (r2 === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = node;
          return node;
        }
      }
    }
  }

  previousNode(): Node | null {
    let node: Node | null = this.currentNode;

    while (node !== this.root) {
      // Try previous sibling
      let sibling = this._getPreviousSibling(node);
      while (sibling !== null) {
        node = sibling;
        // Go to the deepest last child
        let lastChild = this._getLastChild(node);
        while (lastChild !== null) {
          node = lastChild;
          lastChild = this._getLastChild(node);
        }

        const result = applyFilter(node, this.whatToShow, this.filter);
        if (result === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = node;
          return node;
        }
        sibling = this._getPreviousSibling(node);
      }

      // No previous sibling, go to parent
      if (node === this.root) return null;
      node = node.parentNode;
      if (node === null || node === this.root) {
        // Check if root itself is acceptable
        if (node === this.root) {
          const result = applyFilter(this.root, this.whatToShow, this.filter);
          if (result === NodeFilter.FILTER_ACCEPT) {
            this.currentNode = this.root;
            return this.root;
          }
        }
        return null;
      }

      const result = applyFilter(node, this.whatToShow, this.filter);
      if (result === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node;
        return node;
      }
    }

    return null;
  }

  private _getLastChild(node: Node): Node | null {
    const len = node.childNodes.length;
    return len > 0 ? node.childNodes[len - 1]! : null;
  }

  private _getPreviousSibling(node: Node): Node | null {
    if (!node.parentNode) return null;
    const siblings = node.parentNode.childNodes;
    const idx = siblings.indexOf(node);
    return idx > 0 ? siblings[idx - 1]! : null;
  }

  private _nextSkippingChildren(node: Node): Node | null {
    let current: Node | null = node;
    while (current !== null && current !== this.root) {
      // Try next sibling
      if (current.parentNode) {
        const siblings = current.parentNode.childNodes;
        const idx = siblings.indexOf(current);
        if (idx + 1 < siblings.length) {
          return siblings[idx + 1]!;
        }
      }
      // Go to parent and try its next sibling
      current = current.parentNode;
    }
    return null;
  }

  private _traverseChildren(type: 'first' | 'last'): Node | null {
    const children = this.currentNode.childNodes;
    if (children.length === 0) return null;

    let node: Node | null =
      type === 'first' ? children[0]! : children[children.length - 1]!;

    while (node !== null) {
      const result = applyFilter(node, this.whatToShow, this.filter);
      if (result === NodeFilter.FILTER_ACCEPT) {
        this.currentNode = node;
        return node;
      }
      if (result === NodeFilter.FILTER_SKIP) {
        // Try children of this node
        const innerChildren: Node[] = node.childNodes;
        if (innerChildren.length > 0) {
          node =
            type === 'first'
              ? innerChildren[0]!
              : innerChildren[innerChildren.length - 1]!;
          continue;
        }
      }
      // FILTER_REJECT or FILTER_SKIP with no children: move to next/prev sibling
      if (!node.parentNode) return null;
      const siblings: Node[] = node.parentNode.childNodes;
      const idx: number = siblings.indexOf(node);
      if (type === 'first') {
        node = idx + 1 < siblings.length ? siblings[idx + 1]! : null;
      } else {
        node = idx > 0 ? siblings[idx - 1]! : null;
      }
    }

    return null;
  }

  private _traverseSiblings(type: 'next' | 'previous'): Node | null {
    let node: Node | null = this.currentNode;

    if (node === this.root) return null;

    for (;;) {
      let sibling = this._getSibling(node, type);

      while (sibling !== null) {
        node = sibling;
        const result = applyFilter(node, this.whatToShow, this.filter);
        if (result === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = node;
          return node;
        }
        if (result === NodeFilter.FILTER_SKIP) {
          // Try children of skipped node
          sibling = this._getFirstOrLastChild(node, type);
          if (sibling !== null) continue;
        }
        // FILTER_REJECT or no children: try next sibling of this node
        sibling = this._getSibling(node, type);
      }

      // No more siblings; go to parent and try its siblings
      node = node.parentNode;
      if (node === null || node === this.root) return null;

      const result = applyFilter(node, this.whatToShow, this.filter);
      if (result === NodeFilter.FILTER_ACCEPT) {
        // Parent is accepted; no sibling found
        return null;
      }
    }
  }

  private _getSibling(node: Node, type: 'next' | 'previous'): Node | null {
    if (!node.parentNode) return null;
    const siblings = node.parentNode.childNodes;
    const idx = siblings.indexOf(node);
    if (type === 'next') {
      return idx + 1 < siblings.length ? siblings[idx + 1]! : null;
    }
    return idx > 0 ? siblings[idx - 1]! : null;
  }

  private _getFirstOrLastChild(
    node: Node,
    type: 'next' | 'previous',
  ): Node | null {
    const children = node.childNodes;
    if (children.length === 0) return null;
    return type === 'next' ? children[0]! : children[children.length - 1]!;
  }
}

/**
 * NodeIterator provides a flat iteration over nodes in document order.
 */
export class NodeIterator {
  public readonly root: Node;
  public readonly whatToShow: number;
  public readonly filter: NodeFilterCallback | null;
  public referenceNode: Node;
  public pointerBeforeReferenceNode: boolean;

  constructor(
    root: Node,
    whatToShow: number = NodeFilter.SHOW_ALL,
    filter: NodeFilterCallback | null = null,
  ) {
    this.root = root;
    this.whatToShow = whatToShow;
    this.filter = filter;
    this.referenceNode = root;
    this.pointerBeforeReferenceNode = true;
  }

  nextNode(): Node | null {
    let node: Node | null = this.referenceNode;

    if (this.pointerBeforeReferenceNode) {
      // If pointer is before reference, check reference itself first
      this.pointerBeforeReferenceNode = false;
      const result = applyFilter(node, this.whatToShow, this.filter);
      if (result === NodeFilter.FILTER_ACCEPT) {
        return node;
      }
    }

    // Get next node in document order
    node = this._nextInDocumentOrder(node);
    while (node !== null) {
      const result = applyFilter(node, this.whatToShow, this.filter);
      this.referenceNode = node;
      if (result === NodeFilter.FILTER_ACCEPT) {
        return node;
      }
      node = this._nextInDocumentOrder(node);
    }

    return null;
  }

  previousNode(): Node | null {
    let node: Node | null = this.referenceNode;

    if (!this.pointerBeforeReferenceNode) {
      // If pointer is after reference, check reference itself first
      this.pointerBeforeReferenceNode = true;
      const result = applyFilter(node, this.whatToShow, this.filter);
      if (result === NodeFilter.FILTER_ACCEPT) {
        return node;
      }
    }

    // Get previous node in document order
    node = this._previousInDocumentOrder(node);
    while (node !== null) {
      const result = applyFilter(node, this.whatToShow, this.filter);
      this.referenceNode = node;
      this.pointerBeforeReferenceNode = true;
      if (result === NodeFilter.FILTER_ACCEPT) {
        return node;
      }
      node = this._previousInDocumentOrder(node);
    }

    return null;
  }

  detach(): void {
    // No-op per spec (kept for compatibility)
  }

  private _nextInDocumentOrder(node: Node): Node | null {
    // First child
    if (node.childNodes.length > 0) {
      return node.childNodes[0]!;
    }

    // Next sibling, or ancestor's next sibling
    let current: Node | null = node;
    while (current !== null && current !== this.root) {
      if (current.parentNode) {
        const siblings = current.parentNode.childNodes;
        const idx = siblings.indexOf(current);
        if (idx + 1 < siblings.length) {
          return siblings[idx + 1]!;
        }
      }
      current = current.parentNode;
    }

    return null;
  }

  private _previousInDocumentOrder(node: Node): Node | null {
    if (node === this.root) return null;

    if (!node.parentNode) return null;

    const siblings = node.parentNode.childNodes;
    const idx = siblings.indexOf(node);

    if (idx > 0) {
      // Go to previous sibling's deepest last descendant
      let prev: Node = siblings[idx - 1]!;
      while (prev.childNodes.length > 0) {
        prev = prev.childNodes[prev.childNodes.length - 1]!;
      }
      return prev;
    }

    // Go to parent
    return node.parentNode === this.root ? this.root : node.parentNode;
  }
}
