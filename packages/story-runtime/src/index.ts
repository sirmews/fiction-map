// Persistence schema version constant
export { SERIALIZATION_SCHEMA_VERSION } from "./types";

// Core types
export type {
  EntityRuntimeState,
  GraphRuntimeState,
  SerializableEntityState,
  Condition,
  ConditionSet,
  ConditionEvaluator,
  EvaluationContext,
  Effect,
  EffectHandler,
  EffectContext,
  Transition,
  TransitionAvailability,
  TransitionResult,
  TransitionTrace,
  ConditionGroup,
  ConditionScope,
  FailedCondition,
  Consequence,
  NodeDefinition,
  GraphErrorType,
  GraphError,
  ValidationResult,
  EntityTransitionReferenceError,
  EntityTransitionReferenceValidationResult,
  SerializableState,
} from "./types";

// State management
export {
  createInitialState,
  cloneState,
  mergeState,
  navigateToNode,
  backtrack,
  hasVisited,
  visitCount,
  setFlag,
  clearFlag,
  hasFlag,
  getFlag,
  setVariable,
  getVariable,
  incrementVariable,
  grantEntity,
  revokeEntity,
  ownsEntity,
  activateEntity,
  deactivateEntity,
  entityIsActive,
  unlockEntity,
  lockEntity,
  entityIsUnlocked,
  addResource,
  spendResource,
  getResource,
  serializeState,
  deserializeState,
} from "./core/state";

// Entity derivation
export {
  deriveEntityState,
  type ActiveEntityModifier,
  type EntityPrerequisiteResult,
  type DerivedEntityState,
} from "./entities/derived";

// Entity-aware transition validation
export {
  validateEntityTransitionReferences,
} from "./entities/validation";

// Condition evaluation
export {
  evaluateCondition,
  evaluateConditionSet,
  createComposedEvaluator,
} from "./conditions";

// Built-in condition evaluators (core, non-entity)
export {
  equalsEvaluator,
  notEqualsEvaluator,
  greaterThanEvaluator,
  greaterThanOrEqualEvaluator,
  lessThanEvaluator,
  lessThanOrEqualEvaluator,
  hasFlagEvaluator,
  flagEqualsEvaluator,
  visitedEvaluator,
  notVisitedEvaluator,
  currentNodeEvaluator,
  hasVariableEvaluator,
  coreBuiltinEvaluators,
} from "./conditions/builtin";

// Built-in condition evaluators (entity-aware)
export {
  hasEntityEvaluator,
  entityActiveEvaluator,
  entityUnlockedEvaluator,
  resourceAtLeastEvaluator,
  entityBuiltinEvaluators,
} from "./entities/condition-evaluators";

// Combined default evaluator map (core + entity)
export { builtinEvaluators, builtinHandlers } from "./default-bindings";

export {
  registerBuiltins,
  builtinConditionConfigs,
  builtinEffectConfigs,
} from "./builtins";

// Effect application
export {
  applyEffect,
  applyEffects,
  combineHandlers,
} from "./effects";

// Built-in effect handlers (core, non-entity)
export {
  setVariableHandler,
  deleteVariableHandler,
  incrementHandler,
  decrementHandler,
  clampHandler,
  setFlagHandler,
  clearFlagHandler,
  markVisitedHandler,
  navigateHandler,
  noOpHandler,
  setExtensionHandler,
  mergeExtensionHandler,
  coreBuiltinHandlers,
} from "./effects/builtin";

// Built-in effect handlers (entity-aware)
export {
  grantEntityHandler,
  revokeEntityHandler,
  activateEntityHandler,
  deactivateEntityHandler,
  unlockEntityHandler,
  lockEntityHandler,
  addResourceHandler,
  spendResourceHandler,
  entityBuiltinHandlers,
} from "./entities/effect-handlers";

// `builtinHandlers` (combined) is exported above via ./default-bindings

// Transition engine
export {
  checkTransitionAvailability,
  applyTransition,
  getAvailableTransitions,
  getTransitionsByAvailability,
} from "./core/transition";

// Graph validation
export {
  validateGraph,
  findReachableNodes,
  hasDanglingTransitions,
  hasUnreachableNodes,
} from "./core/validation";

// High-level runtime wrapper
export {
  GraphRuntime,
  type StepResult,
  type PathStep,
  type TraversalPath,
} from "./runtime";

// Graph definition adapter
export {
  graphDefinitionToBlueprint,
  createRuntimeFromGraph,
} from "./graph-definition";

// Blueprint types accepted by the GraphRuntime constructor
export type {
  GraphBlueprint,
  NodeBlueprint,
  EdgeBlueprint,
} from "./adapter";
