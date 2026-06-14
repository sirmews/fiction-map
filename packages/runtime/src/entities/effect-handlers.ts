/**
 * Entity-aware built-in effect handlers.
 *
 * Separated from `effects/builtin.ts` so that the core (non-entity)
 * built-ins do not depend on entity state helpers. The default
 * `GraphRuntime` composes both maps via `default-bindings.ts`; consumers
 * that want a non-entity runtime can use `coreBuiltinHandlers` alone.
 */

import type { GraphRuntimeState, Effect, EffectHandler, ResourceEffect } from "../types"
import {
  grantEntity,
  revokeEntity,
  activateEntity,
  deactivateEntity,
  unlockEntity,
  lockEntity,
  addResource,
  spendResource,
} from "../core/state"
import { evaluateFormula } from "../utils/formula"

type EntityEffect = Effect & { entityId: string }

export const grantEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? grantEntity(state, entityId) : state
}

export const revokeEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? revokeEntity(state, entityId) : state
}

export const activateEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? activateEntity(state, entityId) : state
}

export const deactivateEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? deactivateEntity(state, entityId) : state
}

export const unlockEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? unlockEntity(state, entityId) : state
}

export const lockEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? lockEntity(state, entityId) : state
}

export const addResourceHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const resourceEffect = effect as ResourceEffect
  const { key, amount, formula } = resourceEffect
  
  if (typeof key !== "string") return state

  const resolvedAmount = typeof formula === "string" 
    ? evaluateFormula(formula, state) 
    : amount

  return typeof resolvedAmount === "number"
    ? addResource(state, key, resolvedAmount)
    : state
}

export const spendResourceHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const resourceEffect = effect as ResourceEffect
  const { key, amount, formula, allowNegative, clampToZero } = resourceEffect
  
  if (typeof key !== "string") return state

  const resolvedAmount = typeof formula === "string" 
    ? evaluateFormula(formula, state) 
    : amount

  return typeof resolvedAmount === "number"
    ? spendResource(state, key, resolvedAmount, { allowNegative, clampToZero })
    : state
}

export const entityBuiltinHandlers: Map<string, EffectHandler> = new Map([
  ["grantEntity", grantEntityHandler],
  ["revokeEntity", revokeEntityHandler],
  ["activateEntity", activateEntityHandler],
  ["deactivateEntity", deactivateEntityHandler],
  ["unlockEntity", unlockEntityHandler],
  ["lockEntity", lockEntityHandler],
  ["addResource", addResourceHandler],
  ["spendResource", spendResourceHandler],
])
