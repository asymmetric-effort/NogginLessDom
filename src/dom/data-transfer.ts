/**
 * DataTransfer, DataTransferItemList, and DataTransferItem — drag-and-drop data transfer API.
 * @module dom/data-transfer
 */

/**
 * Represents a single item in a DataTransferItemList.
 */
export class DataTransferItem {
  readonly kind: string;
  readonly type: string;
  private _data: string | null;

  constructor(kind: string, type: string, data: string | null) {
    this.kind = kind;
    this.type = type;
    this._data = data;
  }

  getAsString(callback: (data: string) => void): void {
    if (this.kind === 'string' && this._data !== null) {
      callback(this._data);
    }
  }

  getAsFile(): File | null {
    return null;
  }
}

/**
 * DataTransferItemList — manages a list of DataTransferItem entries.
 */
export class DataTransferItemList {
  private _items: DataTransferItem[] = [];

  get length(): number {
    return this._items.length;
  }

  add(data: string, type: string): DataTransferItem | null;
  add(data: File): DataTransferItem | null;
  add(data: string | File, type?: string): DataTransferItem | null {
    if (typeof data === 'string' && type !== undefined) {
      const item = new DataTransferItem('string', type, data);
      this._items.push(item);
      return item;
    }
    // File case — stub, files not fully supported
    return null;
  }

  remove(index: number): void {
    if (index >= 0 && index < this._items.length) {
      this._items.splice(index, 1);
    }
  }

  clear(): void {
    this._items = [];
  }

  get(index: number): DataTransferItem | undefined {
    return this._items[index];
  }

  [index: number]: DataTransferItem;
}

type DropEffect = 'none' | 'copy' | 'link' | 'move';
type EffectAllowed =
  | 'none'
  | 'copy'
  | 'copyLink'
  | 'copyMove'
  | 'link'
  | 'linkMove'
  | 'move'
  | 'all'
  | 'uninitialized';

/**
 * DataTransfer — holds data during a drag-and-drop operation.
 */
export class DataTransfer {
  private _data: Map<string, string> = new Map();
  public dropEffect: DropEffect = 'none';
  public effectAllowed: EffectAllowed = 'uninitialized';
  public readonly files: ReadonlyArray<File> = [];
  public readonly items: DataTransferItemList = new DataTransferItemList();

  get types(): string[] {
    return [...this._data.keys()];
  }

  setData(type: string, value: string): void {
    const isNew = !this._data.has(type);
    this._data.set(type, value);
    if (isNew) {
      this.items.add(value, type);
    }
  }

  getData(type: string): string {
    return this._data.get(type) ?? '';
  }

  clearData(type?: string): void {
    if (type !== undefined) {
      this._data.delete(type);
      // Rebuild items to stay in sync
      this._rebuildItems();
    } else {
      this._data.clear();
      this.items.clear();
    }
  }

  /**
   * setDragImage — no-op in headless environment.
   */
  setDragImage(_image: unknown, _x: number, _y: number): void {
    // No-op: no visual rendering in headless DOM
  }

  private _rebuildItems(): void {
    this.items.clear();
    for (const [type, value] of this._data) {
      this.items.add(value, type);
    }
  }
}
