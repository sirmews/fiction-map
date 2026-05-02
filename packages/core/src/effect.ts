/**
 * Fiction Map — Effect Definition
 */

import { EffectDefinition, EffectConfig, SourceLocation } from "./types"

// Global registry for effects
const effectRegistry = new Map<string, EffectDefinition>()

/**
 * Get the current call site for source location
 */
function getCallSite(): SourceLocation {
  const stack = new Error().stack?.split("\n") || []
  const callerLine = stack[3] || ""
  
  const match = callerLine.match(/(?:at\s+)?(?:.*?\()?(.+?):(\d+):(\d+)/)
  
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
    }
  }
  
  return { file: "unknown", line: 0, column: 0 }
}

/**
 * Define an effect
 * 
 * @example
 * ```typescript
 * export const GiveItemEffect = defineEffect({
 *   id: "give-item",
 *   parameters: {
 *     itemId: { type: "string", required: true },
 *     quantity: { type: "number", default: 1 },
 *   },
 * })
 * ```
 */
export function defineEffect(config: EffectConfig): EffectDefinition {
  if (!config.id) {
    throw new Error("Effect must have an id")
  }
  
  if (effectRegistry.has(config.id)) {
    throw new Error(`Effect "${config.id}" is already defined`)
  }
  
  const definition: EffectDefinition = {
    id: config.id,
    name: config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Effect",
    location: getCallSite(),
    parameters: config.parameters || {},
  }
  
  effectRegistry.set(config.id, definition)
  
  return definition
}

/**
 * Get all registered effects
 */
export function getEffects(): Map<string, EffectDefinition> {
  return new Map(effectRegistry)
}

/**
 * Get a specific effect
 */
export function getEffect(id: string): EffectDefinition | undefined {
  return effectRegistry.get(id)
}

/**
 * Clear the registry (useful for testing)
 */
export function clearEffects(): void {
  effectRegistry.clear()
}
