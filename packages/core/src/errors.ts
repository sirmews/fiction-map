/**
 * Base error class for all Fiction Map errors.
 * Uses a `code` string discriminator for cross-realm safe `catch` checks.
 */
export class FictionMapError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = this.constructor.name
    // Maintain prototype chain for V8
    Object.setPrototypeOf(this, FictionMapError.prototype)
  }
}

/**
 * Thrown when there is an issue with the ProjectRegistry, such as duplicate IDs.
 */
export class RegistryError extends FictionMapError {
  constructor(message: string, code: string = "ERR_REGISTRY") {
    super(message, code)
    Object.setPrototypeOf(this, RegistryError.prototype)
  }
}

/**
 * Thrown when the GraphRuntime encounters an execution error.
 */
export class RuntimeError extends FictionMapError {
  constructor(message: string, code: string = "ERR_RUNTIME") {
    super(message, code)
    Object.setPrototypeOf(this, RuntimeError.prototype)
  }
}
