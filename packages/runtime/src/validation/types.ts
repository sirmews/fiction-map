export interface SemanticValidationOptions {
  maxSteps?: number // Safety limit to prevent infinite loops (default 100)
  terminalResources?: Record<string, { min?: number; max?: number }> // e.g., { health: { min: 1 } }
  /**
   * Node id treated as a losing ending: paths ending here are not counted as
   * winnable, and reaching it mid-path is reported as an unwinnable path.
   * Default "death".
   */
  deathNodeId?: string
  /**
   * Key under `entityState.resources` that tracks survival. A value <= 0 after
   * a transition is reported as an unwinnable path, and decreases across a
   * cycle are reported as an infinite-drain-loop. Default "health".
   */
  resourceKey?: string
  /**
   * Value assumed for `resourceKey` when the attribute is absent from state,
   * used by the infinite-drain-loop comparison. Default 100.
   */
  defaultResourceValue?: number
}

export interface SemanticError {
  type: "dead-end-node" | "unwinnable-path" | "infinite-drain-loop"
  nodeId: string
  message: string
  path: string[] // Sequence of transition IDs leading to the error
}

export interface SemanticValidationResult {
  valid: boolean
  errors: SemanticError[]
  winnablePathsCount: number
}
