import type {
  GraphRuntimeState,
  Transition,
  TransitionAvailability,
  TransitionResult,
  TransitionTrace,
  Consequence,
  ConditionEvaluator,
  EffectHandler,
  EvaluationContext,
  EffectContext,
} from "../types";
import { evaluateConditionSet } from "../conditions";
import { applyEffects } from "../effects";
import { cloneState, navigateToNode } from "./state";

type CombinedContext = EvaluationContext & EffectContext;

/**
 * Check if a transition is available.
 * 
 * Evaluates both visibility and requirements conditions.
 * 
 * @param state - Current runtime state
 * @param transition - Transition to check
 * @param evaluators - Map of condition type → evaluator function
 * @param context - Optional evaluation context
 * @returns TransitionAvailability with allowed, visible, and reason
 */
export function checkTransitionAvailability(
  state: GraphRuntimeState,
  transition: Transition,
  evaluators: Map<string, ConditionEvaluator>,
  context?: CombinedContext
): TransitionAvailability {
  const trace: TransitionTrace = {
    conditionsEvaluated: [],
    effectsApplied: [],
  };
  
  const traceContext = { ...context, trace };
  
  const visible = evaluateConditionSet(
    state,
    transition.visibility,
    evaluators,
    traceContext
  );
  
  if (!visible) {
    return {
      allowed: false,
      visible: false,
      reason: "Transition is not visible",
    };
  }
  
  const allowed = evaluateConditionSet(
    state,
    transition.requirements,
    evaluators,
    traceContext
  );
  
  if (!allowed) {
    return {
      allowed: false,
      visible: true,
      reason: "Requirements not met",
    };
  }
  
  return {
    allowed: true,
    visible: true,
  };
}

/**
 * Execute a transition.
 * 
 * 1. Check requirements
 * 2. Apply effects (success or failure)
 * 3. Navigate to target
 * 4. Return traceable result
 * 
 * @param state - Current runtime state
 * @param transition - Transition to execute
 * @param evaluators - Map of condition type → evaluator function
 * @param handlers - Map of effect type → handler function
 * @param context - Optional context for evaluation and effects
 * @returns TransitionResult with new state, consequence, and trace
 */
export function applyTransition(
  state: GraphRuntimeState,
  transition: Transition,
  evaluators: Map<string, ConditionEvaluator>,
  handlers: Map<string, EffectHandler>,
  context?: CombinedContext
): TransitionResult {
  const trace: TransitionTrace = {
    conditionsEvaluated: [],
    effectsApplied: [],
  };
  
  const traceContext = { ...context, trace };
  
  const visibility = evaluateConditionSet(
    state,
    transition.visibility,
    evaluators,
    traceContext
  );
  
  if (!visibility) {
    return {
      state,
      shouldNavigate: false,
      success: false,
      failureReason: "Transition is not visible",
      trace,
    };
  }
  
  const requirementsMet = evaluateConditionSet(
    state,
    transition.requirements,
    evaluators,
    traceContext
  );
  
  const success = requirementsMet;
  const effects = success ? transition.effects : transition.failureEffects;
  const targetNodeId = success
    ? transition.targetNodeId
    : transition.failureTargetNodeId;
  
  let newState = cloneState(state);
  let consequence: Consequence | undefined;
  
  if (effects && effects.length > 0) {
    newState = applyEffects(newState, effects, handlers, traceContext);
    
    for (const effect of effects) {
      trace.effectsApplied.push({
        effect,
        handler: effect.type,
      });
    }
    
    if (effects.length === 1) {
      const effect = effects[0]
      consequence = {
        ...effect,
      }
    } else {
      consequence = {
        type: "multi",
        count: effects.length,
      };
    }
  }
  
  const shouldNavigate = targetNodeId !== undefined;
  
  if (shouldNavigate && targetNodeId) {
    newState = navigateToNode(newState, targetNodeId);
  }
  
  return {
    state: newState,
    consequence,
    shouldNavigate,
    nextNodeId: targetNodeId,
    success,
    failureReason: success ? undefined : "Requirements not met",
    trace,
  };
}

/**
 * Get all available transitions from the current node.
 * 
 * A transition is "available" if it is both visible AND allowed.
 * Use `getTransitionsByAvailability` to get grouped by status.
 * 
 * @param state - Current runtime state
 * @param transitions - All transitions in the graph
 * @param evaluators - Map of condition type → evaluator function
 * @param context - Optional evaluation context
 * @returns Array of transitions that are available from the current node
 */
export function getAvailableTransitions(
  state: GraphRuntimeState,
  transitions: Transition[],
  evaluators: Map<string, ConditionEvaluator>,
  context?: CombinedContext
): Transition[] {
  return transitions.filter(transition => {
    if (transition.sourceNodeId !== state.currentNodeId) {
      return false;
    }
    
    const availability = checkTransitionAvailability(
      state,
      transition,
      evaluators,
      context
    );
    
    return availability.visible && availability.allowed;
  });
}

/**
 * Get transitions grouped by availability status.
 * 
 * @param state - Current runtime state
 * @param transitions - All transitions in the graph
 * @param evaluators - Map of condition type → evaluator function
 * @param context - Optional evaluation context
 * @returns Object with available, blocked, and hidden transitions
 */
export function getTransitionsByAvailability(
  state: GraphRuntimeState,
  transitions: Transition[],
  evaluators: Map<string, ConditionEvaluator>,
  context?: CombinedContext
): {
  available: Transition[];
  blocked: Transition[];
  hidden: Transition[];
} {
  const available: Transition[] = [];
  const blocked: Transition[] = [];
  const hidden: Transition[] = [];
  
  for (const transition of transitions) {
    if (transition.sourceNodeId !== state.currentNodeId) {
      continue;
    }
    
    const availability = checkTransitionAvailability(
      state,
      transition,
      evaluators,
      context
    );
    
    if (!availability.visible) {
      hidden.push(transition);
    } else if (!availability.allowed) {
      blocked.push(transition);
    } else {
      available.push(transition);
    }
  }
  
  return { available, blocked, hidden };
}
