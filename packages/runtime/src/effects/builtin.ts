/**
 * Core (non-entity) built-in effect handlers.
 *
 * This file deliberately has no knowledge of entities or resources.
 * Entity-aware handlers live in `../entities/effect-handlers.ts`.
 * The default `GraphRuntime` combines both maps via `../default-bindings.ts`.
 */

import type { EffectHandler } from "../types"
import { builtinEffect } from "../wasm/builtins"

export const setVariableHandler = builtinEffect("setVariable")
export const deleteVariableHandler = builtinEffect("deleteVariable")
export const incrementHandler = builtinEffect("increment")
export const decrementHandler = builtinEffect("decrement")
export const clampHandler = builtinEffect("clamp")
export const setFlagHandler = builtinEffect("setFlag")
export const clearFlagHandler = builtinEffect("clearFlag")
export const markVisitedHandler = builtinEffect("markVisited")
export const navigateHandler = builtinEffect("navigate")
export const noOpHandler = builtinEffect("noOp")
export const setExtensionHandler = builtinEffect("setExtension")
export const mergeExtensionHandler = builtinEffect("mergeExtension")

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
