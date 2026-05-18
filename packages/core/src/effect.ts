/**
 * Fiction Map — Effect Definition
 */

import { EffectDefinition, EffectConfig, SourceLocation } from "./types"
import type { ProjectRegistry } from "./registry"

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
 * export const GiveItemEffect = defineEffect(registry, {
 *   id: "give-item",
 *   parameters: {
 *     itemId: { type: "string", required: true },
 *     quantity: { type: "number", default: 1 },
 *   },
 * })
 * ```
 */
export function defineEffect(registry: ProjectRegistry, config: EffectConfig): EffectDefinition {
  if (!config.id) {
    throw new Error("Effect must have an id")
  }
  
  if (registry.effects.has(config.id)) {
    throw new Error(`Effect "${config.id}" is already defined in this registry`)
  }
  
  const definition: EffectDefinition = {
    id: config.id,
    name: config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Effect",
    location: getCallSite(),
    parameters: config.parameters || {},
  }
  
  registry.effects.set(config.id, definition)
  
  return definition
}

