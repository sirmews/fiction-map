import type { Effect, EffectContext, EffectHandler, GraphRuntimeState } from "../types"
import { wasm } from "../wasm"

export function applyEffect(
  state: GraphRuntimeState,
  effect: Effect,
  handlers: Map<string, EffectHandler>,
  context?: EffectContext,
): GraphRuntimeState {
  return wasm.applyRegisteredEffect(state, effect, handlers, context)
}

export function applyEffects(
  state: GraphRuntimeState,
  effects: Effect[],
  handlers: Map<string, EffectHandler>,
  context?: EffectContext,
): GraphRuntimeState {
  return wasm.applyRegisteredEffects(state, effects, handlers, context)
}

export function combineHandlers(
  ...handlerMaps: Map<string, EffectHandler>[]
): Map<string, EffectHandler> {
  return new Map(handlerMaps.flatMap((handlers) => [...handlers]))
}
