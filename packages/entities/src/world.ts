import {
  type PropertySchema,
  RegistryError,
  type SourceLocation,
  type ValidationError,
  type ValidationWarning,
} from "@fiction-map/core"
import type { EntityRegistry } from "./registry"
import type {
  EntityInstance,
  EntityModifier,
  EntityPrerequisite,
  EntityReferenceDefinition,
  EntityReferenceValue,
  WorldConfig,
  WorldDefinition,
} from "./types"

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

function validatePropertyValue(value: unknown, schema: PropertySchema, registry?: any): boolean {
  switch (schema.type) {
    case "string":
    case "richtext":
    case "date":
      return typeof value === "string"
    case "number":
      return typeof value === "number"
    case "boolean":
      return typeof value === "boolean"
    case "enum":
      return typeof value === "string" && !!schema.values?.includes(value)
    case "reference":
      return typeof value === "string"
    case "array":
      if (!Array.isArray(value)) return false
      if (!schema.items) return true
      return value.every((item) => validatePropertyValue(item, schema.items!, registry))
    case "set":
      if (value instanceof Set) return true
      return Array.isArray(value)
    case "map":
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
      }
      if (!schema.valueType) return true
      return Object.values(value).every((item) =>
        validatePropertyValue(item, schema.valueType!, registry),
      )
    case "struct": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false
      }
      if (!schema.structId || !registry) return false
      const structDef = registry.structs?.get(schema.structId)
      if (!structDef) return false
      for (const [propName, propSchema] of Object.entries(structDef.properties) as [
        string,
        PropertySchema,
      ][]) {
        const propValue = (value as Record<string, unknown>)[propName]
        if (propSchema.required && propValue === undefined) {
          return false
        }
        if (propValue !== undefined && !validatePropertyValue(propValue, propSchema, registry)) {
          return false
        }
      }
      return true
    }
    default:
      return true
  }
}

function normalizeReferenceValues(
  value: EntityReferenceValue | undefined,
  definition: EntityReferenceDefinition,
): string[] {
  if (value === undefined) return []
  if (definition.multiple) {
    return Array.isArray(value) ? value : [value]
  }
  return Array.isArray(value) ? value : [value]
}

function validateModifier(modifier: EntityModifier): boolean {
  return typeof modifier.target === "string" && modifier.target.length > 0
}

function validatePrerequisite(prerequisite: EntityPrerequisite): boolean {
  return typeof prerequisite.target === "string" && prerequisite.target.length > 0
}

function validateWorld(
  registry: EntityRegistry,
  entities: EntityInstance[],
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const entityIndex = new Map<string, EntityInstance>()

  for (const entity of entities) {
    if (entityIndex.has(entity.id)) {
      errors.push({
        code: "DUPLICATE_ENTITY_ID",
        message: `Duplicate entity id: "${entity.id}"`,
      })
    }
    entityIndex.set(entity.id, entity)
  }

  for (const entity of entities) {
    const entityType = registry.entityTypes.get(entity.type)
    if (!entityType) {
      errors.push({
        code: "UNKNOWN_ENTITY_TYPE",
        message: `Unknown entity type: "${entity.type}"`,
      })
      continue
    }

    for (const [propertyName, schema] of Object.entries(entityType.properties)) {
      const value = entity[propertyName]

      if (schema.required && value === undefined) {
        errors.push({
          code: "MISSING_REQUIRED_PROPERTY",
          message: `Entity "${entity.id}" is missing required property "${propertyName}"`,
        })
        continue
      }

      if (value !== undefined && !validatePropertyValue(value, schema, registry)) {
        errors.push({
          code: "INVALID_PROPERTY_TYPE",
          message: `Entity "${entity.id}" has invalid value for property "${propertyName}"`,
        })
      }
    }

    for (const [referenceName, definition] of Object.entries(entityType.references)) {
      const rawValue = entity.references?.[referenceName]
      const normalized = normalizeReferenceValues(rawValue, definition)

      if (definition.required && normalized.length === 0) {
        errors.push({
          code: "MISSING_REQUIRED_REFERENCE",
          message: `Entity "${entity.id}" is missing required reference "${referenceName}"`,
        })
        continue
      }

      if (!definition.multiple && Array.isArray(rawValue)) {
        errors.push({
          code: "INVALID_REFERENCE_CARDINALITY",
          message: `Entity "${entity.id}" reference "${referenceName}" must be a single value`,
        })
      }

      for (const targetId of normalized) {
        const target = entityIndex.get(targetId)

        if (!target) {
          errors.push({
            code: "UNKNOWN_ENTITY_REFERENCE_TARGET",
            message: `Entity "${entity.id}" reference "${referenceName}" points to unknown entity "${targetId}"`,
          })
          continue
        }

        if (!definition.to.includes(target.type)) {
          errors.push({
            code: "INVALID_ENTITY_REFERENCE_TARGET_TYPE",
            message: `Entity "${entity.id}" reference "${referenceName}" cannot point to entity type "${target.type}"`,
          })
        }
      }
    }

    for (const referenceName of Object.keys(entity.references || {})) {
      if (!(referenceName in entityType.references)) {
        errors.push({
          code: "UNKNOWN_ENTITY_REFERENCE",
          message: `Entity "${entity.id}" uses unknown reference "${referenceName}"`,
        })
      }
    }

    for (const modifier of entity.modifiers || []) {
      if (!validateModifier(modifier)) {
        errors.push({
          code: "INVALID_MODIFIER",
          message: `Entity "${entity.id}" has an invalid modifier`,
        })
      }
    }

    for (const prerequisite of entity.prerequisites || []) {
      if (!validatePrerequisite(prerequisite)) {
        errors.push({
          code: "INVALID_PREREQUISITE",
          message: `Entity "${entity.id}" has an invalid prerequisite`,
        })
        continue
      }

      if (prerequisite.kind === "entity" && !entityIndex.has(prerequisite.target)) {
        errors.push({
          code: "UNKNOWN_PREREQUISITE_TARGET",
          message: `Entity "${entity.id}" prerequisite points to unknown entity "${prerequisite.target}"`,
        })
      }
    }

    for (const unlockTarget of entity.unlocks || []) {
      if (!entityIndex.has(unlockTarget)) {
        errors.push({
          code: "UNKNOWN_UNLOCK_TARGET",
          message: `Entity "${entity.id}" unlock points to unknown entity "${unlockTarget}"`,
        })
      }
    }
  }

  return { errors, warnings }
}

export function defineWorld(registry: EntityRegistry, config: WorldConfig): WorldDefinition {
  if (!config.id) {
    throw new RegistryError("World must have an id", "ERR_REGISTRY_MISSING_ID")
  }

  if (registry.worlds.has(config.id)) {
    throw new RegistryError(
      `World "${config.id}" is already defined in this registry`,
      "ERR_REGISTRY_DUPLICATE_ID",
    )
  }

  const { errors, warnings } = validateWorld(registry, config.entities)
  const entityTypesUsed = [...new Set(config.entities.map((entity) => entity.type))].sort()

  const definition: WorldDefinition = {
    id: config.id,
    name: `${config.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}World`,
    location: getCallSite(),
    entities: config.entities,
    entityCount: config.entities.length,
    entityTypesUsed,
    errors,
    warnings,
  }

  registry.worlds.set(config.id, definition)

  return definition
}
