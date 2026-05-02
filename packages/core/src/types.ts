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
}

export interface PropertyDefinition {
  [name: string]: PropertySchema
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
}

export interface NodeTypeConfig {
  id: string
  properties?: PropertyDefinition
  outgoingEdges?: string[]
  incomingEdges?: string[]
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

export interface NodeInstance {
  id: string
  type: string
  [property: string]: unknown
}

export interface EdgeInstance {
  id: string
  type: string
  source: string
  target: string
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
// Registry
// ============================================================================

export interface Registry {
  nodeTypes: Map<string, NodeTypeDefinition>
  edgeTypes: Map<string, EdgeTypeDefinition>
  conditions: Map<string, ConditionDefinition>
  effects: Map<string, EffectDefinition>
  graphs: Map<string, GraphDefinition>
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
  validation: {
    errors: ValidationError[]
    warnings: ValidationWarning[]
  }
}

// ============================================================================
// Runtime Types
// ============================================================================

export interface GraphState {
  currentNodeId: string
  history: string[]
  visited: Set<string>
  variables: Record<string, unknown>
  [key: string]: unknown
}

export interface TraversalResult {
  success: boolean
  state: GraphState
  edgeId?: string
  targetNodeId?: string
  error?: string
  trace: TraceEvent[]
}

export interface TraceEvent {
  type: "condition-eval" | "effect-apply" | "traverse" | "arrive"
  timestamp: number
  data: Record<string, unknown>
}
