/**
 * Fiction Map — Node Type Definition
 */

import { NodeTypeDefinition, NodeTypeConfig, PropertyDefinition, SourceLocation } from "./types"
import type { ProjectRegistry } from "./registry"
import { RegistryError } from "./errors"

/**
 * Get the current call site for source location
 */
function getCallSite(): SourceLocation {
  const stack = new Error().stack?.split("\n") || []
  // Line 0 is Error, line 1 is this function, line 2 is defineNodeType
  // line 3 is the actual call site
  const callerLine = stack[3] || ""
  
  // Parse the line - format varies by environment
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
 * Define a node type
 * 
 * @example
 * ```typescript
 * export const SceneNode = defineNodeType(registry, {
 *   id: "scene",
 *   properties: {
 *     title: { type: "string", required: true },
 *     content: { type: "richtext" },
 *   },
 *   outgoingEdges: ["choice", "trigger"],
 *   incomingEdges: ["choice", "trigger"],
 * })
 * ```
 */
export function defineNodeType(registry: ProjectRegistry, config: NodeTypeConfig): NodeTypeDefinition {
  if (!config.id) {
    throw new RegistryError("Node type must have an id", "ERR_REGISTRY_MISSING_ID")
  }
  
  if (registry.nodeTypes.has(config.id)) {
    throw new RegistryError(`Node type "${config.id}" is already defined in this registry`, "ERR_REGISTRY_DUPLICATE_ID")
  }
  
  const definition: NodeTypeDefinition = {
    id: config.id,
    name: config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Node",
    location: getCallSite(),
    properties: config.properties || {},
    outgoingEdges: config.outgoingEdges || [],
    incomingEdges: config.incomingEdges || [],
  }
  
  registry.nodeTypes.set(config.id, definition)
  
  return definition
}

