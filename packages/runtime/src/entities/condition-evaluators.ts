/**
 * Entity-aware built-in condition evaluators.
 *
 * Separated from `conditions/builtin.ts` so that the core (non-entity)
 * built-ins do not depend on entity state helpers. The default
 * `GraphRuntime` composes both maps via `default-bindings.ts`; consumers
 * that want a non-entity runtime can use `coreBuiltinEvaluators` alone.
 */

import { entityIsActive, entityIsUnlocked, getResource, ownsEntity } from "../core/state"
import type { Condition, ConditionEvaluator } from "../types"

type EntityCondition = Condition & { entityId: string }
type NumericCondition = Condition & { key: string; value: number }

export const hasEntityEvaluator: ConditionEvaluator = (state, condition, context): boolean => {
  const { entityId } = condition as EntityCondition
  if (typeof entityId !== "string") return false

  if (context?.derivedState?.ownedEntityIds?.has(entityId)) {
    return true
  }
  return ownsEntity(state, entityId)
}
hasEntityEvaluator.reads = ["entityOwned"]

export const entityActiveEvaluator: ConditionEvaluator = (state, condition, context): boolean => {
  const { entityId } = condition as EntityCondition
  if (typeof entityId !== "string") return false

  if (context?.derivedState?.activeEntityIds?.has(entityId)) {
    return true
  }
  return entityIsActive(state, entityId)
}
entityActiveEvaluator.reads = ["entityActive"]

export const entityUnlockedEvaluator: ConditionEvaluator = (state, condition, context): boolean => {
  const { entityId } = condition as EntityCondition
  if (typeof entityId !== "string") return false

  if (context?.derivedState?.effectiveEntityIds?.has(entityId)) {
    return true
  }
  return entityIsUnlocked(state, entityId)
}
entityUnlockedEvaluator.reads = ["entityUnlocked"]

export const resourceAtLeastEvaluator: ConditionEvaluator = (state, condition): boolean => {
  const { key, value } = condition as NumericCondition
  return typeof key === "string" && typeof value === "number" && getResource(state, key) >= value
}
resourceAtLeastEvaluator.reads = ["entityResources"]

export const resourceLessThanEvaluator: ConditionEvaluator = (state, condition): boolean => {
  const { key, value } = condition as NumericCondition
  return typeof key === "string" && typeof value === "number" && getResource(state, key) < value
}
resourceLessThanEvaluator.reads = ["entityResources"]

export const entityBuiltinEvaluators: Map<string, ConditionEvaluator> = new Map([
  ["hasEntity", hasEntityEvaluator],
  ["entityActive", entityActiveEvaluator],
  ["entityUnlocked", entityUnlockedEvaluator],
  ["resourceAtLeast", resourceAtLeastEvaluator],
  ["resourceLessThan", resourceLessThanEvaluator],
])
