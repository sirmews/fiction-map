import type {
  GraphRuntimeState,
  Condition,
  ConditionEvaluator,
} from "../types"
import {
  ownsEntity,
  entityIsActive,
  entityIsUnlocked,
  getResource,
} from "../core/state"

type EqualsCondition = Condition & { key: string; value: unknown }
type NumericCondition = Condition & { key: string; value: number }
type KeyCondition = Condition & { key: string }
type FlagCondition = Condition & { key: string; value: boolean | string | number }
type NodeIdCondition = Condition & { nodeId: string }
type EntityCondition = Condition & { entityId: string }

export const equalsEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
): boolean => {
  const { key, value } = condition as EqualsCondition
  return state.variables[key] === value
}

export const notEqualsEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
): boolean => {
  const { key, value } = condition as EqualsCondition
  return state.variables[key] !== value
}

export const greaterThanEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
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
  condition: Condition
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
  condition: Condition
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
  condition: Condition
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
  condition: Condition
): boolean => {
  const { key } = condition as KeyCondition
  return key in state.flags
}

export const flagEqualsEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
): boolean => {
  const { key, value } = condition as FlagCondition
  return state.flags[key] === value
}

export const visitedEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
): boolean => {
  const { nodeId } = condition as NodeIdCondition
  return state.visited.has(nodeId)
}

export const notVisitedEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
): boolean => {
  const { nodeId } = condition as NodeIdCondition
  return !state.visited.has(nodeId)
}

export const currentNodeEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
): boolean => {
  const { nodeId } = condition as NodeIdCondition
  return state.currentNodeId === nodeId
}

export const hasVariableEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
): boolean => {
  const { key } = condition as KeyCondition
  return key in state.variables
}

export const hasEntityEvaluator: ConditionEvaluator = (
  state,
  condition,
  context
): boolean => {
  const { entityId } = condition as EntityCondition
  if (typeof entityId !== "string") return false
  
  if (context?.derivedState?.ownedEntityIds?.has(entityId)) {
    return true
  }
  return ownsEntity(state, entityId)
}

export const entityActiveEvaluator: ConditionEvaluator = (
  state,
  condition,
  context
): boolean => {
  const { entityId } = condition as EntityCondition
  if (typeof entityId !== "string") return false

  if (context?.derivedState?.activeEntityIds?.has(entityId)) {
    return true
  }
  return entityIsActive(state, entityId)
}

export const entityUnlockedEvaluator: ConditionEvaluator = (
  state,
  condition,
  context
): boolean => {
  const { entityId } = condition as EntityCondition
  if (typeof entityId !== "string") return false

  if (context?.derivedState?.effectiveEntityIds?.has(entityId)) {
    return true
  }
  return entityIsUnlocked(state, entityId)
}

export const resourceAtLeastEvaluator: ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition
): boolean => {
  const { key, value } = condition as NumericCondition
  return typeof key === "string" && typeof value === "number" && getResource(state, key) >= value
}

export const builtinEvaluators: Map<string, ConditionEvaluator> = new Map([
  ["equals", equalsEvaluator],
  ["notEquals", notEqualsEvaluator],
  ["greaterThan", greaterThanEvaluator],
  ["greaterThanOrEqual", greaterThanOrEqualEvaluator],
  ["lessThan", lessThanEvaluator],
  ["lessThanOrEqual", lessThanOrEqualEvaluator],
  ["hasFlag", hasFlagEvaluator],
  ["flagEquals", flagEqualsEvaluator],
  ["visited", visitedEvaluator],
  ["notVisited", notVisitedEvaluator],
  ["currentNode", currentNodeEvaluator],
  ["hasVariable", hasVariableEvaluator],
  ["hasEntity", hasEntityEvaluator],
  ["entityActive", entityActiveEvaluator],
  ["entityUnlocked", entityUnlockedEvaluator],
  ["resourceAtLeast", resourceAtLeastEvaluator],
])

