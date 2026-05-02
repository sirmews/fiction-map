export const JSON_RPC_VERSION = "2.0" as const

export const DEV_SERVER_RPC_METHODS = {
  metadataGet: "metadata/get",
  metadataRefresh: "metadata/refresh",
  graphList: "graph/list",
  graphGet: "graph/get",
  definitionOpen: "definition/open",
} as const

export const DEV_SERVER_RPC_NOTIFICATIONS = {
  metadataChanged: "notify/metadata-changed",
} as const

export type DevServerRpcMethod =
  (typeof DEV_SERVER_RPC_METHODS)[keyof typeof DEV_SERVER_RPC_METHODS]

export type DevServerRpcNotificationMethod =
  (typeof DEV_SERVER_RPC_NOTIFICATIONS)[keyof typeof DEV_SERVER_RPC_NOTIFICATIONS]

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject
export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonRpcId = string | number | null

export interface JsonRpcRequest<TParams = unknown> {
  jsonrpc: typeof JSON_RPC_VERSION
  id: JsonRpcId
  method: string
  params?: TParams
}

export interface JsonRpcNotification<TParams = unknown> {
  jsonrpc: typeof JSON_RPC_VERSION
  method: DevServerRpcNotificationMethod
  params: TParams
}

export interface JsonRpcErrorObject {
  code: number
  message: string
  data?: JsonValue
}

export interface JsonRpcSuccessResponse<TResult> {
  jsonrpc: typeof JSON_RPC_VERSION
  id: JsonRpcId
  result: TResult
}

export interface JsonRpcErrorResponse {
  jsonrpc: typeof JSON_RPC_VERSION
  id: JsonRpcId
  error: JsonRpcErrorObject
}

export type JsonRpcResponse<TResult = unknown> =
  | JsonRpcSuccessResponse<TResult>
  | JsonRpcErrorResponse

export const DEV_SERVER_RPC_ERROR_CODES = {
  invalidParams: -32602,
  methodNotFound: -32601,
  metadataRefreshFailed: -32001,
  definitionOpenFailed: -32002,
  definitionOpenUnavailable: -32003,
  graphNotFound: -32004,
} as const

export const DEV_SERVER_RPC_ERRORS = {
  invalidGraphGetParams: {
    code: DEV_SERVER_RPC_ERROR_CODES.invalidParams,
    message: "Invalid params for graph/get",
  },
  invalidDefinitionOpenParams: {
    code: DEV_SERVER_RPC_ERROR_CODES.invalidParams,
    message: "Invalid params for definition/open",
  },
  methodNotFound: {
    code: DEV_SERVER_RPC_ERROR_CODES.methodNotFound,
    messagePrefix: "Method not found",
  },
  metadataRefreshFailed: {
    code: DEV_SERVER_RPC_ERROR_CODES.metadataRefreshFailed,
    message: "Metadata refresh failed",
  },
  definitionOpenFailed: {
    code: DEV_SERVER_RPC_ERROR_CODES.definitionOpenFailed,
    message: "Definition open failed",
  },
  definitionOpenUnavailable: {
    code: DEV_SERVER_RPC_ERROR_CODES.definitionOpenUnavailable,
    message: "Definition open is not available",
  },
  graphNotFound: {
    code: DEV_SERVER_RPC_ERROR_CODES.graphNotFound,
    messagePrefix: "Graph not found",
  },
} as const

export interface DevServerSourceLocation extends JsonObject {
  file: string
  line: number
  column: number
}

export type DevServerPropertyType =
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

export interface DevServerPropertySchema {
  type: DevServerPropertyType
  required?: boolean
  default?: JsonValue
  description?: string
  values?: string[]
  items?: DevServerPropertySchema
  keyType?: DevServerPropertyType
  valueType?: DevServerPropertySchema
  referenceTo?: string
}

export interface DevServerPropertyDefinition {
  [name: string]: DevServerPropertySchema
}

export interface DevServerValidationIssue {
  code: string
  message: string
  location?: DevServerSourceLocation
  nodeId?: string
  edgeId?: string
}

