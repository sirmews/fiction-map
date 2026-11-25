/**
 * Entity-aware built-in condition evaluators.
 *
 * Separated from `conditions/builtin.ts` so that the core (non-entity)
 * built-ins do not depend on entity state helpers. The default
 * `GraphRuntime` composes both maps via `default-bindings.ts`; consumers
 * that want a non-entity runtime can use `coreBuiltinEvaluators` alone.
 */

import type { ConditionEvaluator } from "../types"
import { builtinCondition } from "../wasm/builtins"

export const hasEntityEvaluator = builtinCondition("hasEntity")
export const entityActiveEvaluator = builtinCondition("entityActive")
export const entityUnlockedEvaluator = builtinCondition("entityUnlocked")
export const resourceAtLeastEvaluator = builtinCondition("resourceAtLeast")
export const resourceLessThanEvaluator = builtinCondition("resourceLessThan")

export const entityBuiltinEvaluators: Map<string, ConditionEvaluator> = new Map([
  ["hasEntity", hasEntityEvaluator],
  ["entityActive", entityActiveEvaluator],
  ["entityUnlocked", entityUnlockedEvaluator],
  ["resourceAtLeast", resourceAtLeastEvaluator],
  ["resourceLessThan", resourceLessThanEvaluator],
])
