/**
 * @fiction-map/runtime
 * 
 * A schema-driven runtime engine for graph-based narratives, workflows, and decision trees.
 */

// ============================================================================
// STATE
// ============================================================================

export interface GraphRuntimeState {
  currentNodeId: string
  history: string[]
  variables: Record<string, unknown>
  flags: Record<string, boolean | string | number>
  visited: Set<string>
  extensions?: Record<string, unknown>
}

// ============================================================================
// CONDITIONS
// ============================================================================

export interface Condition {
  type: string
  [key: string]: unknown
}

export interface ConditionSet {
  all?: Condition[]
  any?: Condition[]
  none?: Condition[]
}

export interface EvaluationContext {
  registry?: unknown
  scope?: string
  [key: string]: unknown
}

export type ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
  context?: EvaluationContext
) => boolean

// ============================================================================
// EFFECTS
// ============================================================================

export interface Effect {
  type: string
  [key: string]: unknown
}

export interface EffectContext {
  registry?: unknown
  scope?: string
  [key: string]: unknown
}

export type EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
  context?: EffectContext
) => GraphRuntimeState

// ============================================================================
// TRANSITIONS
// ============================================================================

export interface Transition {
  id: string
  sourceNodeId: string
  targetNodeId?: string
  requirements?: ConditionSet
  visibility?: ConditionSet
  effects?: Effect[]
  failureEffects?: Effect[]
  failureTargetNodeId?: string
  label?: string
  metadata?: Record<string, unknown>
}

export interface TransitionAvailability {
  allowed: boolean
  visible: boolean
  reason?: string
}

export interface Consequence {
  type: string
  [key: string]: unknown
}

export interface TransitionTrace {
  conditionsEvaluated: Array<{
    condition: Condition
    result: boolean
    evaluator: string
  }>
  effectsApplied: Array<{
    effect: Effect
    handler: string
  }>
}

export interface TransitionResult {
  state: GraphRuntimeState
  consequence?: Consequence
  shouldNavigate: boolean
  nextNodeId?: string
  success: boolean
  failureReason?: string
  trace?: TransitionTrace
}

// ============================================================================
// GRAPH VALIDATION
// ============================================================================

export interface NodeDefinition {
  id: string
  type?: string
  properties?: Record<string, unknown>
}

export type GraphErrorType =
  | "dangling-transition"
  | "unreachable-node"
  | "orphan-node"
  | "missing-property"
  | "empty-graph"
  | "missing-start-node"

export interface GraphError {
  type: GraphErrorType
  nodeId?: string
  transitionId?: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: GraphError[]
  reachableNodes: Set<string>
}

// ============================================================================
// SERIALIZATION
// ============================================================================

export interface SerializableState {
  currentNodeId: string
  history: string[]
  variables: Record<string, unknown>
  flags: Record<string, boolean | string | number>
  visited: string[]
  extensions?: Record<string, unknown>
}
