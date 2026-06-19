import type {
  PropertyDefinition,
  SourceLocation,
  ValidationError,
  ValidationWarning,
} from "@fiction-map/core"

export interface EntityReferenceDefinition {
  to: string[]
  required?: boolean
  multiple?: boolean
  description?: string
}

export interface EntityReferenceConfig {
  to: string[]
  required?: boolean
  multiple?: boolean
  description?: string
}

export interface EntityTypeDefinition {
  id: string
  name: string
  location: SourceLocation
  description?: string
  properties: PropertyDefinition
  references: Record<string, EntityReferenceDefinition>
}

export interface EntityTypeConfig {
  id: string
  properties?: PropertyDefinition
  references?: Record<string, EntityReferenceConfig>
}

export type EntityReferenceValue = string | string[]

export type EntityModifierOperation = "set" | "add" | "remove" | "grant" | "revoke"

export interface EntityModifier {
  target: string
  operation: EntityModifierOperation
  value?: unknown
}

export type EntityPrerequisiteKind = "entity" | "state" | "tag"
export type EntityPrerequisiteOperator = "has" | "equals" | "gte" | "includes"

export interface EntityPrerequisite {
  kind: EntityPrerequisiteKind
  target: string
  operator: EntityPrerequisiteOperator
  value?: unknown
}

export interface EntityInstance {
  id: string
  type: string
  references?: Record<string, EntityReferenceValue>
  modifiers?: EntityModifier[]
  prerequisites?: EntityPrerequisite[]
  unlocks?: string[]
  [property: string]: unknown
}

export interface WorldDefinition {
  id: string
  name: string
  location: SourceLocation
  entities: EntityInstance[]
  entityCount: number
  entityTypesUsed: string[]
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface WorldConfig {
  id: string
  entities: EntityInstance[]
}

export interface EntityMetadata {
  entityTypes: EntityTypeDefinition[]
  worlds: WorldDefinition[]
  validation: {
    errors: ValidationError[]
    warnings: ValidationWarning[]
  }
}
