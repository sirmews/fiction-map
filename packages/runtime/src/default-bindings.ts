/**
 * Default combined evaluator and handler maps for `GraphRuntime`.
 *
 * Composes the core (non-entity) built-ins with the entity-aware
 * built-ins. Lives in its own file so neither `conditions/builtin.ts`
 * nor `effects/builtin.ts` needs to know about entities; the dependency
 * direction is inverted — composition happens here, where both layers
 * are already visible.
 *
 * Consumers who want a non-entity runtime can pass `coreBuiltinEvaluators`
 * and `coreBuiltinHandlers` directly to the `GraphRuntime` constructor.
 */

import type { ConditionEvaluator, EffectHandler } from "./types"
import { coreBuiltinEvaluators } from "./conditions/builtin"
import { coreBuiltinHandlers } from "./effects/builtin"
import { entityBuiltinEvaluators } from "./entities/condition-evaluators"
import { entityBuiltinHandlers } from "./entities/effect-handlers"

export const builtinEvaluators: Map<string, ConditionEvaluator> = new Map([
  ...coreBuiltinEvaluators,
  ...entityBuiltinEvaluators,
])

export const builtinHandlers: Map<string, EffectHandler> = new Map([
  ...coreBuiltinHandlers,
  ...entityBuiltinHandlers,
])
