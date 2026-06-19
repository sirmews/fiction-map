/**
 * Core (non-entity) built-in condition evaluators.
 *
 * This file deliberately has no knowledge of entities or resources.
 * Entity-aware evaluators live in `../entities/condition-evaluators.ts`.
 * The default `GraphRuntime` combines both maps via `../default-bindings.ts`.
 */

import type { Condition, ConditionEvaluator, GraphRuntimeState } from "../types"

type EqualsCondition = Condition & { key: string; value: unknown }
type NumericCondition = Condition & { key: string; value: number }
type KeyCondition = Condition & { key: string }
type FlagCondition = Condition & { key: string; value: boolean | string | number }
type NodeIdCondition = Condition & { nodeId: string }

export const equalsEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key, value } = condition as EqualsCondition
  return state.variables[key] === value
}

export const notEqualsEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key, value } = condition as EqualsCondition
  return state.variables[key] !== value
}

export const greaterThanEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key, value } = condition as NumericCondition
  const current = state.variables[key]
  if (typeof current !== "number" || typeof value !== "number") {
    return false
  }
  return current > value
}

export const greaterThanOrEqualEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key, value } = condition as NumericCondition
  const current = state.variables[key]
  if (typeof current !== "number" || typeof value !== "number") {
    return false
  }
  return current >= value
}

export const lessThanEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key, value } = condition as NumericCondition
  const current = state.variables[key]
  if (typeof current !== "number" || typeof value !== "number") {
    return false
  }
  return current < value
}

export const lessThanOrEqualEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key, value } = condition as NumericCondition
  const current = state.variables[key]
  if (typeof current !== "number" || typeof value !== "number") {
    return false
  }
  return current <= value
}

export const hasFlagEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key } = condition as KeyCondition
  return key in state.flags
}

export const notFlagEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key } = condition as KeyCondition
  return !(key in state.flags) || !state.flags[key]
}

export const flagEqualsEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key, value } = condition as FlagCondition
  return state.flags[key] === value
}

export const visitedEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { nodeId } = condition as NodeIdCondition
  return state.visited.has(nodeId)
}

export const notVisitedEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { nodeId } = condition as NodeIdCondition
  return !state.visited.has(nodeId)
}

export const currentNodeEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { nodeId } = condition as NodeIdCondition
  return state.currentNodeId === nodeId
}

export const hasVariableEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
): boolean => {
  const { key } = condition as KeyCondition
  return key in state.variables
}

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
