import React from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type {
  MetadataChangedNotificationParams,
  MetadataRefreshResult,
  MetadataSnapshot,
} from "@fiction-map/dev-server"
import type {
  DashboardConnectionState,
  DevServerRpcClient,
} from "../lib/rpc-client"
import { useMetadata } from "./useMetadata"

class FakeRpcClient implements DevServerRpcClient {
  connectionState: DashboardConnectionState = "connecting"
  metadataSnapshot: MetadataSnapshot = {
    metadata: null,
    lastRefreshAt: null,
    refreshError: null,
  }
  refreshError: Error | null = null
  getMetadataCallCount = 0

  private connectionListeners = new Set<(state: DashboardConnectionState) => void>()
  private metadataChangedListeners =
    new Set<(params: MetadataChangedNotificationParams) => void>()

  destroy(): void {}

  getConnectionState(): DashboardConnectionState {
    return this.connectionState
  }

  async getMetadata(): Promise<MetadataSnapshot> {
    this.getMetadataCallCount += 1
    return this.metadataSnapshot
  }

  async refreshMetadata(): Promise<MetadataRefreshResult> {
    if (this.refreshError) {
      throw this.refreshError
    }

    return {
      ...this.metadataSnapshot,
      refreshedAt: this.metadataSnapshot.lastRefreshAt ?? "2026-05-03T10:20:00.000Z",
    }
  }

  async request<TResult>(): Promise<TResult> {
    throw new Error("Generic request is not used in this test")
  }

  subscribeConnectionState(listener: (state: DashboardConnectionState) => void): () => void {
    this.connectionListeners.add(listener)
    listener(this.connectionState)
    return () => {
      this.connectionListeners.delete(listener)
    }
  }

  subscribeMetadataChanged(
    listener: (params: MetadataChangedNotificationParams) => void
  ): () => void {
    this.metadataChangedListeners.add(listener)
    return () => {
      this.metadataChangedListeners.delete(listener)
    }
  }

  emitConnectionState(state: DashboardConnectionState): void {
    this.connectionState = state
    for (const listener of this.connectionListeners) {
      listener(state)
    }
  }

  emitMetadataChanged(params: MetadataChangedNotificationParams): void {
    for (const listener of this.metadataChangedListeners) {
      listener(params)
    }
  }
}

describe("useMetadata", () => {
  test("loads metadata once connected and reloads after metadata-changed notifications", async () => {
    const client = new FakeRpcClient()
    client.metadataSnapshot = {
      metadata: {
        nodeTypes: [],
        edgeTypes: [],
        conditions: [],
        effects: [],
        graphs: [],
        validation: {
          errors: [],
          warnings: [],
        },
      },
      lastRefreshAt: "2026-05-03T10:00:00.000Z",
      refreshError: null,
    }

    const { result } = renderHook(() => useMetadata(client))

    act(() => {
      client.emitConnectionState("connected")
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.metadataAvailable).toBe(true)
      expect(result.current.snapshot?.lastRefreshAt).toBe("2026-05-03T10:00:00.000Z")
    })

    client.metadataSnapshot = {
      ...client.metadataSnapshot,
      lastRefreshAt: "2026-05-03T10:05:00.000Z",
    }

    act(() => {
      client.emitMetadataChanged({
        reason: "file-change",
        refreshedAt: "2026-05-03T10:05:00.000Z",
      })
    })

    await waitFor(() => {
      expect(result.current.lastNotification?.reason).toBe("file-change")
      expect(result.current.snapshot?.lastRefreshAt).toBe("2026-05-03T10:05:00.000Z")
    })
  })

  test("surfaces manual refresh failures and preserves the latest server snapshot", async () => {
    const client = new FakeRpcClient()
    client.connectionState = "connected"
    client.metadataSnapshot = {
      metadata: null,
      lastRefreshAt: "2026-05-03T10:10:00.000Z",
      refreshError: {
        message: "Metadata refresh failed on the server",
      },
    }
    client.refreshError = new Error("Refresh request failed")

    const { result } = renderHook(() => useMetadata(client))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.refreshError).toBe("Refresh request failed")
    expect(result.current.snapshot?.refreshError?.message).toBe(
      "Metadata refresh failed on the server"
    )
  })

  test("does not double-fetch metadata on mount when the client is already connected", async () => {
    const client = new FakeRpcClient()
    client.connectionState = "connected"
    client.metadataSnapshot = {
      metadata: null,
      lastRefreshAt: "2026-05-03T10:10:00.000Z",
      refreshError: null,
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>{children}</React.StrictMode>
    )

    const { result } = renderHook(() => useMetadata(client), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(client.getMetadataCallCount).toBe(1)
  })
})
