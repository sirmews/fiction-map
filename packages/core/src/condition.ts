/**
 * Fiction Map — Condition Definition
 */

import { ConditionDefinition, ConditionConfig, SourceLocation } from "./types"
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
 * Define a condition
 * 
 * @example
 * ```typescript
 * export const HasItemCondition = defineCondition(registry, {
 *   id: "has-item",
 *   parameters: {
 *     itemId: { type: "string", required: true },
 *   },
 * })
 * ```
 */
export function defineCondition(registry: ProjectRegistry, config: ConditionConfig): ConditionDefinition {
  if (!config.id) {
    throw new Error("Condition must have an id")
  }
  
  if (registry.conditions.has(config.id)) {
    throw new Error(`Condition "${config.id}" is already defined in this registry`)
  }
  
  const definition: ConditionDefinition = {
    id: config.id,
    name: config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Condition",
    location: getCallSite(),
    parameters: config.parameters || {},
  }
  
  registry.conditions.set(config.id, definition)
  
  return definition
}

