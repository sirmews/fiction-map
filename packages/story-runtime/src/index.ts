// Core types
export type {
  GraphRuntimeState,
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
  Consequence,
  NodeDefinition,
  GraphErrorType,
  GraphError,
  ValidationResult,
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
  serializeState,
  deserializeState,
} from "./core/state";

// Condition evaluation
export {
  evaluateCondition,
  evaluateConditionSet,
  createComposedEvaluator,
} from "./conditions";

// Built-in condition evaluators
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
  builtinEvaluators,
} from "./conditions/builtin";

// Effect application
export {
  applyEffect,
  applyEffects,
  combineHandlers,
} from "./effects";

// Built-in effect handlers
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
  builtinHandlers,
} from "./effects/builtin";

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

// Adapter (generic graph JSON → runtime types)
export {
  parseGraph,
  determineEndings,
  type EdgeBlueprint,
  type NodeBlueprint,
  type GraphBlueprint,
  type ParsedGraph,
} from "./adapter";

// High-level runtime wrapper
export {
  GraphRuntime,
  type StepResult,
  type PathStep,
  type TraversalPath,
} from "./runtime";
