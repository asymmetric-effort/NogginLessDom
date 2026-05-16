/**
 * Module mock registry — provides comprehensive module mocking.
 * @module mocking/module-mock
 */

const moduleRegistry = new Map<string, unknown>();

/**
 * Register a mock for a module name.
 * If no factory is provided, an empty object is used as the mock.
 */
export async function mockModule(
  moduleName: string,
  factory?: () => unknown | Promise<unknown>,
): Promise<void> {
  if (factory) {
    const result = await factory();
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
