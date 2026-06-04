/**
 * Core (non-entity) built-in effect handlers.
 *
 * This file deliberately has no knowledge of entities or resources.
 * Entity-aware handlers live in `../entities/effect-handlers.ts`.
 * The default `GraphRuntime` combines both maps via `../default-bindings.ts`.
 */

import type { GraphRuntimeState, Effect, EffectHandler } from "../types"
import { cloneState, navigateToNode } from "../core/state"

type KeyValueEffect = Effect & { key: string; value: unknown }
type KeyEffect = Effect & { key: string }
type DeltaEffect = Effect & { key: string; delta: number }
type ClampEffect = Effect & { key: string; min: number; max: number }
type FlagEffect = Effect & { key: string; value: boolean | string | number }
type NodeIdEffect = Effect & { nodeId: string }
type MergeEffect = Effect & { key: string; value: Record<string, unknown> }

export const setVariableHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key, value } = effect as KeyValueEffect
  const cloned = cloneState(state)
  cloned.variables[key] = value
  return cloned
}

export const deleteVariableHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key } = effect as KeyEffect
  const cloned = cloneState(state)
  delete cloned.variables[key]
  return cloned
}

export const incrementHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key, delta } = effect as DeltaEffect
  const current = state.variables[key]

  if (typeof current !== "number") {
    return state
  }

  const cloned = cloneState(state)
  cloned.variables[key] = current + delta
  return cloned
}

export const decrementHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key, delta } = effect as DeltaEffect
  const current = state.variables[key]

  if (typeof current !== "number") {
    return state
  }

  const cloned = cloneState(state)
  cloned.variables[key] = current - delta
  return cloned
}

export const clampHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key, min, max } = effect as ClampEffect
  const current = state.variables[key]

  if (typeof current !== "number") {
    return state
  }

  const cloned = cloneState(state)
  cloned.variables[key] = Math.max(min, Math.min(max, current))
  return cloned
}

export const setFlagHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key, value } = effect as FlagEffect
  const cloned = cloneState(state)
  cloned.flags[key] = value
  return cloned
}

export const clearFlagHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key } = effect as KeyEffect
  const cloned = cloneState(state)
  delete cloned.flags[key]
  return cloned
}

export const markVisitedHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { nodeId } = effect as NodeIdEffect
  const cloned = cloneState(state)
  cloned.visited.add(nodeId)
  return cloned
}

export const navigateHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { nodeId } = effect as NodeIdEffect
  return navigateToNode(state, nodeId)
}

export const noOpHandler: EffectHandler = (
  state: GraphRuntimeState
): GraphRuntimeState => {
  return state
}

export const setExtensionHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key, value } = effect as KeyValueEffect
  const cloned = cloneState(state)
  cloned.extensions = { ...cloned.extensions, [key]: value }
  return cloned
}

export const mergeExtensionHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const { key, value } = effect as MergeEffect
  const cloned = cloneState(state)
  const current = (cloned.extensions?.[key] as Record<string, unknown>) ?? {}
  cloned.extensions = {
    ...cloned.extensions,
    [key]: { ...current, ...value },
  }
  return cloned
}

export const coreBuiltinHandlers: Map<string, EffectHandler> = new Map([
  ["setVariable", setVariableHandler],
  ["deleteVariable", deleteVariableHandler],
  ["increment", incrementHandler],
  ["decrement", decrementHandler],
  ["clamp", clampHandler],
  ["setFlag", setFlagHandler],
  ["clearFlag", clearFlagHandler],
  ["markVisited", markVisitedHandler],
  ["navigate", navigateHandler],
  ["noOp", noOpHandler],
  ["setExtension", setExtensionHandler],
  ["mergeExtension", mergeExtensionHandler],
])
