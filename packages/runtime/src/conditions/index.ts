import type {
  Condition,
  ConditionEvaluator,
  ConditionSet,
  EvaluationContext,
  GraphRuntimeState,
} from "../types"
import { wasm } from "../wasm"

export function evaluateCondition(
  state: GraphRuntimeState,
  condition: Condition,
  evaluators: Map<string, ConditionEvaluator>,
  context?: EvaluationContext,
): boolean {
  return wasm.evaluateRegisteredCondition(state, condition, evaluators, context)
}

export function evaluateConditionSet(
  state: GraphRuntimeState,
  conditionSet: ConditionSet | undefined,
  evaluators: Map<string, ConditionEvaluator>,
  context?: EvaluationContext,
): boolean {
  return wasm.evaluateConditionSet(state, conditionSet, evaluators, context)
}

export function createComposedEvaluator(
  conditionSet: ConditionSet,
  evaluators: Map<string, ConditionEvaluator>,
): ConditionEvaluator {
  return (state, _condition, context) =>
    evaluateConditionSet(state, conditionSet, evaluators, context)
}
