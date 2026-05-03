import { describe, expect, test, vi } from "vitest"
import { DEV_SERVER_RPC_NOTIFICATIONS } from "@fiction-map/dev-server"
import {
  createDevServerRpcClient,
  type WebSocketLike,
} from "./rpc-client"

class FakeWebSocket implements WebSocketLike {
  sentMessages: string[] = []

  private listeners = {
    close: new Set<() => void>(),
    error: new Set<() => void>(),
    message: new Set<(event: { data: unknown }) => void>(),
    open: new Set<() => void>(),
  }

  addEventListener(
    type: "open" | "error" | "close" | "message",
    listener: (() => void) | ((event: { data: unknown }) => void)
  ): void {
    this.listeners[type].add(listener as never)
  }

  removeEventListener(
    type: "open" | "error" | "close" | "message",
    listener: (() => void) | ((event: { data: unknown }) => void)
  ): void {
    this.listeners[type].delete(listener as never)
  }

  send(data: string): void {
    this.sentMessages.push(data)
  }

  close(): void {
    this.emit("close")
  }

  emit(type: "open" | "error" | "close"): void {
    for (const listener of this.listeners[type]) {
      listener()
    }
  }

  emitMessage(data: unknown): void {
    for (const listener of this.listeners.message) {
      listener({ data })
    }
  }
}

describe("createDevServerRpcClient", () => {
  test("sends JSON-RPC requests and dispatches metadata notifications", async () => {
    const socket = new FakeWebSocket()
    const client = createDevServerRpcClient({
      webSocketFactory: () => socket,
    })

    const notifications: string[] = []
    client.subscribeMetadataChanged((params) => {
      notifications.push(params.reason)
    })

    socket.emit("open")

    const metadataPromise = client.getMetadata()
    await Promise.resolve()
    expect(JSON.parse(socket.sentMessages[0])).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      method: "metadata/get",
    })

    socket.emitMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          metadata: null,
          lastRefreshAt: null,
          refreshError: null,
        },
      })
    )

    await expect(metadataPromise).resolves.toEqual({
      metadata: null,
      lastRefreshAt: null,
      refreshError: null,
    })

    socket.emitMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        method: DEV_SERVER_RPC_NOTIFICATIONS.metadataChanged,
        params: {
          reason: "file-change",
          refreshedAt: "2026-05-03T10:15:00.000Z",
        },
      })
    )

    expect(notifications).toEqual(["file-change"])
    client.destroy()
  })

  test("reports disconnect and reconnects automatically", () => {
    vi.useFakeTimers()

    const sockets: FakeWebSocket[] = []
    const client = createDevServerRpcClient({
      reconnectDelayMs: 25,
      webSocketFactory: () => {
        const socket = new FakeWebSocket()
        sockets.push(socket)
        return socket
      },
    })

    const states: string[] = []
    client.subscribeConnectionState((state) => {
      states.push(state)
    })

    sockets[0].emit("open")
    sockets[0].emit("close")

    vi.advanceTimersByTime(25)
    expect(sockets).toHaveLength(2)

    sockets[1].emit("open")

    expect(states).toEqual([
      "connecting",
      "connected",
      "disconnected",
      "connecting",
      "connected",
    ])

    client.destroy()
    vi.useRealTimers()
  })

  test("rejects requests waiting for an unopened connection when the client is destroyed", async () => {
    const socket = new FakeWebSocket()
    const client = createDevServerRpcClient({
      webSocketFactory: () => socket,
    })

    const requestPromise = client.getMetadata()
    client.destroy()

    await expect(requestPromise).rejects.toThrow(
      "RPC client destroyed before the connection became ready"
    )
  })

  test("rejects requests issued after the client has been destroyed", async () => {
    const socket = new FakeWebSocket()
    const client = createDevServerRpcClient({
      webSocketFactory: () => socket,
    })

    client.destroy()

    await expect(client.getMetadata()).rejects.toThrow("RPC client is destroyed")
  })

  test("rejects requests that lose the connection during the open-to-request race", async () => {
    const socket = new FakeWebSocket()
    const client = createDevServerRpcClient({
      webSocketFactory: () => socket,
    })

    const requestPromise = client.getMetadata()
    socket.emit("open")
    client.destroy()

    await expect(requestPromise).rejects.toThrow("RPC client is not connected")
    expect(socket.sentMessages).toHaveLength(0)
  })

  test("ignores malformed websocket frames and continues processing later responses", async () => {
    const socket = new FakeWebSocket()
    const client = createDevServerRpcClient({
      webSocketFactory: () => socket,
    })

    socket.emit("open")

    const metadataPromise = client.getMetadata()
    await Promise.resolve()

    socket.emitMessage("this is not json")
    socket.emitMessage(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: {
          metadata: null,
          lastRefreshAt: null,
          refreshError: null,
        },
      })
    )

    await expect(metadataPromise).resolves.toEqual({
      metadata: null,
      lastRefreshAt: null,
      refreshError: null,
    })

    client.destroy()
  })
})
