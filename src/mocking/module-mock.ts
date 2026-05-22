/**
 * Module mock registry — provides comprehensive module mocking.
 * @module mocking/module-mock
 */

import { fn } from './index.js';

const moduleRegistry = new Map<string, unknown>();

/** Helper type for the object passed to mock factory functions. */
interface MockFactoryHelpers {
  importOriginal: () => Promise<unknown>;
}

/**
 * Auto-mock an object: functions become fn(), plain objects are recursively
 * auto-mocked, and all other values (primitives, arrays, etc.) are kept as-is.
 */
export function autoMock<T extends Record<string, unknown>>(
  moduleExports: T,
): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(moduleExports)) {
    const value = moduleExports[key];
    if (typeof value === 'function') {
      result[key] = fn();
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result[key] = autoMock(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Register a mock for a module name.
 * If a factory is provided, it receives an object with an `importOriginal`
 * helper that returns the real module. If no factory is provided, an empty
 * object is used as the mock.
 */
export async function mockModule(
  moduleName: string,
  factory?: (helpers: MockFactoryHelpers) => unknown | Promise<unknown>,
): Promise<void> {
  if (factory) {
    const helpers: MockFactoryHelpers = {
      importOriginal: () => import(moduleName),
    };
    const result = await factory(helpers);
    moduleRegistry.set(moduleName, result);
  } else {
    moduleRegistry.set(moduleName, {});
  }
}

/**
 * Returns the actual module via dynamic import.
 */
export async function importActual(moduleName: string): Promise<unknown> {
  return import(moduleName);
}

/**
 * Remove the mock registration for a module.
 */
export function unmock(moduleName: string): void {
  moduleRegistry.delete(moduleName);
}

/**
 * Clear all module mocks.
 */
export function resetModules(): void {
  moduleRegistry.clear();
}

/**
 * Get the mock for a given module.
 */
export function getMockedModule(moduleName: string): unknown | undefined {
  return moduleRegistry.get(moduleName);
}
