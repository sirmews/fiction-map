/**
 * Fiction Map — Edge Type Definition
 */

import { EdgeTypeDefinition, EdgeTypeConfig, SourceLocation } from "./types"
import type { ProjectRegistry } from "./registry"
import { RegistryError } from "./errors"

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
 * export const ChoiceEdge = defineEdgeType(registry, {
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
export function defineEdgeType(registry: ProjectRegistry, config: EdgeTypeConfig): EdgeTypeDefinition {
  if (!config.id) {
    throw new RegistryError("Edge type must have an id", "ERR_REGISTRY_MISSING_ID")
  }
  
  if (registry.edgeTypes.has(config.id)) {
    throw new RegistryError(`Edge type "${config.id}" is already defined in this registry`, "ERR_REGISTRY_DUPLICATE_ID")
  }
  
  const definition: EdgeTypeDefinition = {
    id: config.id,
    name: config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Edge",
    location: getCallSite(),
    properties: config.properties || {},
    sourceTypes: config.sourceTypes,
    targetTypes: config.targetTypes,
  }
  
  registry.edgeTypes.set(config.id, definition)
  
  return definition
}

