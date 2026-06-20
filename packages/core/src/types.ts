/**
 * Fiction Map — Core Types
 *
 * The metadata schema for graph-based systems.
 */

// ============================================================================
// Source Location
// ============================================================================

export interface SourceLocation {
  file: string
  line: number
  column: number
}

// ============================================================================
// Property Schema
// ============================================================================

export type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "richtext"
  | "enum"
  | "array"
  | "map"
  | "set"
  | "reference"
  | "struct"

export interface PropertySchema {
  type: PropertyType
  required?: boolean
  default?: unknown
  description?: string

  // For enums
  values?: string[]

  // For arrays
  items?: PropertySchema

  // For maps
  keyType?: PropertyType
  valueType?: PropertySchema

  // For references
  referenceTo?: string

  // For structs
  structId?: string
}

export interface PropertyDefinition {
  [name: string]: PropertySchema
}

// ============================================================================
// Struct Types
// ============================================================================

export interface StructDefinition {
  id: string
  name: string
  location: SourceLocation
  description?: string
  properties: PropertyDefinition
}

export interface StructConfig {
  id: string
  properties?: PropertyDefinition
}

// ============================================================================
// Node Types
// ============================================================================

export interface NodeTypeDefinition {
  id: string
  name: string
  location: SourceLocation
  description?: string
  aiRule?: string
  properties: PropertyDefinition
  outgoingEdges: string[]
  incomingEdges: string[]
  autoResolve?: boolean
}

export interface NodeTypeConfig {
  id: string
  properties?: PropertyDefinition
  outgoingEdges?: string[]
  incomingEdges?: string[]
  autoResolve?: boolean
}

// ============================================================================
// Edge Types
// ============================================================================

export interface EdgeTypeDefinition {
  id: string
  name: string
  location: SourceLocation
  description?: string
  aiRule?: string
  properties: PropertyDefinition
  sourceTypes: string[]
  targetTypes: string[]
}

export interface EdgeTypeConfig {
  id: string
  properties?: PropertyDefinition
  sourceTypes: string[]
  targetTypes: string[]
}

// ============================================================================
// Conditions
// ============================================================================

export interface ConditionDefinition {
  id: string
  name: string
  location: SourceLocation
  description?: string
  aiRule?: string
  parameters: PropertyDefinition
}

export interface ConditionConfig {
  id: string
  parameters?: PropertyDefinition
}

export interface ConditionInstance {
  type: string
  [key: string]: unknown
}

// ============================================================================
// Effects
// ============================================================================

export interface EffectDefinition {
  id: string
  name: string
  location: SourceLocation
  description?: string
  aiRule?: string
  parameters: PropertyDefinition
}

export interface EffectConfig {
  id: string
  parameters?: PropertyDefinition
}

export interface EffectInstance {
  type: string
  [key: string]: unknown
}

// ============================================================================
// Nodes and Edges (Instances)
// ============================================================================

export interface ContentBlock {
  id: string
  type: "paragraph" | "header" | "image" | "video"
  text?: string
  url?: string
  level?: number
  caption?: string
  metadata?: Record<string, unknown>
}

export interface NodeInstance {
  id: string
  type: string
  blocks?: ContentBlock[]
  autoResolve?: boolean
  [property: string]: unknown
}

export interface EdgeInstance {
  id: string
  type: string
  source: string
  target: string
  anchorBlockId?: string
  conditions?: ConditionInstance[]
  effects?: EffectInstance[]
  [property: string]: unknown
}

// ============================================================================
// Graph
// ============================================================================

export interface GraphDefinition {
  id: string
  name: string
  location: SourceLocation
  description?: string
  aiRule?: string
  nodes: NodeInstance[]
  edges: EdgeInstance[]

  // Computed during analysis
  nodeCount: number
  edgeCount: number
  maxDepth: number
  endings: string[]

  // Type usage
  nodeTypesUsed: string[]
  edgeTypesUsed: string[]
  conditionsUsed: string[]
  effectsUsed: string[]

  // Validation
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface GraphConfig {
  id: string
  nodes: NodeInstance[]
  edges: EdgeInstance[]
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  code: string
  message: string
  location?: SourceLocation
  nodeId?: string
  edgeId?: string
}

export interface ValidationWarning {
  code: string
  message: string
  location?: SourceLocation
  nodeId?: string
  edgeId?: string
}

// ============================================================================
// Metadata (Generated)
// ============================================================================

export interface GraphMetadata {
  nodeTypes: NodeTypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  conditions: ConditionDefinition[]
  effects: EffectDefinition[]
  graphs: GraphDefinition[]
  structs?: StructDefinition[]
  validation: {
    errors: ValidationError[]
    warnings: ValidationWarning[]
  }
}
