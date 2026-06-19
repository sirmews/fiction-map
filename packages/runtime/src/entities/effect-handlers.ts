/**
 * Entity-aware built-in effect handlers.
 *
 * Separated from `effects/builtin.ts` so that the core (non-entity)
 * built-ins do not depend on entity state helpers. The default
 * `GraphRuntime` composes both maps via `default-bindings.ts`; consumers
 * that want a non-entity runtime can use `coreBuiltinHandlers` alone.
 */

import {
  activateEntity,
  addResource,
  deactivateEntity,
  grantEntity,
  lockEntity,
  revokeEntity,
  spendResource,
  unlockEntity,
} from "../core/state"
import type { Effect, EffectHandler, GraphRuntimeState } from "../types"

type EntityEffect = Effect & { entityId: string }
type ResourceEffect = Effect & {
  key: string
  amount: number
  allowNegative?: boolean
  clampToZero?: boolean
}

export const grantEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? grantEntity(state, entityId) : state
}

export const revokeEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? revokeEntity(state, entityId) : state
}

export const activateEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? activateEntity(state, entityId) : state
}

export const deactivateEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? deactivateEntity(state, entityId) : state
}

export const unlockEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? unlockEntity(state, entityId) : state
}

export const lockEntityHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
): GraphRuntimeState => {
  const { entityId } = effect as EntityEffect
  return typeof entityId === "string" ? lockEntity(state, entityId) : state
}

export const addResourceHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
): GraphRuntimeState => {
  const { key, amount } = effect as ResourceEffect
  return typeof key === "string" && typeof amount === "number"
    ? addResource(state, key, amount)
    : state
}

export const spendResourceHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
): GraphRuntimeState => {
  const { key, amount, allowNegative, clampToZero } = effect as ResourceEffect
  return typeof key === "string" && typeof amount === "number"
    ? spendResource(state, key, amount, { allowNegative, clampToZero })
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
