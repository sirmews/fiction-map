/**
 * Core (non-entity) built-in condition evaluators.
 *
 * This file deliberately has no knowledge of entities or resources.
 * Entity-aware evaluators live in `../entities/condition-evaluators.ts`.
 * The default `GraphRuntime` combines both maps via `../default-bindings.ts`.
 */

import type { ConditionEvaluator } from "../types"
import { builtinCondition } from "../wasm/builtins"

export const equalsEvaluator = builtinCondition("equals")
export const notEqualsEvaluator = builtinCondition("notEquals")
export const greaterThanEvaluator = builtinCondition("greaterThan")
export const greaterThanOrEqualEvaluator = builtinCondition("greaterThanOrEqual")
export const lessThanEvaluator = builtinCondition("lessThan")
export const lessThanOrEqualEvaluator = builtinCondition("lessThanOrEqual")
export const hasFlagEvaluator = builtinCondition("hasFlag")
export const notFlagEvaluator = builtinCondition("notFlag")
export const flagEqualsEvaluator = builtinCondition("flagEquals")
export const visitedEvaluator = builtinCondition("visited")
export const notVisitedEvaluator = builtinCondition("notVisited")
export const currentNodeEvaluator = builtinCondition("currentNode")
export const hasVariableEvaluator = builtinCondition("hasVariable")

export const coreBuiltinEvaluators: Map<string, ConditionEvaluator> = new Map([
  ["equals", equalsEvaluator],
  ["notEquals", notEqualsEvaluator],
  ["greaterThan", greaterThanEvaluator],
  ["greaterThanOrEqual", greaterThanOrEqualEvaluator],
  ["lessThan", lessThanEvaluator],
  ["lessThanOrEqual", lessThanOrEqualEvaluator],
  ["hasFlag", hasFlagEvaluator],
  ["notFlag", notFlagEvaluator],
  ["flagEquals", flagEqualsEvaluator],
  ["visited", visitedEvaluator],
  ["notVisited", notVisitedEvaluator],
  ["currentNode", currentNodeEvaluator],
  ["hasVariable", hasVariableEvaluator],
])
