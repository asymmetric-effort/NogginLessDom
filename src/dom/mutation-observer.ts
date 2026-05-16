/**
 * MutationObserver implementation for full DOM simulation test environment.
 * @module dom/mutation-observer
 */

import { Node } from './index.js';

/**
 * Options for MutationObserver.observe().
 */
export interface MutationObserverInit {
  childList?: boolean;
  attributes?: boolean;
  characterData?: boolean;
  subtree?: boolean;
  attributeOldValue?: boolean;
  characterDataOldValue?: boolean;
  attributeFilter?: string[];
}

/**
 * Record of a single mutation.
 */
export class MutationRecord {
  public readonly type: 'attributes' | 'characterData' | 'childList';
  public readonly target: Node;
  public readonly addedNodes: Node[];
  public readonly removedNodes: Node[];
  public readonly previousSibling: Node | null;
  public readonly nextSibling: Node | null;
  public readonly attributeName: string | null;
  public readonly attributeNamespace: string | null;
  public readonly oldValue: string | null;

  constructor(init: {
    type: 'attributes' | 'characterData' | 'childList';
    target: Node;
    addedNodes?: Node[];
    removedNodes?: Node[];
    previousSibling?: Node | null;
    nextSibling?: Node | null;
    attributeName?: string | null;
    attributeNamespace?: string | null;
    oldValue?: string | null;
  }) {
    this.type = init.type;
    this.target = init.target;
    this.addedNodes = init.addedNodes ?? [];
    this.removedNodes = init.removedNodes ?? [];
    this.previousSibling = init.previousSibling ?? null;
    this.nextSibling = init.nextSibling ?? null;
    this.attributeName = init.attributeName ?? null;
    this.attributeNamespace = init.attributeNamespace ?? null;
    this.oldValue = init.oldValue ?? null;
  }
}

interface ObservationTarget {
  target: Node;
  options: MutationObserverInit;
}

type MutationCallback = (
  mutations: MutationRecord[],
  observer: MutationObserver,
) => void;

/**
 * MutationObserver — observes DOM mutations and delivers them asynchronously.
 */
export class MutationObserver {
  private callback: MutationCallback;
  private observations: ObservationTarget[] = [];
  private recordQueue: MutationRecord[] = [];
  private scheduled = false;

  constructor(callback: MutationCallback) {
    this.callback = callback;
  }

  observe(target: Node, options: MutationObserverInit): void {
    // Remove existing observation on the same target
    this.observations = this.observations.filter((o) => o.target !== target);
    this.observations.push({ target, options });
    registerObserver(target, this);
  }

  disconnect(): void {
    for (const obs of this.observations) {
      unregisterObserver(obs.target, this);
    }
    this.observations = [];
    this.recordQueue = [];
    this.scheduled = false;
  }

  takeRecords(): MutationRecord[] {
    const records = this.recordQueue.slice();
    this.recordQueue = [];
    this.scheduled = false;
    return records;
  }

  /** @internal */
  _queueRecord(record: MutationRecord): void {
    this.recordQueue.push(record);
    if (!this.scheduled) {
      this.scheduled = true;
      Promise.resolve().then(() => {
        if (this.recordQueue.length > 0) {
          const records = this.recordQueue.slice();
          this.recordQueue = [];
          this.scheduled = false;
          this.callback(records, this);
        } else {
          this.scheduled = false;
        }
      });
    }
  }

  /** @internal */
  _getObservations(): readonly ObservationTarget[] {
    return this.observations;
  }
}

// Global registry: map from Node to the set of observers watching it
const observerRegistry = new WeakMap<Node, Set<MutationObserver>>();

function registerObserver(target: Node, observer: MutationObserver): void {
  let observers = observerRegistry.get(target);
  if (!observers) {
    observers = new Set();
    observerRegistry.set(target, observers);
  }
  observers.add(observer);
}

function unregisterObserver(target: Node, observer: MutationObserver): void {
  const observers = observerRegistry.get(target);
  if (observers) {
    observers.delete(observer);
  }
}

/**
 * Find all observers interested in a mutation on the given target node.
 */
function findInterestedObservers(
  target: Node,
  type: 'attributes' | 'characterData' | 'childList',
  attributeName?: string,
): Array<{ observer: MutationObserver; options: MutationObserverInit }> {
  const results: Array<{
    observer: MutationObserver;
    options: MutationObserverInit;
  }> = [];

  // Walk up from target to find observers with subtree: true
  let current: Node | null = target;
  while (current !== null) {
    const observers = observerRegistry.get(current);
    if (observers) {
      for (const observer of observers) {
        for (const obs of observer._getObservations()) {
          if (obs.target !== current) continue;

          // Direct target or subtree
          const isDirectTarget = current === target;
          const isSubtree = obs.options.subtree === true && current !== target;

          if (!isDirectTarget && !isSubtree) continue;

          // Check type match
          if (type === 'childList' && !obs.options.childList) continue;
          if (type === 'attributes' && !obs.options.attributes) continue;
          if (type === 'characterData' && !obs.options.characterData) continue;

          // Check attributeFilter
          if (
            type === 'attributes' &&
            obs.options.attributeFilter &&
            attributeName !== undefined &&
            !obs.options.attributeFilter.includes(attributeName)
          ) {
            continue;
          }

          results.push({ observer, options: obs.options });
        }
      }
    }
    current = current.parentNode;
  }

  return results;
}

/**
 * Notify observers about a childList mutation.
 */
export function notifyChildListMutation(
  target: Node,
  addedNodes: Node[],
  removedNodes: Node[],
  previousSibling: Node | null,
  nextSibling: Node | null,
): void {
  const interested = findInterestedObservers(target, 'childList');
  for (const { observer } of interested) {
    observer._queueRecord(
      new MutationRecord({
        type: 'childList',
        target,
        addedNodes,
        removedNodes,
        previousSibling,
        nextSibling,
      }),
    );
  }
}

/**
 * Notify observers about an attribute mutation.
 */
export function notifyAttributeMutation(
  target: Node,
  attributeName: string,
  oldValue: string | null,
): void {
  const interested = findInterestedObservers(
    target,
    'attributes',
    attributeName,
  );
  for (const { observer, options } of interested) {
    observer._queueRecord(
      new MutationRecord({
        type: 'attributes',
        target,
        attributeName,
        oldValue: options.attributeOldValue ? oldValue : null,
      }),
    );
  }
}

/**
 * Notify observers about a characterData mutation.
 */
export function notifyCharacterDataMutation(
  target: Node,
  oldValue: string | null,
): void {
  const interested = findInterestedObservers(target, 'characterData');
  for (const { observer, options } of interested) {
    observer._queueRecord(
      new MutationRecord({
        type: 'characterData',
        target,
        oldValue: options.characterDataOldValue ? oldValue : null,
      }),
    );
  }
}