export interface DevServerNodeTypeDefinition {
  id: string
  name: string
  location: DevServerSourceLocation
  description?: string
  aiRule?: string
  properties: DevServerPropertyDefinition
  outgoingEdges: string[]
  incomingEdges: string[]
}

export interface DevServerEdgeTypeDefinition {
  id: string
  name: string
  location: DevServerSourceLocation
  description?: string
  aiRule?: string
  properties: DevServerPropertyDefinition
  sourceTypes: string[]
  targetTypes: string[]
}

export interface DevServerConditionDefinition {
  id: string
  name: string
  location: DevServerSourceLocation
  description?: string
  aiRule?: string
  parameters: DevServerPropertyDefinition
}

export interface DevServerEffectDefinition {
  id: string
  name: string
  location: DevServerSourceLocation
  description?: string
  aiRule?: string
  parameters: DevServerPropertyDefinition
}

export interface DevServerConditionInstance extends JsonObject {
  type: string
}

export interface DevServerEffectInstance extends JsonObject {
  type: string
}

export interface DevServerNodeInstance extends JsonObject {
  id: string
  type: string
}

export interface DevServerEdgeInstance extends JsonObject {
  id: string
  type: string
  source: string
  target: string
}

export interface DevServerGraphDefinition {
  id: string
  name: string
  location: DevServerSourceLocation
  description?: string
  aiRule?: string
  nodes: DevServerNodeInstance[]
  edges: DevServerEdgeInstance[]
  nodeCount: number
  edgeCount: number
  maxDepth: number
  endings: string[]
  nodeTypesUsed: string[]
  edgeTypesUsed: string[]
  conditionsUsed: string[]
  effectsUsed: string[]
  errors: DevServerValidationIssue[]
  warnings: DevServerValidationIssue[]
}

export interface DevServerValidationSummary {
  errors: DevServerValidationIssue[]
  warnings: DevServerValidationIssue[]
}

export interface DevServerGraphMetadata {
  nodeTypes: DevServerNodeTypeDefinition[]
  edgeTypes: DevServerEdgeTypeDefinition[]
  conditions: DevServerConditionDefinition[]
  effects: DevServerEffectDefinition[]
  graphs: DevServerGraphDefinition[]
  validation: DevServerValidationSummary
}

export interface WireRefreshError extends JsonObject {
  message: string
}

export interface MetadataSnapshot {
  metadata: DevServerGraphMetadata | null
  lastRefreshAt: string | null
  refreshError: WireRefreshError | null
}

export interface MetadataRefreshResult extends MetadataSnapshot {
  refreshedAt: string
}

export interface GraphSummary {
  id: string
  name: string
  location: DevServerSourceLocation
  description?: string
  nodeCount: number
  edgeCount: number
  errorCount: number
  warningCount: number
}

export interface GraphGetParams {
  graphId: string
}

export interface DefinitionOpenParams extends DevServerSourceLocation {}

export interface DefinitionOpenResult {
  ok: true
  location: DevServerSourceLocation
}

export type MetadataChangedReason = "file-change" | "manual-refresh"

export interface MetadataChangedNotificationParams {
  reason: MetadataChangedReason
  changedPath?: string
  refreshedAt: string
}

export function toMetadataSnapshot(
  metadata: DevServerGraphMetadata | null,
  lastRefreshAt: Date | null,
  refreshError: { message: string } | null
): MetadataSnapshot {
  return {
    metadata,
    lastRefreshAt: lastRefreshAt?.toISOString() ?? null,
    refreshError: toWireRefreshError(refreshError),
  }
}

export function toWireRefreshError(
  refreshError: { message: string } | null
): WireRefreshError | null {
  if (!refreshError) {
    return null
  }

  return {
    message: refreshError.message,
  }
}

export function toGraphSummary(graph: DevServerGraphDefinition): GraphSummary {
  return {
    id: graph.id,
    name: graph.name,
    location: graph.location,
    description: graph.description,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    errorCount: graph.errors.length,
    warningCount: graph.warnings.length,
  }
}
