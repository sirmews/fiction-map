import type {
  GraphDefinition,
  GraphMetadata,
  SourceLocation,
} from "@fiction-map/core"
import type { DevServerRefreshError } from "./state"

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
  data?: unknown
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

export interface MetadataSnapshot {
  metadata: GraphMetadata | null
  lastRefreshAt: string | null
  refreshError: DevServerRefreshError | null
}

export interface MetadataRefreshResult extends MetadataSnapshot {
  refreshedAt: string
}

export interface GraphSummary {
  id: string
  name: string
  location: SourceLocation
  description?: string
  nodeCount: number
  edgeCount: number
  errorCount: number
  warningCount: number
}

export interface GraphGetParams {
  graphId: string
}

export interface DefinitionOpenParams extends SourceLocation {}

export type DefinitionOpenResult =
  | {
      ok: true
      location: SourceLocation
    }
  | {
      ok: false
      location: SourceLocation
      code: string
      message: string
    }

export type MetadataChangedReason = "file-change" | "manual-refresh"

export interface MetadataChangedNotificationParams {
  reason: MetadataChangedReason
  changedPath?: string
  refreshedAt: string
}

export function toMetadataSnapshot(
  metadata: GraphMetadata | null,
  lastRefreshAt: Date | null,
  refreshError: DevServerRefreshError | null
): MetadataSnapshot {
  return {
    metadata,
    lastRefreshAt: lastRefreshAt?.toISOString() ?? null,
    refreshError,
  }
}

export function toGraphSummary(graph: GraphDefinition): GraphSummary {
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
