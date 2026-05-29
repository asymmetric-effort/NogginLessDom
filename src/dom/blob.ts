/**
 * Blob implementation for DOM simulation.
 * @module dom/blob
 */

/** Parts that can be used to construct a Blob. */
export type BlobPart = string | ArrayBuffer | Uint8Array | Blob;

/**
 * Blob provides an immutable raw data container.
 */
export class Blob {
  private _parts: Uint8Array[];
  private _type: string;

  constructor(parts?: BlobPart[], options?: { type?: string }) {
    this._type = options?.type ?? '';
    this._parts = [];

    if (parts) {
      for (const part of parts) {
        if (typeof part === 'string') {
          const encoder = new TextEncoder();
          this._parts.push(encoder.encode(part));
        } else if (part instanceof ArrayBuffer) {
          this._parts.push(new Uint8Array(part));
        } else if (part instanceof Uint8Array) {
          this._parts.push(new Uint8Array(part));
        } else if (part instanceof Blob) {
          for (const p of part._parts) {
            this._parts.push(new Uint8Array(p));
          }
        }
      }
    }
  }

  get size(): number {
    let total = 0;
    for (const part of this._parts) {
      total += part.byteLength;
    }
    return total;
  }

  get type(): string {
    return this._type;
  }

  async text(): Promise<string> {
    const decoder = new TextDecoder();
    const buffer = this._mergedBuffer();
    return decoder.decode(buffer);
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const merged = this._mergedBuffer();
    return merged.buffer.slice(
      merged.byteOffset,
      merged.byteOffset + merged.byteLength,
    );
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    const merged = this._mergedBuffer();
    const resolvedStart = start ?? 0;
    const resolvedEnd = end ?? merged.byteLength;
    const sliced = merged.slice(resolvedStart, resolvedEnd);
    const blob = new Blob([], { type: contentType ?? '' });
    blob._parts = [sliced];
    return blob;
  }

  private _mergedBuffer(): Uint8Array {
    if (this._parts.length === 0) {
      return new Uint8Array(0);
    }
    if (this._parts.length === 1) {
      return this._parts[0]!;
    }
    const totalSize = this.size;
    const merged = new Uint8Array(totalSize);
    let offset = 0;
    for (const part of this._parts) {
      merged.set(part, offset);
      offset += part.byteLength;
    }
    return merged;
  }
}
