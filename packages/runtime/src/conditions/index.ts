import type {
  GraphRuntimeState,
  Condition,
  ConditionSet,
  ConditionEvaluator,
  EvaluationContext,
} from "../types";

/**
 * Evaluate a single condition using the provided evaluators.
 * 
 * @param state - Current runtime state
 * @param condition - Condition to evaluate
 * @param evaluators - Map of condition type → evaluator function
 * @param context - Optional evaluation context
 * @returns boolean result of evaluation
 */
export function evaluateCondition(
  state: GraphRuntimeState,
  condition: Condition,
  evaluators: Map<string, ConditionEvaluator>,
  context?: EvaluationContext
): boolean {
  const evaluator = evaluators.get(condition.type);
  
  if (!evaluator) {
    console.warn(`No evaluator registered for condition type: ${condition.type}`);
    return false;
  }
  
  return evaluator(state, condition, context);
}

/**
 * Evaluate a condition set with all/any/none composition.
 * 
 * - all: All conditions must be true (AND)
 * - any: At least one condition must be true (OR)
 * - none: No conditions must be true (NOR)
 * 
 * Multiple groups can be specified. If multiple groups are present,
 * they are combined with AND (all groups must pass).
 * 
 * @param state - Current runtime state
 * @param conditionSet - Condition set to evaluate
 * @param evaluators - Map of condition type → evaluator function
 * @param context - Optional evaluation context
 * @returns boolean result of evaluation
 */
export function evaluateConditionSet(
  state: GraphRuntimeState,
  conditionSet: ConditionSet | undefined,
  evaluators: Map<string, ConditionEvaluator>,
  context?: EvaluationContext
): boolean {
  if (!conditionSet) {
    return true;
  }
  
  const { all, any, none } = conditionSet;
  
  // If no conditions specified, pass
  if (!all?.length && !any?.length && !none?.length) {
    return true;
  }
  
  // Evaluate 'all' group (AND)
  if (all && all.length > 0) {
    const allPassed = all.every(condition =>
      evaluateCondition(state, condition, evaluators, context)
    );
    if (!allPassed) {
      return false;
    }
  }
  
  // Evaluate 'any' group (OR)
  if (any && any.length > 0) {
    const anyPassed = any.some(condition =>
      evaluateCondition(state, condition, evaluators, context)
    );
    if (!anyPassed) {
      return false;
    }
  }
  
  // Evaluate 'none' group (NOR)
  if (none && none.length > 0) {
    const nonePassed = none.every(condition =>
      !evaluateCondition(state, condition, evaluators, context)
    );
    if (!nonePassed) {
      return false;
    }
  }
  
  return true;
}

/**
 * Create a composed evaluator from a condition set.
 * 
 * Useful when you need to pass a single evaluator function
 * that evaluates multiple conditions.
 */
export function createComposedEvaluator(
  conditionSet: ConditionSet,
  evaluators: Map<string, ConditionEvaluator>
): ConditionEvaluator {
  return (state, _condition, context) => {
    return evaluateConditionSet(state, conditionSet, evaluators, context);
  };
}
