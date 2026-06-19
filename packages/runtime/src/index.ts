// Persistence schema version constant

export {
  builtinConditionConfigs,
  builtinEffectConfigs,
  registerBuiltins,
} from "./builtins"
// Condition evaluation
export {
  createComposedEvaluator,
  evaluateCondition,
  evaluateConditionSet,
} from "./conditions"
// Built-in condition evaluators (core, non-entity)
export {
  coreBuiltinEvaluators,
  currentNodeEvaluator,
  equalsEvaluator,
  flagEqualsEvaluator,
  greaterThanEvaluator,
  greaterThanOrEqualEvaluator,
  hasFlagEvaluator,
  hasVariableEvaluator,
  lessThanEvaluator,
  lessThanOrEqualEvaluator,
  notEqualsEvaluator,
  notVisitedEvaluator,
  visitedEvaluator,
} from "./conditions/builtin"
// State management
export {
  activateEntity,
  addResource,
  backtrack,
  clearFlag,
  cloneState,
  createInitialState,
  deactivateEntity,
  deserializeState,
  entityIsActive,
  entityIsUnlocked,
  getFlag,
  getResource,
  getVariable,
  grantEntity,
  hasFlag,
  hasVisited,
  incrementVariable,
  lockEntity,
  mergeState,
  navigateToNode,
  ownsEntity,
  revokeEntity,
  serializeState,
  setFlag,
  setVariable,
  spendResource,
  unlockEntity,
  visitCount,
} from "./core/state"
// Combined default evaluator map (core + entity)
export { builtinEvaluators, builtinHandlers } from "./default-bindings"
// Effect application
export {
  applyEffect,
  applyEffects,
  combineHandlers,
} from "./effects"
// Built-in effect handlers (core, non-entity)
export {
  clampHandler,
  clearFlagHandler,
  coreBuiltinHandlers,
  decrementHandler,
  deleteVariableHandler,
  incrementHandler,
  markVisitedHandler,
  mergeExtensionHandler,
  navigateHandler,
  noOpHandler,
  setExtensionHandler,
  setFlagHandler,
  setVariableHandler,
} from "./effects/builtin"

// Built-in condition evaluators (entity-aware)
export {
  entityActiveEvaluator,
  entityBuiltinEvaluators,
  entityUnlockedEvaluator,
  hasEntityEvaluator,
  resourceAtLeastEvaluator,
} from "./entities/condition-evaluators"
// Entity derivation
export {
  type ActiveEntityModifier,
  type DerivedEntityState,
  deriveEntityState,
  type EntityPrerequisiteResult,
} from "./entities/derived"
// Built-in effect handlers (entity-aware)
export {
  activateEntityHandler,
  addResourceHandler,
  deactivateEntityHandler,
  entityBuiltinHandlers,
  grantEntityHandler,
  lockEntityHandler,
  revokeEntityHandler,
  spendResourceHandler,
  unlockEntityHandler,
} from "./entities/effect-handlers"
// Entity-aware transition validation
export { validateEntityTransitionReferences } from "./entities/validation"
// Core types
export type {
  Condition,
  ConditionEvaluator,
  ConditionGroup,
  ConditionScope,
  ConditionSet,
  Consequence,
  Effect,
  EffectContext,
  EffectHandler,
  EntityRuntimeState,
  EntityTransitionReferenceError,
  EntityTransitionReferenceValidationResult,
  EvaluationContext,
  FailedCondition,
  GraphError,
  GraphErrorType,
  GraphRuntimeState,
  NodeDefinition,
  SerializableEntityState,
  SerializableState,
  Transition,
  TransitionAvailability,
  TransitionResult,
  TransitionTrace,
  ValidationResult,
} from "./types"
export { SERIALIZATION_SCHEMA_VERSION } from "./types"

// `builtinHandlers` (combined) is exported above via ./default-bindings

// Export runtime error for convenience
export { RuntimeError } from "@fiction-map/core"
// Blueprint types accepted by the GraphRuntime constructor
export type {
  EdgeBlueprint,
  GraphBlueprint,
  NodeBlueprint,
} from "./adapter"
// Transition engine
export {
  applyTransition,
  checkTransitionAvailability,
  getAvailableTransitions,
  getTransitionsByAvailability,
} from "./core/transition"
// Graph validation
export {
  findReachableNodes,
  hasDanglingTransitions,
  hasUnreachableNodes,
  validateGraph,
} from "./core/validation"
// Graph definition adapter
export {
  createRuntimeFromGraph,
  graphDefinitionToBlueprint,
} from "./graph-definition"
// High-level runtime wrapper
export {
  GraphRuntime,
  type PathStep,
  type StepResult,
  type TraversalPath,
} from "./runtime"
// Semantic validation
export {
  type SemanticError,
  type SemanticValidationOptions,
  type SemanticValidationResult,
  SymbolicState,
  solveGraphSemantics,
  validateGraphSemantics,
} from "./validation"
