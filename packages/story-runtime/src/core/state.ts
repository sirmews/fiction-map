import type {
  GraphRuntimeState,
  SerializableState,
} from "../types";

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
  initialExtensions?: Record<string, unknown>
): GraphRuntimeState {
  return {
    currentNodeId: startNodeId,
    history: [],
    variables: initialVariables ? { ...initialVariables } : {},
    flags: {},
    visited: new Set([startNodeId]),
    extensions: initialExtensions ? { ...initialExtensions } : undefined,
  };
}

/**
 * Clone state (deep copy).
 * 
 * Use before any mutation. Guarantees immutability.
 * Sets are cloned, objects are shallow-copied.
 */
export function cloneState(state: GraphRuntimeState): GraphRuntimeState {
  return {
    currentNodeId: state.currentNodeId,
    history: [...state.history],
    variables: { ...state.variables },
    flags: { ...state.flags },
    visited: new Set(state.visited),
    extensions: state.extensions ? { ...state.extensions } : undefined,
  };
}

/**
 * Merge partial state updates into a cloned state.
 * 
 * Returns new state with updates applied.
 * Arrays and Sets are replaced, not merged.
 */
export function mergeState(
  state: GraphRuntimeState,
  updates: Partial<GraphRuntimeState>
): GraphRuntimeState {
  const cloned = cloneState(state);
  
  if (updates.currentNodeId !== undefined) {
    cloned.currentNodeId = updates.currentNodeId;
  }
  
  if (updates.history !== undefined) {
    cloned.history = [...updates.history];
  }
  
  if (updates.variables !== undefined) {
    cloned.variables = { ...cloned.variables, ...updates.variables };
  }
  
  if (updates.flags !== undefined) {
    cloned.flags = { ...cloned.flags, ...updates.flags };
  }
  
  if (updates.visited !== undefined) {
    cloned.visited = new Set(updates.visited);
  }
  
  if (updates.extensions !== undefined) {
    cloned.extensions = { ...cloned.extensions, ...updates.extensions };
  }
  
  return cloned;
}

/**
 * Navigate to a new node.
 * 
 * Updates currentNodeId, adds to history, and marks as visited.
 * Returns cloned state.
 */
export function navigateToNode(
  state: GraphRuntimeState,
  nodeId: string
): GraphRuntimeState {
  const cloned = cloneState(state);
  cloned.history = [...cloned.history, cloned.currentNodeId];
  cloned.currentNodeId = nodeId;
  cloned.visited.add(nodeId);
  return cloned;
}

/**
 * Go back to the previous node in history.
 * 
 * Returns null if there's no history to go back to.
 */
export function backtrack(state: GraphRuntimeState): GraphRuntimeState | null {
  if (state.history.length === 0) {
    return null;
  }
  
  const cloned = cloneState(state);
  const previousNodeId = cloned.history.pop()!;
  cloned.currentNodeId = previousNodeId;
  return cloned;
}

/**
 * Check if a node has been visited.
 */
export function hasVisited(state: GraphRuntimeState, nodeId: string): boolean {
  return state.visited.has(nodeId);
}

/**
 * Get the number of times a node has been visited.
 * Note: This counts based on history + current position.
 */
export function visitCount(state: GraphRuntimeState, nodeId: string): number {
  let count = state.currentNodeId === nodeId ? 1 : 0;
  count += state.history.filter((id: string) => id === nodeId).length;
  return count;
}

/**
 * Set a flag value.
 */
export function setFlag(
  state: GraphRuntimeState,
  key: string,
  value: boolean | string | number
): GraphRuntimeState {
  const cloned = cloneState(state);
  cloned.flags[key] = value;
  return cloned;
}

/**
 * Clear a flag.
 */
export function clearFlag(state: GraphRuntimeState, key: string): GraphRuntimeState {
  const cloned = cloneState(state);
  delete cloned.flags[key];
  return cloned;
}

/**
 * Check if a flag exists.
 */
export function hasFlag(state: GraphRuntimeState, key: string): boolean {
  return key in state.flags;
}

/**
 * Get a flag value.
 */
export function getFlag(
  state: GraphRuntimeState,
  key: string
): boolean | string | number | undefined {
  return state.flags[key];
}

/**
 * Set a variable value.
 */
export function setVariable(
  state: GraphRuntimeState,
  key: string,
  value: unknown
): GraphRuntimeState {
  const cloned = cloneState(state);
  cloned.variables[key] = value;
  return cloned;
}

/**
 * Get a variable value.
 */
export function getVariable(state: GraphRuntimeState, key: string): unknown {
  return state.variables[key];
}

/**
 * Increment a numeric variable.
 * 
 * Returns state unchanged if variable is not a number.
 */
export function incrementVariable(
  state: GraphRuntimeState,
  key: string,
  delta: number
): GraphRuntimeState {
  const current = state.variables[key];
  if (typeof current !== "number") {
    return state;
  }
  const cloned = cloneState(state);
  cloned.variables[key] = current + delta;
  return cloned;
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Convert state to a JSON-serializable format.
 * 
 * Sets are converted to arrays.
 */
export function serializeState(state: GraphRuntimeState): SerializableState {
  return {
    currentNodeId: state.currentNodeId,
    history: [...state.history],
    variables: { ...state.variables },
    flags: { ...state.flags },
    visited: [...state.visited],
    extensions: state.extensions ? { ...state.extensions } : undefined,
  };
}

/**
 * Restore state from a serialized format.
 * 
 * Arrays are converted back to Sets.
 */
export function deserializeState(data: SerializableState): GraphRuntimeState {
  return {
    currentNodeId: data.currentNodeId,
    history: [...data.history],
    variables: { ...data.variables },
    flags: { ...data.flags },
    visited: new Set(data.visited),
    extensions: data.extensions ? { ...data.extensions } : undefined,
  };
}
