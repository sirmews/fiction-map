import { RuntimeError } from "@fiction-map/core"
import {
  type EntityRuntimeState,
  type GraphRuntimeState,
  SERIALIZATION_SCHEMA_VERSION,
  type SerializableState,
} from "../types"
import { wasm } from "../wasm"

/**
 * Create initial state at a starting node.
 *
 * @param startNodeId - The node ID to start at
 * @param initialVariables - Optional initial variable values
 * @param initialExtensions - Optional initial extension data
 */
export function createInitialState(
  startNodeId: string,
  initialVariables?: Record<string, unknown>,
  initialExtensions?: Record<string, unknown>,
  initialEntityState?: EntityRuntimeState,
): GraphRuntimeState {
  return wasm.createInitialState(
    startNodeId,
    initialVariables,
    initialExtensions,
    initialEntityState,
  ) as GraphRuntimeState
}

/**
 * Clone state (deep copy).
 *
 * Use before any mutation. Guarantees immutability.
 * Sets are cloned, objects are shallow-copied.
 */
export function cloneState(state: GraphRuntimeState): GraphRuntimeState {
  return wasm.cloneState(state) as GraphRuntimeState
}

/**
 * Merge partial state updates into a cloned state.
 *
 * Returns new state with updates applied.
 * Arrays and Sets are replaced, not merged.
 */
export function mergeState(
  state: GraphRuntimeState,
  updates: Partial<GraphRuntimeState>,
): GraphRuntimeState {
  return wasm.mergeState(state, updates) as GraphRuntimeState
}

/**
 * Navigate to a new node.
 *
 * Updates currentNodeId, adds to history, and marks as visited.
 * Returns cloned state.
 */
export function navigateToNode(state: GraphRuntimeState, nodeId: string): GraphRuntimeState {
  return wasm.navigateToNode(state, nodeId) as GraphRuntimeState
}

/**
 * Go back to the previous node in history.
 *
 * Returns null if there's no history to go back to.
 */
export function backtrack(state: GraphRuntimeState): GraphRuntimeState | null {
  return wasm.backtrack(state) as GraphRuntimeState | null
}

/**
 * Check if a node has been visited.
 */
export function hasVisited(state: GraphRuntimeState, nodeId: string): boolean {
  return wasm.hasVisited(state, nodeId)
}

/**
 * Get the number of times a node has been visited.
 * Note: This counts based on history + current position.
 */
export function visitCount(state: GraphRuntimeState, nodeId: string): number {
  return wasm.visitCount(state, nodeId)
}

/**
 * Set a flag value.
 */
export function setFlag(
  state: GraphRuntimeState,
  key: string,
  value: boolean | string | number,
): GraphRuntimeState {
  return wasm.setFlag(state, key, value) as GraphRuntimeState
}

/**
 * Clear a flag.
 */
export function clearFlag(state: GraphRuntimeState, key: string): GraphRuntimeState {
  return wasm.clearFlag(state, key) as GraphRuntimeState
}

/**
 * Check if a flag exists.
 */
export function hasFlag(state: GraphRuntimeState, key: string): boolean {
  return wasm.hasFlag(state, key)
}

/**
 * Get a flag value.
 */
export function getFlag(
  state: GraphRuntimeState,
  key: string,
): boolean | string | number | undefined {
  return wasm.getFlag(state, key) as boolean | string | number | undefined
}

/**
 * Set a variable value.
 */
export function setVariable(
  state: GraphRuntimeState,
  key: string,
  value: unknown,
): GraphRuntimeState {
  return wasm.setVariable(state, key, value) as GraphRuntimeState
}

/**
 * Get a variable value.
 */
export function getVariable(state: GraphRuntimeState, key: string): unknown {
  return wasm.getVariable(state, key)
}

/**
 * Increment a numeric variable.
 *
 * Returns state unchanged if variable is not a number.
 */
export function incrementVariable(
  state: GraphRuntimeState,
  key: string,
  delta: number,
): GraphRuntimeState {
  return wasm.incrementVariable(state, key, delta) as GraphRuntimeState
}

export function grantEntity(state: GraphRuntimeState, entityId: string): GraphRuntimeState {
  return wasm.grantEntity(state, entityId) as GraphRuntimeState
}

export function revokeEntity(state: GraphRuntimeState, entityId: string): GraphRuntimeState {
  return wasm.revokeEntity(state, entityId) as GraphRuntimeState
}

export function ownsEntity(state: GraphRuntimeState, entityId: string): boolean {
  return wasm.ownsEntity(state, entityId)
}

export function activateEntity(state: GraphRuntimeState, entityId: string): GraphRuntimeState {
  return wasm.activateEntity(state, entityId) as GraphRuntimeState
}

export function deactivateEntity(state: GraphRuntimeState, entityId: string): GraphRuntimeState {
  return wasm.deactivateEntity(state, entityId) as GraphRuntimeState
}

export function entityIsActive(state: GraphRuntimeState, entityId: string): boolean {
  return wasm.entityIsActive(state, entityId)
}

export function unlockEntity(state: GraphRuntimeState, entityId: string): GraphRuntimeState {
  return wasm.unlockEntity(state, entityId) as GraphRuntimeState
}

export function lockEntity(state: GraphRuntimeState, entityId: string): GraphRuntimeState {
  return wasm.lockEntity(state, entityId) as GraphRuntimeState
}

export function entityIsUnlocked(state: GraphRuntimeState, entityId: string): boolean {
  return wasm.entityIsUnlocked(state, entityId)
}

export function addResource(
  state: GraphRuntimeState,
  key: string,
  amount: number,
): GraphRuntimeState {
  return wasm.addResource(state, key, amount) as GraphRuntimeState
}

export function spendResource(
  state: GraphRuntimeState,
  key: string,
  amount: number,
  options?: { allowNegative?: boolean; clampToZero?: boolean },
): GraphRuntimeState {
  return wasm.spendResource(state, key, amount, options) as GraphRuntimeState
}

export function getResource(state: GraphRuntimeState, key: string): number {
  return wasm.getResource(state, key)
}

/**
 * Convert state to a JSON-serializable format.
 *
 * Sets are converted to arrays. Emits the current `schemaVersion` so
 * consumers can migrate old saves. See `docs/decisions/2026-05-20-persistence-contract.md`.
 */
export function serializeState(state: GraphRuntimeState): SerializableState {
  return wasm.serializeState(state, SERIALIZATION_SCHEMA_VERSION) as SerializableState
}

/**
 * Restore state from a serialized format.
 *
 * Arrays are converted back to Sets. Unknown `schemaVersion` values are
 * rejected with a descriptive error; the consumer must migrate the data
 * to the current version before calling this function.
 */
export function deserializeState(data: SerializableState): GraphRuntimeState {
  return wasm.deserializeState(
    data,
    SERIALIZATION_SCHEMA_VERSION,
    unsupportedSaveVersion,
  ) as GraphRuntimeState
}

function unsupportedSaveVersion(schemaVersion: unknown): RuntimeError {
  return new RuntimeError(
    `Unsupported save schemaVersion: ${schemaVersion}. ` +
      `Current version is ${SERIALIZATION_SCHEMA_VERSION}. ` +
      "Migrate the data before calling deserializeState.",
    "ERR_RUNTIME_SCHEMA_MISMATCH",
  )
}
