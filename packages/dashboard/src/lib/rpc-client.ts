import {
  DEV_SERVER_RPC_METHODS,
  DEV_SERVER_RPC_NOTIFICATIONS,
  JSON_RPC_VERSION,
  type DevServerRpcNotificationMethod,
  type JsonRpcErrorObject,
  type JsonRpcId,
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type MetadataChangedNotificationParams,
  type MetadataRefreshResult,
  type MetadataSnapshot,
} from "@fiction-map/dev-server"

export type DashboardConnectionState = "connecting" | "connected" | "disconnected"

export interface WebSocketLike {
  addEventListener(type: "open", listener: () => void): void
  addEventListener(type: "error", listener: () => void): void
  addEventListener(type: "close", listener: () => void): void
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void
  removeEventListener(type: "open", listener: () => void): void
  removeEventListener(type: "error", listener: () => void): void
  removeEventListener(type: "close", listener: () => void): void
  removeEventListener(type: "message", listener: (event: { data: unknown }) => void): void
  send(data: string): void
  close(): void
}

export interface DevServerRpcClientOptions {
  reconnectDelayMs?: number
  url?: string
  webSocketFactory?: (url: string) => WebSocketLike
}

export class JsonRpcRequestError extends Error {
  readonly code: number
  readonly data?: unknown

  constructor(error: JsonRpcErrorObject) {
    super(error.message)
    this.name = "JsonRpcRequestError"
    this.code = error.code
    this.data = error.data
  }
}

type PendingRequest = {
  reject(error: unknown): void
  resolve(value: unknown): void
}

type ConnectionListener = (state: DashboardConnectionState) => void
type NotificationListener<TParams> = (params: TParams) => void
type ReadyWaiter = {
  reject(error: unknown): void
  resolve(socket: WebSocketLike): void
}

export interface DevServerRpcClient {
  destroy(): void
  getConnectionState(): DashboardConnectionState
  getMetadata(): Promise<MetadataSnapshot>
  refreshMetadata(): Promise<MetadataRefreshResult>
  request<TResult, TParams = undefined>(
    method: string,
    ...params: TParams extends undefined ? [] : [params: TParams]
  ): Promise<TResult>
  subscribeConnectionState(listener: ConnectionListener): () => void
  subscribeMetadataChanged(
    listener: NotificationListener<MetadataChangedNotificationParams>
  ): () => void
}

