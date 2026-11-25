import type { ConditionEvaluator, EffectHandler } from "../types"
import { wasm } from "./index"

export function builtinCondition(kind: string): ConditionEvaluator {
  const evaluate: ConditionEvaluator = (state, condition, context) =>
    wasm.evaluateBuiltinCondition(kind, state, condition, context)
  wasm.registerBuiltinIdentity(evaluate, kind, true)
  return evaluate
}

export function builtinEffect(kind: string): EffectHandler {
  const apply: EffectHandler = (state, effect) => wasm.applyBuiltinEffect(kind, state, effect)
  wasm.registerBuiltinIdentity(apply, kind, false)
  return apply
}
