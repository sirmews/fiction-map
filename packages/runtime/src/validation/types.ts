export interface SemanticValidationOptions {
  maxSteps?: number // Safety limit to prevent infinite loops (default 100)
  terminalResources?: Record<string, { min?: number; max?: number }> // e.g., { health: { min: 1 } }
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
