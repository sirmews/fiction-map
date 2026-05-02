import { describe, expect, test } from "bun:test"
import { DevServerState, type DevServerMetadataValue } from "./state"

function deferred<T>(): {
  promise: Promise<T>
  resolve(value: T): void
  reject(error: unknown): void
} {
  let resolvePromise!: (value: T) => void
  let rejectPromise!: (error: unknown) => void

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  }
}

type TestMetadata = DevServerMetadataValue & {
  graph?: {
    nodes: Array<{ id: string }>
  }
  version?: number
}

describe("DevServerState", () => {
  test("clones seed metadata and getSnapshot returns defensive copies", () => {
    const initialMetadata = { graph: { nodes: [{ id: "a" }] } }
    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => ({ graph: { nodes: [{ id: "a" }] } }),
      initialMetadata,
      initialLastRefreshAt: new Date("2026-05-03T00:00:00.000Z"),
    })

    initialMetadata.graph.nodes.push({ id: "seed-mutation" })

    const snapshot = state.getSnapshot() as {
      metadata: { graph: { nodes: Array<{ id: string }> } } | null
      lastRefreshAt: Date | null
    }

    snapshot.metadata?.graph.nodes.push({ id: "mutated" })
    snapshot.lastRefreshAt?.setUTCFullYear(2030)

    const nextSnapshot = state.getSnapshot() as {
      metadata: { graph: { nodes: Array<{ id: string }> } } | null
      lastRefreshAt: Date | null
    }

    expect(nextSnapshot.metadata?.graph.nodes).toEqual([{ id: "a" }])
    expect(nextSnapshot.lastRefreshAt?.toISOString()).toBe("2026-05-03T00:00:00.000Z")
  })

  test("refresh waits for the current cycle instead of queueing another one", async () => {
    const first = deferred<{ version: number }>()
    let callCount = 0

    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => {
        callCount += 1
        return first.promise
      },
    })

    const firstRefresh = state.refresh()
    const secondRefresh = state.refresh()

    expect(state.getSnapshot().isRefreshing).toBe(true)

    first.resolve({ version: 1 })

    const [firstResult, secondResult] = await Promise.all([firstRefresh, secondRefresh])

    expect(callCount).toBe(1)
    expect(firstResult.metadata).toEqual({ version: 1 })
    expect(secondResult.metadata).toEqual({ version: 1 })
    expect(state.getSnapshot().metadata).toEqual({ version: 1 })
    expect(state.getSnapshot().isRefreshing).toBe(false)
  })

  test("queueRefresh schedules a follow-up cycle while a refresh is in flight", async () => {
    const first = deferred<{ version: number }>()
    const second = deferred<{ version: number }>()
    let callCount = 0

    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => {
        callCount += 1
        return callCount === 1 ? first.promise : second.promise
      },
    })

    const currentRefresh = state.refresh()
    const queuedRefresh = state.queueRefresh()

    first.resolve({ version: 1 })
    await Promise.resolve()
    second.resolve({ version: 2 })

    const [currentResult, queuedResult] = await Promise.all([currentRefresh, queuedRefresh])

    expect(callCount).toBe(2)
    expect(currentResult.metadata).toEqual({ version: 1 })
    expect(queuedResult.metadata).toEqual({ version: 2 })
  })

  test("multiple queueRefresh calls during the same in-flight cycle share one queued cycle", async () => {
    const first = deferred<{ version: number }>()
    const second = deferred<{ version: number }>()
    let callCount = 0

    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => {
        callCount += 1
        return callCount === 1 ? first.promise : second.promise
      },
    })

    const currentRefresh = state.refresh()
    const queuedRefreshA = state.queueRefresh()
    const queuedRefreshB = state.queueRefresh()

    first.resolve({ version: 1 })
    await Promise.resolve()
    second.resolve({ version: 2 })

    const [currentResult, queuedResultA, queuedResultB] = await Promise.all([
      currentRefresh,
      queuedRefreshA,
      queuedRefreshB,
    ])

    expect(callCount).toBe(2)
    expect(currentResult.metadata).toEqual({ version: 1 })
    expect(queuedResultA.metadata).toEqual({ version: 2 })
    expect(queuedResultB.metadata).toEqual({ version: 2 })
  })

  test("queueRefresh starts a refresh immediately when idle", async () => {
    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => ({ version: 1 }),
    })

    const result = await state.queueRefresh()

    expect(result.metadata).toEqual({ version: 1 })
    expect(state.getSnapshot().metadata).toEqual({ version: 1 })
  })

  test("keeps last good metadata and surfaces the latest error when the current cycle fails", async () => {
    const first = deferred<{ version: number }>()
    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => first.promise,
      initialMetadata: { version: 0 },
      initialLastRefreshAt: new Date("2026-05-03T00:00:00.000Z"),
    })

    const refresh = state.refresh()
    const followUp = state.queueRefresh()
    const refreshFailure = refresh.catch((error) => error)
    const followUpFailure = followUp.catch((error) => error)

    first.reject(new Error("refresh failed"))

    expect(await refreshFailure).toBeInstanceOf(Error)
    expect(await followUpFailure).toBeInstanceOf(Error)
    expect((await refreshFailure).message).toBe("refresh failed")
    expect((await followUpFailure).message).toBe("refresh failed")

    const snapshot = state.getSnapshot() as {
      metadata: { version: number } | null
      refreshError: { message: string } | null
    }

    expect(snapshot.metadata).toEqual({ version: 0 })
    expect(snapshot.refreshError?.message).toBe("refresh failed")
    expect(snapshot.lastRefreshAt?.toISOString()).toBe("2026-05-03T00:00:00.000Z")
  })

  test("a queued refresh can still succeed after the current cycle fails", async () => {
    const first = deferred<{ version: number }>()
    const second = deferred<{ version: number }>()
    let callCount = 0

    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => {
        callCount += 1
        return callCount === 1 ? first.promise : second.promise
      },
      initialMetadata: { version: 0 },
      initialLastRefreshAt: new Date("2026-05-03T00:00:00.000Z"),
    })

    const currentRefresh = state.refresh()
    const queuedRefresh = state.queueRefresh()

    first.reject(new Error("first refresh failed"))
    await expect(currentRefresh).rejects.toThrow("first refresh failed")

    second.resolve({ version: 2 })
    const queuedResult = await queuedRefresh

    expect(queuedResult.metadata).toEqual({ version: 2 })
    expect(state.getSnapshot().metadata).toEqual({ version: 2 })
    expect(state.getSnapshot().refreshError).toBeNull()
  })

  test("commits cloned refresh metadata instead of storing external references", async () => {
    const loadedMetadata = { graph: { nodes: [{ id: "from-loader" }] } }
    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => loadedMetadata,
    })

    const result = await state.refresh() as {
      metadata: { graph: { nodes: Array<{ id: string }> } }
    }

    loadedMetadata.graph.nodes.push({ id: "external-mutation" })
    result.metadata.graph.nodes.push({ id: "result-mutation" })

    const snapshot = state.getSnapshot() as {
      metadata: { graph: { nodes: Array<{ id: string }> } } | null
    }

    expect(snapshot.metadata?.graph.nodes).toEqual([{ id: "from-loader" }])
  })
})
