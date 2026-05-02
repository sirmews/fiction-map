import type { GraphMetadata } from "@fiction-map/core"
import { DevServerState } from "./state"
import {
  DEV_SERVER_RPC_METHODS,
  DEV_SERVER_RPC_NOTIFICATIONS,
  JSON_RPC_VERSION,
  toGraphSummary,
  toMetadataSnapshot,
  type DefinitionOpenParams,
  type DefinitionOpenResult,
  type GraphGetParams,
  type JsonRpcId,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcSuccessResponse,
  type MetadataChangedNotificationParams,
  type MetadataRefreshResult,
  type MetadataSnapshot,
} from "./protocol"

export interface DispatchRpcRequestOptions {
  request: JsonRpcRequest
  state: DevServerState<GraphMetadata>
  openDefinition?: (
    params: DefinitionOpenParams
  ) => Promise<DefinitionOpenResult> | DefinitionOpenResult
}

export function jsonRpcSuccess<TResult>(
  id: JsonRpcId,
  result: TResult
): JsonRpcSuccessResponse<TResult> {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id,
    result,
  }
}

export function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  }
}

export async function dispatchRpcRequest(
  options: DispatchRpcRequestOptions
): Promise<JsonRpcResponse> {
  const { request, state, openDefinition } = options

  switch (request.method) {
    case DEV_SERVER_RPC_METHODS.metadataGet:
      return jsonRpcSuccess(request.id, getMetadataSnapshot(state))

    case DEV_SERVER_RPC_METHODS.metadataRefresh: {
      const refreshResult = await state.refresh()
      const snapshot = getMetadataSnapshot(state)
      const result: MetadataRefreshResult = {
        ...snapshot,
        metadata: refreshResult.metadata,
        refreshedAt: refreshResult.refreshedAt.toISOString(),
      }
      return jsonRpcSuccess(request.id, result)
    }

    case DEV_SERVER_RPC_METHODS.graphList: {
      const metadata = state.getSnapshot().metadata
      const result = metadata?.graphs.map((graph) => toGraphSummary(graph)) ?? []
      return jsonRpcSuccess(request.id, result)
    }

    case DEV_SERVER_RPC_METHODS.graphGet: {
      const params = request.params
      if (!isGraphGetParams(params)) {
        return jsonRpcError(request.id, -32602, "Invalid params for graph/get")
      }

      const metadata = state.getSnapshot().metadata
      const graph = metadata?.graphs.find((candidate) => candidate.id === params.graphId)
      if (!graph) {
        return jsonRpcError(request.id, -32004, `Graph not found: ${params.graphId}`)
      }

      return jsonRpcSuccess(request.id, graph)
    }

    case DEV_SERVER_RPC_METHODS.definitionOpen: {
      const params = request.params
      if (!isDefinitionOpenParams(params)) {
        return jsonRpcError(request.id, -32602, "Invalid params for definition/open")
      }

      const result = await (openDefinition?.(params) ??
        Promise.resolve<DefinitionOpenResult>({
          ok: false,
          location: params,
          code: "NOT_SUPPORTED",
          message: "definition/open is not implemented yet",
        }))

      return jsonRpcSuccess(request.id, result)
    }

    default:
      return jsonRpcError(request.id, -32601, `Method not found: ${request.method}`)
  }
}

export function createMetadataChangedNotification(
  params: {
    reason: MetadataChangedNotificationParams["reason"]
    refreshedAt: Date
    changedPath?: string
  }
): JsonRpcNotification<MetadataChangedNotificationParams> {
  return {
    jsonrpc: JSON_RPC_VERSION,
    method: DEV_SERVER_RPC_NOTIFICATIONS.metadataChanged,
    params: {
      reason: params.reason,
      refreshedAt: params.refreshedAt.toISOString(),
      ...(params.changedPath ? { changedPath: params.changedPath } : {}),
    },
  }
}

function getMetadataSnapshot(state: DevServerState<GraphMetadata>): MetadataSnapshot {
  const snapshot = state.getSnapshot()
  return toMetadataSnapshot(snapshot.metadata, snapshot.lastRefreshAt, snapshot.refreshError)
}

function isGraphGetParams(value: unknown): value is GraphGetParams {
  if (!value || typeof value !== "object") {
    return false
  }

  return typeof (value as GraphGetParams).graphId === "string"
}

function isDefinitionOpenParams(value: unknown): value is DefinitionOpenParams {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<DefinitionOpenParams>
  return (
    typeof candidate.file === "string" &&
    typeof candidate.line === "number" &&
    typeof candidate.column === "number"
  )
}

export type {
  DefinitionOpenParams,
  DefinitionOpenResult,
  GraphGetParams,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  MetadataChangedNotificationParams,
  MetadataRefreshResult,
  MetadataSnapshot,
} from "./protocol"
