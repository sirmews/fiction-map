// Generated from path-enumeration.schema.json. DO NOT EDIT.

export interface Condition {
  type: string
  [key: string]: unknown
}

export interface Effect {
  type: string
  [key: string]: unknown
}

export interface ContentBlock {
  id: string
  type: "paragraph" | "header" | "image" | "video"
  content?: string
  url?: string
  alt?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface NodeBlueprint {
  id: string
  type?: string
  blocks?: Array<ContentBlock>
  autoResolve?: boolean
  enterEffects?: Array<Effect>
  [key: string]: unknown
}

export interface EdgeBlueprint {
  id: string
  source: string
  target?: string
  anchorBlockId?: string
  conditions?: Array<Condition>
  visibility?: Array<Condition>
  effects?: Array<Effect>
  failureEffects?: Array<Effect>
  failureTarget?: string
  label?: string
  metadata?: Record<string, unknown>
}

export interface GraphBlueprint {
  nodes: Array<NodeBlueprint>
  edges: Array<EdgeBlueprint>
  endings?: Array<string>
  startNode?: string
}

export interface StateTrigger {
  id: string
  conditions: Array<Condition>
  effects: Array<Effect>
}

export interface DerivedState {
  ownedEntityIds?: Array<string>
  activeEntityIds?: Array<string>
  effectiveEntityIds?: Array<string>
}

export interface EnumerationContext {
  derivedState?: DerivedState
}

export interface EnumerationRequest {
  blueprint: GraphBlueprint
  triggers?: Array<StateTrigger>
  context?: EnumerationContext
  maxDepth?: number
  maxPaths?: number
}

export type ExtensionObject = Record<string, unknown>

export interface SerializedEntityState {
  owned: Array<string>
  active: Array<string>
  unlocked: Array<string>
  resources: Record<string, unknown>
  extensions?: ExtensionObject
}

export interface SerializedState {
  schemaVersion: number
  currentNodeId?: string
  history: Array<string>
  variables: Record<string, unknown>
  flags: Record<string, unknown>
  visited: Array<string | null>
  entityState?: SerializedEntityState
  extensions?: ExtensionObject
}

export interface PathStep {
  transitionId: string
  fromNodeId: string
  toNodeId: string
  success: boolean
}

export interface TraversalPath {
  steps: Array<PathStep>
  finalNodeId?: string
  endedAt: "ending" | "dead-end" | "max-depth"
  state: SerializedState
}

export interface EnumerationError {
  code: string
  message: string
}

export interface EnumerationResponse {
  paths?: Array<TraversalPath>
  error?: EnumerationError
}

export interface Fixture {
  name: string
  request: EnumerationRequest
  expected: EnumerationResponse
}
