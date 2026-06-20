/**
 * Fiction Map — Struct Definition
 */

import { RegistryError } from "./errors"
import type { ProjectRegistry } from "./registry"
import type { SourceLocation, StructConfig, StructDefinition } from "./types"

/**
 * Get the current call site for source location
 */
function getCallSite(): SourceLocation {
  const stack = new Error().stack?.split("\n") || []
  // Line 0 is Error, line 1 is this function, line 2 is defineStruct
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
 * Define a reusable struct
 *
 * @example
 * ```typescript
 * export const StatBlock = defineStruct(registry, {
 *   id: "stat-block",
 *   properties: {
 *     strength: { type: "number", default: 10 },
 *     agility: { type: "number", default: 10 },
 *     intelligence: { type: "number", default: 10 }
 *   }
 * })
 * ```
 */
export function defineStruct(registry: ProjectRegistry, config: StructConfig): StructDefinition {
  if (!config.id) {
    throw new RegistryError("Struct must have an id", "ERR_REGISTRY_MISSING_ID")
  }

  if (registry.structs.has(config.id)) {
    throw new RegistryError(
      `Struct "${config.id}" is already defined in this registry`,
      "ERR_REGISTRY_DUPLICATE_ID",
    )
  }

  const definition: StructDefinition = {
    id: config.id,
    name: `${config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Struct`,
    location: getCallSite(),
    properties: config.properties || {},
  }

  registry.structs.set(config.id, definition)

  return definition
}
