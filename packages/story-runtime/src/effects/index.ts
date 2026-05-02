import type {
  GraphRuntimeState,
  Effect,
  EffectHandler,
  EffectContext,
} from "../types";

/**
 * Apply a single effect using the provided handlers.
 * 
 * @param state - Current runtime state
 * @param effect - Effect to apply
 * @param handlers - Map of effect type → handler function
 * @param context - Optional effect context
 * @returns New state (cloned, never mutated)
 */
export function applyEffect(
  state: GraphRuntimeState,
  effect: Effect,
  handlers: Map<string, EffectHandler>,
  context?: EffectContext
): GraphRuntimeState {
  const handler = handlers.get(effect.type);
  
  if (!handler) {
    console.warn(`No handler registered for effect type: ${effect.type}`);
    return state;
  }
  
  return handler(state, effect, context);
}

/**
 * Apply multiple effects in sequence.
 * 
 * Each effect is applied to the result of the previous one.
 * If an effect has no handler, it is skipped (with a warning).
 * 
 * @param state - Current runtime state
 * @param effects - Effects to apply in order
 * @param handlers - Map of effect type → handler function
 * @param context - Optional effect context
 * @returns New state with all effects applied
 */
export function applyEffects(
  state: GraphRuntimeState,
  effects: Effect[],
  handlers: Map<string, EffectHandler>,
  context?: EffectContext
): GraphRuntimeState {
  if (!effects || effects.length === 0) {
    return state;
  }
  
  return effects.reduce(
    (currentState, effect) => applyEffect(currentState, effect, handlers, context),
    state
  );
}

/**
 * Create a combined handler from multiple handlers.
 * 
 * Later handlers override earlier ones for the same effect type.
 */
export function combineHandlers(
  ...handlerMaps: Map<string, EffectHandler>[]
): Map<string, EffectHandler> {
  const combined = new Map<string, EffectHandler>();
  
  for (const handlers of handlerMaps) {
    for (const [type, handler] of handlers) {
      combined.set(type, handler);
    }
  }
  
  return combined;
}
