import { DevServerState } from "./state"
import {
  DEV_SERVER_RPC_ERROR_CODES,
  DEV_SERVER_RPC_ERRORS,
  DEV_SERVER_RPC_METHODS,
  DEV_SERVER_RPC_NOTIFICATIONS,
  JSON_RPC_VERSION,
  toGraphSummary,
  toMetadataSnapshot,
  toWireRefreshError,
  type DefinitionOpenParams,
  type DefinitionOpenResult,
  type DevServerGraphMetadata,
  type GraphGetParams,
  type JsonRpcId,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcSuccessResponse,
  type JsonObject,
  type JsonValue,
  type MetadataChangedNotificationParams,
  type MetadataRefreshResult,
  type MetadataSnapshot,
} from "./protocol"

export interface DispatchRpcRequestOptions {
  request: JsonRpcRequest
  state: DevServerState<DevServerGraphMetadata>
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
  data?: JsonValue
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
      try {
        const refreshResult = await state.refresh()
        const snapshot = getMetadataSnapshot(state)
        const result: MetadataRefreshResult = {
          ...snapshot,
          metadata: refreshResult.metadata,
          refreshedAt: refreshResult.refreshedAt.toISOString(),
        }
        return jsonRpcSuccess(request.id, result)
      } catch (_error) {
        const snapshot = state.getSnapshot()
        const data: JsonObject = {
          refreshError: toWireRefreshError(snapshot.refreshError),
        }
        return jsonRpcError(
          request.id,
          DEV_SERVER_RPC_ERRORS.metadataRefreshFailed.code,
          DEV_SERVER_RPC_ERRORS.metadataRefreshFailed.message,
          data
        )
      }
    }

    case DEV_SERVER_RPC_METHODS.graphList: {
      const metadata = state.getSnapshot().metadata
      const result = metadata?.graphs.map((graph) => toGraphSummary(graph)) ?? []
      return jsonRpcSuccess(request.id, result)
    }

    case DEV_SERVER_RPC_METHODS.graphGet: {
      const params = request.params
      if (!isGraphGetParams(params)) {
        return jsonRpcError(
          request.id,
          DEV_SERVER_RPC_ERRORS.invalidGraphGetParams.code,
          DEV_SERVER_RPC_ERRORS.invalidGraphGetParams.message
        )
      }

      const metadata = state.getSnapshot().metadata
      const graph = metadata?.graphs.find((candidate) => candidate.id === params.graphId)
      if (!graph) {
        return jsonRpcError(
          request.id,
          DEV_SERVER_RPC_ERRORS.graphNotFound.code,
          `${DEV_SERVER_RPC_ERRORS.graphNotFound.messagePrefix}: ${params.graphId}`
        )
      }

      return jsonRpcSuccess(request.id, graph)
    }

    case DEV_SERVER_RPC_METHODS.definitionOpen: {
      const params = request.params
      if (!isDefinitionOpenParams(params)) {
        return jsonRpcError(
          request.id,
          DEV_SERVER_RPC_ERRORS.invalidDefinitionOpenParams.code,
          DEV_SERVER_RPC_ERRORS.invalidDefinitionOpenParams.message
        )
      }

      if (!openDefinition) {
        return jsonRpcError(
          request.id,
          DEV_SERVER_RPC_ERRORS.definitionOpenUnavailable.code,
          DEV_SERVER_RPC_ERRORS.definitionOpenUnavailable.message,
          {
            location: params,
          }
        )
      }

      try {
        const result = await openDefinition(params)

        return jsonRpcSuccess(request.id, result)
      } catch (error) {
        const data: JsonObject = {
          location: params,
          reason: toErrorMessage(error),
        }
        return jsonRpcError(
          request.id,
          DEV_SERVER_RPC_ERRORS.definitionOpenFailed.code,
          DEV_SERVER_RPC_ERRORS.definitionOpenFailed.message,
          data
        )
      }
    }

    default:
      return jsonRpcError(
        request.id,
        DEV_SERVER_RPC_ERRORS.methodNotFound.code,
        `${DEV_SERVER_RPC_ERRORS.methodNotFound.messagePrefix}: ${request.method}`
      )
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

function getMetadataSnapshot(
  state: DevServerState<DevServerGraphMetadata>
): MetadataSnapshot {
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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export type {
  DefinitionOpenParams,
  DefinitionOpenResult,
  DevServerGraphMetadata,
  GraphGetParams,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  MetadataChangedNotificationParams,
  MetadataRefreshResult,
  MetadataSnapshot,
} from "./protocol"
