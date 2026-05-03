import React from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type {
  MetadataChangedNotificationParams,
  MetadataRefreshResult,
  MetadataSnapshot,
} from "@fiction-map/dev-server"
import { App } from "./App"
import type {
  DashboardConnectionState,
  DevServerRpcClient,
} from "./lib/rpc-client"

class FakeRpcClient implements DevServerRpcClient {
  connectionState: DashboardConnectionState = "connected"
  metadataSnapshot: MetadataSnapshot = {
    metadata: null,
    lastRefreshAt: null,
    refreshError: null,
  }
  refreshError: Error | null = null

  private connectionListeners = new Set<(state: DashboardConnectionState) => void>()
  private metadataChangedListeners =
    new Set<(params: MetadataChangedNotificationParams) => void>()

  destroy(): void {}

  getConnectionState(): DashboardConnectionState {
    return this.connectionState
  }

  async getMetadata(): Promise<MetadataSnapshot> {
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
}

describe("App", () => {
  test("renders honest unavailable-metadata context when the snapshot is missing", async () => {
    const client = new FakeRpcClient()
    client.metadataSnapshot = {
      metadata: null,
      lastRefreshAt: null,
      refreshError: {
        message: "Metadata refresh failed on the server",
      },
    }

    render(
      <React.StrictMode>
        <App client={client} />
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(screen.getByText("Fiction Map Project Summary")).toBeTruthy()
    })

    expect(screen.getByText("Metadata")).toBeTruthy()
    expect(screen.getByText("unavailable")).toBeTruthy()
    expect(
      screen.getByText(/Metadata is not available yet, so the dashboard can only describe the intended architecture boundary./)
    ).toBeTruthy()
    expect(screen.queryByText(/The current live snapshot exposes 0 graphs/)).toBeNull()
  })
})
