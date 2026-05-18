import type { SourceLocation } from "@fiction-map/core"
import type { EntityTypeConfig, EntityTypeDefinition } from "./types"
import type { EntityRegistry } from "./registry"

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

export function defineEntityType(registry: EntityRegistry, config: EntityTypeConfig): EntityTypeDefinition {
  if (!config.id) {
    throw new Error("Entity type must have an id")
  }

  if (registry.entityTypes.has(config.id)) {
    throw new Error(`Entity type "${config.id}" is already defined in this registry`)
  }

  const definition: EntityTypeDefinition = {
    id: config.id,
    name: config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "EntityType",
    location: getCallSite(),
    properties: config.properties || {},
    references: config.references || {},
  }

  registry.entityTypes.set(config.id, definition)

  return definition
}

