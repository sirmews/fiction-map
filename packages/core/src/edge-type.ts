/**
 * Fiction Map — Edge Type Definition
 */

import { EdgeTypeDefinition, EdgeTypeConfig, SourceLocation } from "./types"

// Global registry for edge types
const edgeTypeRegistry = new Map<string, EdgeTypeDefinition>()

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
 * Define an edge type
 * 
 * @example
 * ```typescript
 * export const ChoiceEdge = defineEdgeType({
 *   id: "choice",
 *   properties: {
 *     text: { type: "string", required: true },
 *     conditions: { type: "array", items: { type: "reference", referenceTo: "condition" } },
 *     effects: { type: "array", items: { type: "reference", referenceTo: "effect" } },
 *   },
 *   sourceTypes: ["scene"],
 *   targetTypes: ["scene"],
 * })
 * ```
 */
export function defineEdgeType(config: EdgeTypeConfig): EdgeTypeDefinition {
  if (!config.id) {
    throw new Error("Edge type must have an id")
  }
  
  if (edgeTypeRegistry.has(config.id)) {
    throw new Error(`Edge type "${config.id}" is already defined`)
  }
  
  const definition: EdgeTypeDefinition = {
    id: config.id,
    name: config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Edge",
    location: getCallSite(),
    properties: config.properties || {},
    sourceTypes: config.sourceTypes,
    targetTypes: config.targetTypes,
  }
  
  edgeTypeRegistry.set(config.id, definition)
  
  return definition
}

/**
 * Get all registered edge types
 */
export function getEdgeTypes(): Map<string, EdgeTypeDefinition> {
  return new Map(edgeTypeRegistry)
}

/**
 * Get a specific edge type
 */
export function getEdgeType(id: string): EdgeTypeDefinition | undefined {
  return edgeTypeRegistry.get(id)
}

/**
 * Clear the registry (useful for testing)
 */
export function clearEdgeTypes(): void {
  edgeTypeRegistry.clear()
}
