import { evaluateCondition } from "../conditions"
import { applyEffects } from "../effects"
import type {
  Condition,
  ConditionEvaluator,
  ConditionScope,
  ConditionSet,
  Consequence,
  EffectContext,
  EffectHandler,
  EvaluationContext,
  FailedCondition,
  GraphRuntimeState,
  Transition,
  TransitionAvailability,
  TransitionResult,
  TransitionTrace,
} from "../types"
import { cloneState, navigateToNode } from "./state"

type CombinedContext = EvaluationContext & EffectContext

interface ConditionEvaluation {
  passed: boolean
  failedConditions: FailedCondition[]
}

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
  context?: CombinedContext,
): TransitionAvailability {
  const trace: TransitionTrace = {
    conditionsEvaluated: [],
    effectsApplied: [],
  }

  const traceContext = { ...context, trace }

  const visibility = evaluateTransitionConditions(
    state,
    transition.visibility,
    evaluators,
    "visibility",
    traceContext,
  )

  if (!visibility.passed) {
    return {
      allowed: false,
      visible: false,
      reason: "Transition is not visible",
      failedConditions: visibility.failedConditions,
    }
  }

  const requirements = evaluateTransitionConditions(
    state,
    transition.requirements,
    evaluators,
    "requirements",
    traceContext,
  )

  if (!requirements.passed) {
    return {
      allowed: false,
      visible: true,
      reason: "Requirements not met",
      failedConditions: requirements.failedConditions,
    }
  }

  return {
    allowed: true,
    visible: true,
  }
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
  context?: CombinedContext,
): TransitionResult {
  const trace: TransitionTrace = {
    conditionsEvaluated: [],
    effectsApplied: [],
  }

  const traceContext = { ...context, trace }

  const visibility = evaluateTransitionConditions(
    state,
    transition.visibility,
    evaluators,
    "visibility",
    traceContext,
  )

  if (!visibility.passed) {
    return {
      state,
      shouldNavigate: false,
      success: false,
      failureReason: "Transition is not visible",
      failedConditions: visibility.failedConditions,
      trace,
    }
  }

  const requirements = evaluateTransitionConditions(
    state,
    transition.requirements,
    evaluators,
    "requirements",
    traceContext,
  )

  const success = requirements.passed
  const effects = success ? transition.effects : transition.failureEffects
  const targetNodeId = success ? transition.targetNodeId : transition.failureTargetNodeId

  let newState = cloneState(state)
  let consequence: Consequence | undefined

  if (effects && effects.length > 0) {
    newState = applyEffects(newState, effects, handlers, traceContext)

    for (const effect of effects) {
      trace.effectsApplied.push({
        effect,
        handler: effect.type,
      })
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
      }
    }
  }

  const shouldNavigate = targetNodeId !== undefined

  if (shouldNavigate && targetNodeId) {
    newState = navigateToNode(newState, targetNodeId)
  }

  return {
    state: newState,
    consequence,
    shouldNavigate,
    nextNodeId: targetNodeId,
    success,
    failureReason: success ? undefined : "Requirements not met",
    failedConditions: success ? undefined : requirements.failedConditions,
    trace,
  }
}

function evaluateTransitionConditions(
  state: GraphRuntimeState,
  conditionSet: ConditionSet | undefined,
  evaluators: Map<string, ConditionEvaluator>,
  scope: ConditionScope,
  context?: EvaluationContext,
): ConditionEvaluation {
  if (!conditionSet) {
    return { passed: true, failedConditions: [] }
  }

  const { all, any, none } = conditionSet
  const failedConditions: FailedCondition[] = []

  const allPassed = evaluateAllGroup(state, all, evaluators, scope, failedConditions, context)
  const anyPassed = evaluateAnyGroup(state, any, evaluators, scope, failedConditions, context)
  const nonePassed = evaluateNoneGroup(state, none, evaluators, scope, failedConditions, context)

  return {
    passed: allPassed && anyPassed && nonePassed,
    failedConditions,
  }
}

function evaluateAllGroup(
  state: GraphRuntimeState,
  conditions: Condition[] | undefined,
  evaluators: Map<string, ConditionEvaluator>,
  scope: ConditionScope,
  failedConditions: FailedCondition[],
  context?: EvaluationContext,
): boolean {
  if (!conditions?.length) {
    return true
  }

  let passed = true

  for (const condition of conditions) {
    const result = evaluateCondition(state, condition, evaluators, context)
    if (!result) {
      passed = false
      failedConditions.push({ scope, group: "all", condition })
    }
  }

  return passed
}

function evaluateAnyGroup(
  state: GraphRuntimeState,
  conditions: Condition[] | undefined,
  evaluators: Map<string, ConditionEvaluator>,
  scope: ConditionScope,
  failedConditions: FailedCondition[],
  context?: EvaluationContext,
): boolean {
  if (!conditions?.length) {
    return true
  }

  const results = conditions.map((condition) => ({
    condition,
    result: evaluateCondition(state, condition, evaluators, context),
  }))

  const passed = results.some(({ result }) => result)
  if (!passed) {
    for (const { condition } of results) {
      failedConditions.push({ scope, group: "any", condition })
    }
  }

  return passed
}

function evaluateNoneGroup(
  state: GraphRuntimeState,
  conditions: Condition[] | undefined,
  evaluators: Map<string, ConditionEvaluator>,
  scope: ConditionScope,
  failedConditions: FailedCondition[],
  context?: EvaluationContext,
): boolean {
  if (!conditions?.length) {
    return true
  }

  let passed = true

  for (const condition of conditions) {
    const result = evaluateCondition(state, condition, evaluators, context)
    if (result) {
      passed = false
      failedConditions.push({ scope, group: "none", condition })
    }
  }

  return passed
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
  context?: CombinedContext,
): Transition[] {
  return transitions.filter((transition) => {
    if (transition.sourceNodeId !== state.currentNodeId) {
      return false
    }

    const availability = checkTransitionAvailability(state, transition, evaluators, context)

    return availability.visible && availability.allowed
  })
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
  context?: CombinedContext,
): {
  available: Transition[]
  blocked: Transition[]
  hidden: Transition[]
} {
  const available: Transition[] = []
  const blocked: Transition[] = []
  const hidden: Transition[] = []

  for (const transition of transitions) {
    if (transition.sourceNodeId !== state.currentNodeId) {
      continue
    }

    const availability = checkTransitionAvailability(state, transition, evaluators, context)

    if (!availability.visible) {
      hidden.push(transition)
    } else if (!availability.allowed) {
      blocked.push(transition)
    } else {
      available.push(transition)
    }
  }

  return { available, blocked, hidden }
}
