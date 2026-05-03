import { useEffect, useMemo, useRef, useState } from "react"
import type {
  MetadataChangedNotificationParams,
  MetadataSnapshot,
} from "@fiction-map/dev-server"
import {
  createDevServerRpcClient,
  type DashboardConnectionState,
  type DevServerRpcClient,
} from "../lib/rpc-client"

export interface UseMetadataResult {
  connectionState: DashboardConnectionState
  error: string | null
  isLoading: boolean
  isRefreshing: boolean
  lastNotification: MetadataChangedNotificationParams | null
  metadataAvailable: boolean
  refresh(): Promise<void>
  refreshError: string | null
  snapshot: MetadataSnapshot | null
}

let defaultClient: DevServerRpcClient | null = null
const inFlightSnapshotLoads = new WeakMap<DevServerRpcClient, Promise<MetadataSnapshot>>()

function getDefaultClient(): DevServerRpcClient {
  defaultClient ??= createDevServerRpcClient()
  return defaultClient
}

function loadSnapshot(client: DevServerRpcClient): Promise<MetadataSnapshot> {
  const existing = inFlightSnapshotLoads.get(client)
  if (existing) {
    return existing
  }

  const pending = client.getMetadata().finally(() => {
    inFlightSnapshotLoads.delete(client)
  })
  inFlightSnapshotLoads.set(client, pending)
  return pending
}

export function useMetadata(client: DevServerRpcClient = getDefaultClient()): UseMetadataResult {
  const [connectionState, setConnectionState] = useState<DashboardConnectionState>(
    client.getConnectionState()
  )
  const [snapshot, setSnapshot] = useState<MetadataSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [lastNotification, setLastNotification] =
    useState<MetadataChangedNotificationParams | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let active = true

    const syncSnapshot = async () => {
      if (!active) {
        return
      }

      setIsLoading(!hasLoadedRef.current)

      try {
        const nextSnapshot = await loadSnapshot(client)
        if (!active) {
          return
        }

        hasLoadedRef.current = true
        setSnapshot(nextSnapshot)
        setError(null)
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(toErrorMessage(loadError))
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    const unsubscribeConnection = client.subscribeConnectionState((nextState) => {
      if (!active) {
        return
      }

      setConnectionState(nextState)
      if (nextState === "connected") {
        void syncSnapshot()
      }
    })

    const unsubscribeMetadataChanged = client.subscribeMetadataChanged((notification) => {
      if (!active) {
        return
      }

      setLastNotification(notification)
      void syncSnapshot()
    })

    return () => {
      active = false
      unsubscribeConnection()
      unsubscribeMetadataChanged()
    }
  }, [client])

  const refresh = useMemo(
    () => async () => {
      setIsRefreshing(true)
      setRefreshError(null)

      try {
        const result = await client.refreshMetadata()
        setSnapshot(result)
        setError(null)
      } catch (nextError) {
        const message = toErrorMessage(nextError)
        setRefreshError(message)
        setError(message)
      } finally {
        try {
          const latestSnapshot = await client.getMetadata()
          setSnapshot(latestSnapshot)
        } catch (loadError) {
          setError(toErrorMessage(loadError))
        } finally {
          setIsRefreshing(false)
        }
      }
    },
    [client]
  )

  return {
    connectionState,
    error,
    isLoading,
    isRefreshing,
    lastNotification,
    metadataAvailable: snapshot?.metadata !== null,
    refresh,
    refreshError,
    snapshot,
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}
