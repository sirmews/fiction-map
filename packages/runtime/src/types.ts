/**
 * @fiction-map/runtime
 *
 * A schema-driven runtime engine for graph-based narratives, workflows, and decision trees.
 */

import type { DerivedEntityState } from "./entities/derived"

// ============================================================================
// STATE
// ============================================================================

export interface GraphRuntimeState {
  currentNodeId: string
  history: string[]
  variables: Record<string, unknown>
  flags: Record<string, boolean | string | number>
  visited: Set<string>
  entityState?: EntityRuntimeState
  extensions?: Record<string, unknown>
}

export interface EntityRuntimeState {
  owned: Set<string>
  active: Set<string>
  unlocked: Set<string>
  resources: Record<string, number>
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

export interface StateTrigger {
  id: string
  conditions: Condition[]
  effects: Effect[]
}

/**
 * State fields that can affect the result of a condition evaluation. A
 * `ConditionEvaluator` declares the subset it reads via `reads` so the runtime
 * can build a sound symbolic-state fingerprint: two states that differ only in
 * fields NO reachable condition reads are genuinely equivalent for forward
 * exploration and may be pruned; two states that differ in a field some
 * condition reads MUST NOT be pruned as equal.
 *
 * The fingerprint always includes `currentNode`; the other fields are included
 * iff some registered evaluator declares them in `reads`.
 */
export type StateField =
  | "currentNode"
  | "flags"
  | "variables"
  | "visited"
  | "history"
  | "entityOwned"
  | "entityActive"
  | "entityUnlocked"
  | "entityResources"
  | "entityExtensions"
  | "extensions"

export type ConditionEvaluator = {
  (
    state: GraphRuntimeState,
    condition: Condition,
    context?: EvaluationContext,
  ): boolean
  /**
   * State fields this evaluator reads. Used to build a sound fingerprint.
   * Defaults to `["currentNode"]` if omitted. Include `history` only if the
   * evaluator reads `state.history`; doing so disables cycle pruning (history
   * is unbounded), so enumeration then relies on depth/path bounds alone.
   */
  reads?: StateField[]
}

export interface EvaluationContext {
  registry?: unknown
  scope?: string
  derivedState?: DerivedEntityState
  [key: string]: unknown
}

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
  context?: EffectContext,
) => GraphRuntimeState

// ============================================================================
// TRANSITIONS
// ============================================================================

export interface Transition {
  id: string
  sourceNodeId: string
  targetNodeId?: string
  anchorBlockId?: string
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
  failedConditions?: FailedCondition[]
}

export interface Consequence {
  type: string
  [key: string]: unknown
}

export type ConditionGroup = "all" | "any" | "none"
export type ConditionScope = "visibility" | "requirements"

export interface FailedCondition {
  scope: ConditionScope
  group: ConditionGroup
  condition: Condition
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
  failedConditions?: FailedCondition[]
  trace?: TransitionTrace
}

// ============================================================================
// GRAPH VALIDATION
// ============================================================================

export interface ContentBlock {
  id: string
  type: "paragraph" | "header" | "image" | "video"
  text?: string
  url?: string
  level?: number
  caption?: string
  metadata?: Record<string, unknown>
}

export interface NodeDefinition {
  id: string
  type?: string
  blocks?: ContentBlock[]
  properties?: Record<string, unknown>
  autoResolve?: boolean
  enterEffects?: Effect[]
}

export type GraphErrorType =
  | "dangling-transition"
  | "unreachable-node"
  | "orphan-node"
  | "missing-property"
  | "empty-graph"
  | "missing-start-node"
  | "unknown-entity-reference"

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

export interface EntityTransitionReferenceError {
  type: "unknown-entity-reference"
  transitionId: string
  source: "condition" | "effect" | "failureEffect"
  conditionType?: string
  effectType?: string
  entityId: string
  message: string
}

export interface EntityTransitionReferenceValidationResult {
  valid: boolean
  errors: EntityTransitionReferenceError[]
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Current serialization schema version.
 *
 * Increment when `SerializableState` or `SerializableEntityState` change
 * in a backward-incompatible way (rename, type narrowing, removal,
 * semantic change). Do not increment when a new optional field is added.
 *
 * See `docs/decisions/2026-05-20-persistence-contract.md`.
 */
export const SERIALIZATION_SCHEMA_VERSION = 1 as const

export interface SerializableState {
  /** Schema version. Always equals `SERIALIZATION_SCHEMA_VERSION` on write. */
  schemaVersion: typeof SERIALIZATION_SCHEMA_VERSION
  currentNodeId: string
  history: string[]
  variables: Record<string, unknown>
  flags: Record<string, boolean | string | number>
  visited: string[]
  entityState?: SerializableEntityState
  extensions?: Record<string, unknown>
}

export interface SerializableEntityState {
  owned: string[]
  active: string[]
  unlocked: string[]
  resources: Record<string, number>
  extensions?: Record<string, unknown>
}
