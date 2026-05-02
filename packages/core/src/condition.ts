/**
 * Fiction Map — Condition Definition
 */

import { ConditionDefinition, ConditionConfig, SourceLocation } from "./types"

// Global registry for conditions
const conditionRegistry = new Map<string, ConditionDefinition>()

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
 * export const HasItemCondition = defineCondition({
 *   id: "has-item",
 *   parameters: {
 *     itemId: { type: "string", required: true },
 *   },
 * })
 * ```
 */
export function defineCondition(config: ConditionConfig): ConditionDefinition {
  if (!config.id) {
    throw new Error("Condition must have an id")
  }
  
  if (conditionRegistry.has(config.id)) {
    throw new Error(`Condition "${config.id}" is already defined`)
  }
  
  const definition: ConditionDefinition = {
    id: config.id,
    name: config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Condition",
    location: getCallSite(),
    parameters: config.parameters || {},
  }
  
  conditionRegistry.set(config.id, definition)
  
  return definition
}

/**
 * Get all registered conditions
 */
export function getConditions(): Map<string, ConditionDefinition> {
  return new Map(conditionRegistry)
}

/**
 * Get a specific condition
 */
export function getCondition(id: string): ConditionDefinition | undefined {
  return conditionRegistry.get(id)
}

/**
 * Clear the registry (useful for testing)
 */
export function clearConditions(): void {
  conditionRegistry.clear()
}