export function createDevServerRpcClient(
  options: DevServerRpcClientOptions = {}
): DevServerRpcClient {
  const reconnectDelayMs = options.reconnectDelayMs ?? 750
  const url = options.url ?? getDefaultWebSocketUrl()
  const webSocketFactory = options.webSocketFactory ?? createBrowserWebSocket

  let connectionState: DashboardConnectionState = "connecting"
  let currentSocket: WebSocketLike | null = null
  let nextRequestId = 1
  let destroyed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const connectionListeners = new Set<ConnectionListener>()
  const readyWaiters = new Set<ReadyWaiter>()
  const pendingRequests = new Map<JsonRpcId, PendingRequest>()
  const metadataChangedListeners =
    new Set<NotificationListener<MetadataChangedNotificationParams>>()

  const emitConnectionState = (nextState: DashboardConnectionState) => {
    connectionState = nextState
    for (const listener of connectionListeners) {
      listener(nextState)
    }
  }

  const rejectPendingRequests = (error: Error) => {
    for (const pending of pendingRequests.values()) {
      pending.reject(error)
    }
    pendingRequests.clear()
  }

  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer !== null) {
      return
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, reconnectDelayMs)
  }

  const handleMessage = (event: { data: unknown }) => {
    const payload = parseServerMessage(event.data)
    if (!payload) {
      return
    }

    if (isNotification(payload)) {
      if (payload.method === DEV_SERVER_RPC_NOTIFICATIONS.metadataChanged) {
        for (const listener of metadataChangedListeners) {
          listener(payload.params as MetadataChangedNotificationParams)
        }
      }
      return
    }

    const pending = pendingRequests.get(payload.id)
    if (!pending) {
      return
    }

    pendingRequests.delete(payload.id)

    if ("error" in payload) {
      pending.reject(new JsonRpcRequestError(payload.error))
      return
    }

    pending.resolve(payload.result)
  }

  const handleOpen = (socket: WebSocketLike) => {
    if (destroyed || currentSocket !== socket) {
      return
    }

    emitConnectionState("connected")
    for (const waiter of readyWaiters) {
      waiter.resolve(socket)
    }
    readyWaiters.clear()
  }

  const handleClose = (socket: WebSocketLike) => {
    if (currentSocket !== socket) {
      return
    }

    currentSocket = null
    rejectPendingRequests(new Error("Disconnected from the Fiction Map dev server"))
    emitConnectionState("disconnected")
    scheduleReconnect()
  }

  const connect = () => {
    if (destroyed || currentSocket) {
      return
    }

    emitConnectionState("connecting")
    const socket = webSocketFactory(url)
    currentSocket = socket

    const onOpen = () => handleOpen(socket)
    const onClose = () => {
      detach()
      handleClose(socket)
    }
    const onError = () => {
      if (currentSocket === socket && connectionState !== "connected") {
        emitConnectionState("disconnected")
      }
    }
    const onMessage = (event: { data: unknown }) => handleMessage(event)

    const detach = () => {
      socket.removeEventListener("open", onOpen)
      socket.removeEventListener("close", onClose)
      socket.removeEventListener("error", onError)
      socket.removeEventListener("message", onMessage)
    }

    socket.addEventListener("open", onOpen)
    socket.addEventListener("close", onClose)
    socket.addEventListener("error", onError)
    socket.addEventListener("message", onMessage)
  }

  const waitForConnection = (): Promise<WebSocketLike> => {
    if (destroyed) {
      return Promise.reject(new Error("RPC client is destroyed"))
    }

    if (currentSocket && connectionState === "connected") {
      return Promise.resolve(currentSocket)
    }

    connect()
    return new Promise<WebSocketLike>((resolve, reject) => {
      readyWaiters.add({ resolve, reject })
    })
  }

  connect()

  return {
    destroy() {
      destroyed = true
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }

      for (const waiter of readyWaiters) {
        waiter.reject(new Error("RPC client destroyed before the connection became ready"))
      }
      readyWaiters.clear()
      rejectPendingRequests(new Error("RPC client destroyed"))
      const socket = currentSocket
      currentSocket = null
      if (socket) {
        socket.close()
      }
      emitConnectionState("disconnected")
    },

    getConnectionState() {
      return connectionState
    },

    async getMetadata() {
      return this.request<MetadataSnapshot>(DEV_SERVER_RPC_METHODS.metadataGet)
    },

    async refreshMetadata() {
      return this.request<MetadataRefreshResult>(DEV_SERVER_RPC_METHODS.metadataRefresh)
    },

    async request<TResult, TParams = undefined>(
      method: string,
      ...params: TParams extends undefined ? [] : [params: TParams]
    ): Promise<TResult> {
      const socket = await waitForConnection()
      if (destroyed || currentSocket !== socket || connectionState !== "connected") {
        throw new Error("RPC client is not connected")
      }

      const id = nextRequestId++
      const request: JsonRpcRequest<TParams> = {
        jsonrpc: JSON_RPC_VERSION,
        id,
        method,
      }

      if (params.length > 0) {
        request.params = params[0]
      }

      return new Promise<TResult>((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject })
        socket.send(JSON.stringify(request))
      })
    },

    subscribeConnectionState(listener) {
      connectionListeners.add(listener)
      listener(connectionState)
      return () => {
        connectionListeners.delete(listener)
      }
    },

    subscribeMetadataChanged(listener) {
      metadataChangedListeners.add(listener)
      return () => {
        metadataChangedListeners.delete(listener)
      }
    },
  }
}

function createBrowserWebSocket(url: string): WebSocketLike {
  return new WebSocket(url)
}

function getDefaultWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_FICTION_MAP_RPC_URL
  if (configuredUrl) {
    return configuredUrl
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${window.location.host}/ws`
}

function parseServerMessage(data: unknown): JsonRpcResponse | JsonRpcNotification | null {
  const rawText =
    typeof data === "string"
      ? data
      : data instanceof ArrayBuffer
        ? new TextDecoder().decode(data)
        : data instanceof Blob
          ? null
          : typeof data === "object" && data && "toString" in data
            ? String(data)
            : null

  if (!rawText) {
    return null
  }

  let parsed: JsonRpcResponse | JsonRpcNotification
  try {
    parsed = JSON.parse(rawText) as JsonRpcResponse | JsonRpcNotification
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== "object" || parsed.jsonrpc !== JSON_RPC_VERSION) {
    return null
  }

  return parsed
}

function isNotification(
  value: JsonRpcResponse | JsonRpcNotification
): value is JsonRpcNotification {
  return "method" in value && !("id" in value)
}
