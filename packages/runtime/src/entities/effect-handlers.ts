/**
 * Entity-aware built-in effect handlers.
 *
 * Separated from `effects/builtin.ts` so that the core (non-entity)
 * built-ins do not depend on entity state helpers. The default
 * `GraphRuntime` composes both maps via `default-bindings.ts`; consumers
 * that want a non-entity runtime can use `coreBuiltinHandlers` alone.
 */

import type { EffectHandler } from "../types"
import { builtinEffect } from "../wasm/builtins"

export const grantEntityHandler = builtinEffect("grantEntity")
export const revokeEntityHandler = builtinEffect("revokeEntity")
export const activateEntityHandler = builtinEffect("activateEntity")
export const deactivateEntityHandler = builtinEffect("deactivateEntity")
export const unlockEntityHandler = builtinEffect("unlockEntity")
export const lockEntityHandler = builtinEffect("lockEntity")
export const addResourceHandler = builtinEffect("addResource")
export const spendResourceHandler = builtinEffect("spendResource")

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
