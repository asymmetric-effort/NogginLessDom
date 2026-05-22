/**
 * Web API utilities and re-exports for DOM simulation.
 * @module dom/web-apis
 */

import { Buffer } from 'node:buffer';

export { FormData } from './form-data.js';
export { Headers } from './headers.js';

/**
 * TextEncoder — re-exported from globalThis.
 */
export const NogginTextEncoder: typeof globalThis.TextEncoder =
  globalThis.TextEncoder;

/**
 * TextDecoder — re-exported from globalThis.
 */
export const NogginTextDecoder: typeof globalThis.TextDecoder =
  globalThis.TextDecoder;

/**
 * Blob — re-exported from globalThis.
 */
export const NogginBlob: typeof globalThis.Blob = globalThis.Blob;

/**
 * Decodes a base64-encoded string into a binary string.
 */
export function atob(data: string): string {
  return Buffer.from(data, 'base64').toString('binary');
}

/**
 * Encodes a binary string into base64.
 */
export function btoa(data: string): string {
  return Buffer.from(data, 'binary').toString('base64');
}

/**
 * structuredClone — re-exported from globalThis.
 */
export const nogginStructuredClone: typeof globalThis.structuredClone =
  globalThis.structuredClone;

/**
 * queueMicrotask — re-exported from globalThis.
 */
export const nogginQueueMicrotask: typeof globalThis.queueMicrotask =
  globalThis.queueMicrotask;
