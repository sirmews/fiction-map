import {
  createMetadataChangedNotification,
  dispatchRpcRequest,
  jsonRpcError,
  type DefinitionOpenParams,
  type DefinitionOpenResult,
} from "./rpc"
import type { DevServerGraphMetadata, JsonRpcRequest, JsonRpcResponse } from "./protocol"
import { DevServerState } from "./state"
import {
  createDevServerWatcher,
  type DevServerWatcher,
  type DevServerWatcherOptions,
} from "./watcher"

const DEFAULT_HEALTH_PATH = "/health"
const DEFAULT_WEBSOCKET_PATH = "/ws"
const DEFAULT_HOSTNAME = "127.0.0.1"
const JSON_RPC_PARSE_ERROR_CODE = -32700
const JSON_RPC_INVALID_REQUEST_CODE = -32600

interface BunServeServer<TData> {
  port: number
  stop(closeActiveConnections?: boolean): void
  upgrade(request: Request, options?: { data: TData }): boolean
}

interface BunServerWebSocket {
  send(data: string): void
}

interface BunLike {
  serve(options: {
    port: number
    hostname: string
    fetch(
      request: Request,
      server: BunServeServer<{}>
    ): Response | Promise<Response> | undefined
    websocket: {
      open(socket: BunServerWebSocket): void
      close(socket: BunServerWebSocket): void
      message(
        socket: BunServerWebSocket,
        message: string | Buffer | Uint8Array | ArrayBuffer
      ): void | Promise<void>
    }
  }): BunServeServer<{}>
}

export interface StartDevServerOptions {
  state: DevServerState<DevServerGraphMetadata>
  port?: number
  hostname?: string
  healthPath?: string
  websocketPath?: string
  debounceMs?: number
  bunRuntime?: BunLike
  createWatcher?: (options: DevServerWatcherOptions) => DevServerWatcher
  openDefinition?: (
    params: DefinitionOpenParams
  ) => Promise<DefinitionOpenResult> | DefinitionOpenResult
}

export interface DevServer {
  readonly port: number
  readonly hostname: string
  readonly healthUrl: string
  readonly websocketUrl: string
  stop(): void
}

export function startDevServer(options: StartDevServerOptions): DevServer {
  const hostname = options.hostname ?? DEFAULT_HOSTNAME
  const healthPath = options.healthPath ?? DEFAULT_HEALTH_PATH
  const websocketPath = options.websocketPath ?? DEFAULT_WEBSOCKET_PATH
  const clients = new Set<BunServerWebSocket>()
  const createWatcher = options.createWatcher ?? createDevServerWatcher
  let lastBroadcastCycleId: symbol | null = null
  const latestChangedPathByCycleId = new Map<symbol, string | undefined>()

  const bun = options.bunRuntime ?? getBun()
  let watcher: DevServerWatcher | null = null
  let server: BunServeServer<{}> | null = null

  try {
    watcher = createWatcher({
      rootDir: options.state.rootDir,
      debounceMs: options.debounceMs ?? 100,
      onChange: async ({ changedPath }) => {
        const refreshTask = options.state.queueRefreshTask()
        latestChangedPathByCycleId.set(refreshTask.cycleId, changedPath)

        try {
          const refreshResult = await refreshTask.promise
          if (refreshTask.cycleId === lastBroadcastCycleId) {
            return
          }

          lastBroadcastCycleId = refreshTask.cycleId
          const notification = createMetadataChangedNotification({
            reason: "file-change",
            changedPath: latestChangedPathByCycleId.get(refreshTask.cycleId),
            refreshedAt: refreshResult.refreshedAt,
          })

          const payload = JSON.stringify(notification)
          for (const client of clients) {
            client.send(payload)
          }
        } catch {
          // Preserve the last good snapshot in state and avoid success notifications.
        } finally {
          latestChangedPathByCycleId.delete(refreshTask.cycleId)
        }
      },
    })

    server = bun.serve({
      port: options.port ?? 0,
      hostname,
      fetch(request, bunServer) {
        const url = new URL(request.url)

        if (url.pathname === healthPath) {
          return Response.json({
            ok: true,
            rootDir: options.state.rootDir,
            websocketPath,
          })
        }

        if (url.pathname === websocketPath) {
          return bunServer.upgrade(request) ? undefined : new Response("WebSocket upgrade failed", {
            status: 400,
          })
        }

        return new Response("Not found", { status: 404 })
      },
      websocket: {
        open(socket) {
          clients.add(socket)
        },
        close(socket) {
          clients.delete(socket)
        },
        async message(socket, message) {
          const response = await handleRpcMessage({
            message,
            state: options.state,
            openDefinition: options.openDefinition,
          })
          socket.send(JSON.stringify(response))
        },
      },
    })
  } catch (error) {
    watcher?.close()
    server?.stop(true)
    clients.clear()
    throw error
  }

  return {
    port: server.port,
    hostname,
    healthUrl: `http://${hostname}:${server.port}${healthPath}`,
    websocketUrl: `ws://${hostname}:${server.port}${websocketPath}`,
    stop() {
      watcher.close()
      server.stop(true)
      clients.clear()
    },
  }
}

async function handleRpcMessage(options: {
  message: string | Buffer | Uint8Array | ArrayBuffer
  state: DevServerState<DevServerGraphMetadata>
  openDefinition?: (
    params: DefinitionOpenParams
  ) => Promise<DefinitionOpenResult> | DefinitionOpenResult
}): Promise<JsonRpcResponse> {
  let parsedMessage: unknown

  try {
    parsedMessage = JSON.parse(toMessageString(options.message))
  } catch {
    return jsonRpcError(null, JSON_RPC_PARSE_ERROR_CODE, "Invalid JSON")
  }

  if (!isJsonRpcRequest(parsedMessage)) {
    return jsonRpcError(null, JSON_RPC_INVALID_REQUEST_CODE, "Invalid JSON-RPC request")
  }

  return dispatchRpcRequest({
    request: parsedMessage,
    state: options.state,
    openDefinition: options.openDefinition,
  })
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<JsonRpcRequest>
  return (
    candidate.jsonrpc === "2.0" &&
    typeof candidate.method === "string" &&
    Object.prototype.hasOwnProperty.call(candidate, "id")
  )
}

function toMessageString(message: string | Buffer | Uint8Array | ArrayBuffer): string {
  if (typeof message === "string") {
    return message
  }

  if (message instanceof ArrayBuffer) {
    return Buffer.from(message).toString("utf8")
  }

  return Buffer.from(message).toString("utf8")
}

function getBun(): BunLike {
  const candidate = (globalThis as typeof globalThis & { Bun?: BunLike }).Bun
  if (!candidate) {
    throw new Error("Bun runtime is required to start the dev server")
  }

  return candidate
}
