import type {
  ConditionEvaluator,
  EffectContext,
  EffectHandler,
  EvaluationContext,
  GraphRuntimeState,
  Transition,
  TransitionAvailability,
  TransitionResult,
} from "../types"
import { wasm } from "../wasm"

type CombinedContext = EvaluationContext & EffectContext

export function checkTransitionAvailability(
  state: GraphRuntimeState,
  transition: Transition,
  evaluators: Map<string, ConditionEvaluator>,
  context?: CombinedContext,
): TransitionAvailability {
  return wasm.checkTransitionAvailability(state, transition, evaluators, context)
}

export function applyTransition(
  state: GraphRuntimeState,
  transition: Transition,
  evaluators: Map<string, ConditionEvaluator>,
  handlers: Map<string, EffectHandler>,
  context?: CombinedContext,
): TransitionResult {
  return wasm.applyTransition(state, transition, evaluators, handlers, context)
}

export function getAvailableTransitions(
  state: GraphRuntimeState,
  transitions: Transition[],
  evaluators: Map<string, ConditionEvaluator>,
  context?: CombinedContext,
): Transition[] {
  return wasm.groupTransitions(state, transitions, evaluators, context, true)
}

export function getTransitionsByAvailability(
  state: GraphRuntimeState,
  transitions: Transition[],
  evaluators: Map<string, ConditionEvaluator>,
  context?: CombinedContext,
): {
  available: Transition[]
  blocked: Transition[]
  hidden: Transition[]
} {
  return wasm.groupTransitions(state, transitions, evaluators, context, false)
}
