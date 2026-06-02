/**
 * Performance API — marks, measures, and PerformanceObserver.
 * @module dom/performance
 */

/**
 * Base PerformanceEntry interface.
 */
export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

/**
 * PerformanceMark entry.
 */
export interface PerformanceMark extends PerformanceEntry {
  entryType: 'mark';
}

/**
 * PerformanceMeasure entry.
 */
export interface PerformanceMeasure extends PerformanceEntry {
  entryType: 'measure';
}

/**
 * PerformanceObserverEntryList — returned by PerformanceObserver callback.
 */
export class PerformanceObserverEntryList {
  private _entries: PerformanceEntry[];

  constructor(entries: PerformanceEntry[]) {
    this._entries = entries.slice();
  }

  getEntries(): PerformanceEntry[] {
    return this._entries.slice();
  }

  getEntriesByName(name: string): PerformanceEntry[] {
    return this._entries.filter((e) => e.name === name);
  }

  getEntriesByType(type: string): PerformanceEntry[] {
    return this._entries.filter((e) => e.entryType === type);
  }
}

/**
 * PerformanceObserver — observes performance entries.
 */
export class PerformanceObserver {
  private _callback: (list: PerformanceObserverEntryList) => void;
  private _entryTypes: string[] = [];
  private _buffer: PerformanceEntry[] = [];
  /** @internal */ _performance: Performance | null = null;

  constructor(callback: (list: PerformanceObserverEntryList) => void) {
    this._callback = callback;
  }

  observe(options: { entryTypes: string[] }): void {
    this._entryTypes = options.entryTypes.slice();
    if (this._performance) {
      this._performance._addObserver(this);
    }
  }

  disconnect(): void {
    if (this._performance) {
      this._performance._removeObserver(this);
    }
    this._buffer = [];
  }

  takeRecords(): PerformanceEntry[] {
    const records = this._buffer.slice();
    this._buffer = [];
    return records;
  }

  /** @internal */
  _notify(entry: PerformanceEntry): void {
    if (this._entryTypes.includes(entry.entryType)) {
      this._buffer.push(entry);
      const list = new PerformanceObserverEntryList([entry]);
      this._callback(list);
    }
  }
}

/**
 * Performance — provides marks, measures, and observer support.
 */
export class Performance {
  private _marks: Map<string, PerformanceMark> = new Map();
  private _measures: PerformanceMeasure[] = [];
  private _observers: Set<PerformanceObserver> = new Set();
  private _timeOrigin: number = Date.now();

  get timeOrigin(): number {
    return this._timeOrigin;
  }

  now(): number {
    return Date.now() - this._timeOrigin;
  }

  mark(name: string): PerformanceMark {
    const entry: PerformanceMark = {
      name,
      entryType: 'mark',
      startTime: this.now(),
      duration: 0,
    };
    this._marks.set(name, entry);
    this._notifyObservers(entry);
    return entry;
  }

  measure(
    name: string,
    startMark?: string,
    endMark?: string,
  ): PerformanceMeasure {
    let startTime = 0;
    let endTime = this.now();

    if (startMark !== undefined) {
      const sm = this._marks.get(startMark);
      if (!sm) {
        throw new Error(
          `Failed to execute 'measure' on 'Performance': The mark '${startMark}' does not exist.`,
        );
      }
      startTime = sm.startTime;
    }

    if (endMark !== undefined) {
      const em = this._marks.get(endMark);
      if (!em) {
        throw new Error(
          `Failed to execute 'measure' on 'Performance': The mark '${endMark}' does not exist.`,
        );
      }
      endTime = em.startTime;
    }

    const entry: PerformanceMeasure = {
      name,
      entryType: 'measure',
      startTime,
      duration: endTime - startTime,
    };
    this._measures.push(entry);
    this._notifyObservers(entry);
    return entry;
  }

  getEntries(): PerformanceEntry[] {
    const marks = [...this._marks.values()] as PerformanceEntry[];
    return [...marks, ...this._measures];
  }

  getEntriesByName(name: string): PerformanceEntry[] {
    return this.getEntries().filter((e) => e.name === name);
  }

  getEntriesByType(type: string): PerformanceEntry[] {
    return this.getEntries().filter((e) => e.entryType === type);
  }

  clearMarks(name?: string): void {
    if (name !== undefined) {
      this._marks.delete(name);
    } else {
      this._marks.clear();
    }
  }

  clearMeasures(name?: string): void {
    if (name !== undefined) {
      this._measures = this._measures.filter((m) => m.name !== name);
    } else {
      this._measures = [];
    }
  }

  /** @internal */
  _addObserver(observer: PerformanceObserver): void {
    this._observers.add(observer);
  }

  /** @internal */
  _removeObserver(observer: PerformanceObserver): void {
    this._observers.delete(observer);
  }

  private _notifyObservers(entry: PerformanceEntry): void {
    for (const observer of this._observers) {
      observer._notify(entry);
    }
  }
}
