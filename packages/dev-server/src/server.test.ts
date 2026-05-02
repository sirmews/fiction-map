import { describe, expect, test } from "bun:test"
import { DevServerState } from "./state"
import {
  createMetadataChangedNotification,
  dispatchRpcRequest,
  jsonRpcError,
  type JsonRpcRequest,
} from "./rpc"
import type {
  DefinitionOpenParams,
  DevServerGraphMetadata,
} from "./protocol"
import {
  DEV_SERVER_RPC_ERROR_CODES,
  DEV_SERVER_RPC_ERRORS,
} from "./protocol"

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

const TEST_METADATA: DevServerGraphMetadata = {
  nodeTypes: [
    {
      id: "scene",
      name: "SceneNode",
      location: { file: "nodes/scene.node.ts", line: 3, column: 1 },
      description: "Scene node",
      aiRule: "Scenes need outgoing choices",
      properties: {
        title: { type: "string", required: true },
      },
      outgoingEdges: ["choice"],
      incomingEdges: [],
    },
  ],
  edgeTypes: [
    {
      id: "choice",
      name: "ChoiceEdge",
      location: { file: "edges/choice.edge.ts", line: 4, column: 1 },
      description: "Choice edge",
      properties: {},
      sourceTypes: ["scene"],
      targetTypes: ["scene"],
    },
  ],
  conditions: [
    {
      id: "has-key",
      name: "HasKeyCondition",
      location: { file: "conditions/has-key.condition.ts", line: 5, column: 1 },
      parameters: {
        key: { type: "string", required: true },
      },
    },
  ],
  effects: [
    {
      id: "grant-key",
      name: "GrantKeyEffect",
      location: { file: "effects/grant-key.effect.ts", line: 6, column: 1 },
      parameters: {
        key: { type: "string", required: true },
      },
    },
  ],
  graphs: [
    {
      id: "story",
      name: "StoryGraph",
      location: { file: "story.graph.ts", line: 10, column: 1 },
      description: "Example story graph",
      nodes: [
        { id: "intro", type: "scene", title: "Intro" },
        { id: "ending", type: "scene", title: "Ending" },
      ],
      edges: [
        {
          id: "intro-to-ending",
          type: "choice",
          source: "intro",
          target: "ending",
          conditions: [{ type: "has-key", key: "gold" }],
          effects: [{ type: "grant-key", key: "silver" }],
        },
      ],
      nodeCount: 2,
      edgeCount: 1,
      maxDepth: 1,
      endings: ["ending"],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: ["has-key"],
      effectsUsed: ["grant-key"],
      errors: [],
      warnings: [
        {
          code: "UNUSED_EFFECT",
          message: "Example warning",
          edgeId: "intro-to-ending",
        },
      ],
    },
  ],
  validation: {
    errors: [
      {
        code: "UNREACHABLE_NODE",
        message: "The ending node is unreachable in another graph",
        nodeId: "ending",
      },
    ],
    warnings: [
      {
        code: "GRAPH_DEPTH",
        message: "Graph is shallow",
      },
    ],
  },
}

function createState(
  metadata: DevServerGraphMetadata = TEST_METADATA
): DevServerState<DevServerGraphMetadata> {
  return new DevServerState({
    rootDir: "/workspace/story",
    loadMetadata: async () => metadata,
    initialMetadata: metadata,
    initialLastRefreshAt: new Date("2026-05-03T10:00:00.000Z"),
  })
}

describe("RPC contract", () => {
  test("dispatches metadata and graph methods against current state", async () => {
    const state = createState()

    const metadataResponse = await dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 1, method: "metadata/get" },
      state,
    })
    const graphListResponse = await dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 2, method: "graph/list" },
      state,
    })
    const graphGetResponse = await dispatchRpcRequest({
      request: {
        jsonrpc: "2.0",
        id: 3,
        method: "graph/get",
        params: { graphId: "story" },
      },
      state,
    })

    expect(metadataResponse).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        metadata: TEST_METADATA,
        lastRefreshAt: "2026-05-03T10:00:00.000Z",
        refreshError: null,
      },
    })
    expect(graphListResponse).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: [
        {
          id: "story",
          name: "StoryGraph",
          location: TEST_METADATA.graphs[0].location,
          description: "Example story graph",
          nodeCount: 2,
          edgeCount: 1,
          errorCount: 0,
          warningCount: 1,
        },
      ],
    })
    expect(graphGetResponse).toEqual({
      jsonrpc: "2.0",
      id: 3,
      result: TEST_METADATA.graphs[0],
    })
  })

  test("dispatches refresh and definition open through injected task-local handlers", async () => {
    const refreshedMetadata: DevServerGraphMetadata = {
      ...TEST_METADATA,
      validation: {
        errors: [],
        warnings: [],
      },
    }

    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => refreshedMetadata,
      initialMetadata: TEST_METADATA,
      initialLastRefreshAt: new Date("2026-05-03T10:00:00.000Z"),
    })

    const refreshResponse = await dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 4, method: "metadata/refresh" },
      state,
    })

    const openCalls: DefinitionOpenParams[] = []
    const openResponse = await dispatchRpcRequest({
      request: {
        jsonrpc: "2.0",
        id: 5,
        method: "definition/open",
        params: { file: "nodes/scene.node.ts", line: 3, column: 1 },
      },
      state,
      openDefinition: async (params) => {
        openCalls.push(params)
        return {
          ok: true,
          location: params,
        }
      },
    })

    expect(refreshResponse).toEqual({
      jsonrpc: "2.0",
      id: 4,
      result: {
        metadata: refreshedMetadata,
        lastRefreshAt: expect.any(String),
        refreshError: null,
        refreshedAt: expect.any(String),
      },
    })
    expect((refreshResponse as { result: { refreshedAt: string } }).result.refreshedAt).toBe(
      (refreshResponse as { result: { lastRefreshAt: string } }).result.lastRefreshAt
    )
    expect(openCalls).toEqual([{ file: "nodes/scene.node.ts", line: 3, column: 1 }])
    expect(openResponse).toEqual({
      jsonrpc: "2.0",
      id: 5,
      result: {
        ok: true,
        location: { file: "nodes/scene.node.ts", line: 3, column: 1 },
      },
    })
  })

  test("adapts refresh failures into json-rpc errors without leaking internal stacks", async () => {
    const state = new DevServerState<DevServerGraphMetadata>({
      rootDir: "/workspace/story",
      loadMetadata: async () => {
        throw new Error("refresh failed")
      },
      initialMetadata: TEST_METADATA,
      initialLastRefreshAt: new Date("2026-05-03T10:00:00.000Z"),
    })

    const response = await dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 9, method: "metadata/refresh" },
      state,
    })

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 9,
      error: {
        code: DEV_SERVER_RPC_ERROR_CODES.metadataRefreshFailed,
        message: DEV_SERVER_RPC_ERRORS.metadataRefreshFailed.message,
        data: {
          refreshError: {
            message: "refresh failed",
          },
        },
      },
    })

    const snapshotResponse = await dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 10, method: "metadata/get" },
      state,
    })

    expect(snapshotResponse).toEqual({
      jsonrpc: "2.0",
      id: 10,
      result: {
        metadata: TEST_METADATA,
        lastRefreshAt: "2026-05-03T10:00:00.000Z",
        refreshError: {
          message: "refresh failed",
        },
      },
    })
  })

  test("adapts definition open handler failures into json-rpc errors", async () => {
    const state = createState()

    const response = await dispatchRpcRequest({
      request: {
        jsonrpc: "2.0",
        id: 11,
        method: "definition/open",
        params: { file: "nodes/scene.node.ts", line: 3, column: 1 },
      },
      state,
      openDefinition: async () => {
        throw new Error("editor launch failed")
      },
    })

    expect(response).toEqual(
      jsonRpcError(
        11,
        DEV_SERVER_RPC_ERROR_CODES.definitionOpenFailed,
        DEV_SERVER_RPC_ERRORS.definitionOpenFailed.message,
        {
          location: { file: "nodes/scene.node.ts", line: 3, column: 1 },
          reason: "editor launch failed",
        }
      )
    )
  })

  test("returns a json-rpc error when definition open capability is unavailable", async () => {
    const state = createState()

    const response = await dispatchRpcRequest({
      request: {
        jsonrpc: "2.0",
        id: 13,
        method: "definition/open",
        params: { file: "nodes/scene.node.ts", line: 3, column: 1 },
      },
      state,
    })

    expect(response).toEqual(
      jsonRpcError(
        13,
        DEV_SERVER_RPC_ERROR_CODES.definitionOpenUnavailable,
        DEV_SERVER_RPC_ERRORS.definitionOpenUnavailable.message,
        {
          location: { file: "nodes/scene.node.ts", line: 3, column: 1 },
        }
      )
    )
  })

  test("returns json-rpc method-not-found errors for unsupported methods", async () => {
    const state = createState()

    const response = await dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 6, method: "playtest/start" },
      state,
    })

    expect(response).toEqual(
      jsonRpcError(
        6,
        DEV_SERVER_RPC_ERROR_CODES.methodNotFound,
        `${DEV_SERVER_RPC_ERRORS.methodNotFound.messagePrefix}: playtest/start`
      )
    )
  })

  test("builds a stable metadata-changed notification payload", () => {
    const notification = createMetadataChangedNotification({
      reason: "file-change",
      changedPath: "nodes/scene.node.ts",
      refreshedAt: new Date("2026-05-03T10:05:00.000Z"),
    })

    expect(notification).toEqual({
      jsonrpc: "2.0",
      method: "notify/metadata-changed",
      params: {
        reason: "file-change",
        changedPath: "nodes/scene.node.ts",
        refreshedAt: "2026-05-03T10:05:00.000Z",
      },
    })
  })

  test("rejects malformed params for graph and definition lookups", async () => {
    const state = createState()

    const badGraphRequest: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 7,
      method: "graph/get",
      params: { id: "story" },
    }
    const badOpenRequest: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 8,
      method: "definition/open",
      params: { file: "nodes/scene.node.ts", line: "3" },
    }

    await expect(dispatchRpcRequest({ request: badGraphRequest, state })).resolves.toEqual(
      jsonRpcError(
        7,
        DEV_SERVER_RPC_ERROR_CODES.invalidParams,
        DEV_SERVER_RPC_ERRORS.invalidGraphGetParams.message
      )
    )
    await expect(dispatchRpcRequest({ request: badOpenRequest, state })).resolves.toEqual(
      jsonRpcError(
        8,
        DEV_SERVER_RPC_ERROR_CODES.invalidParams,
        DEV_SERVER_RPC_ERRORS.invalidDefinitionOpenParams.message
      )
    )
  })

  test("graph/get missing ids stay json-rpc errors", async () => {
    const state = createState()

    const response = await dispatchRpcRequest({
      request: {
        jsonrpc: "2.0",
        id: 12,
        method: "graph/get",
        params: { graphId: "missing" },
      },
      state,
    })

    expect(response).toEqual(
      jsonRpcError(
        12,
        DEV_SERVER_RPC_ERROR_CODES.graphNotFound,
        `${DEV_SERVER_RPC_ERRORS.graphNotFound.messagePrefix}: missing`
      )
    )
  })

  test("metadata/refresh joins the current in-flight refresh work", async () => {
    const first = deferred<DevServerGraphMetadata>()
    let callCount = 0

    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => {
        callCount += 1
        return first.promise
      },
      initialMetadata: TEST_METADATA,
      initialLastRefreshAt: new Date("2026-05-03T10:00:00.000Z"),
    })

    const firstDispatch = dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 14, method: "metadata/refresh" },
      state,
    })
    const secondDispatch = dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 15, method: "metadata/refresh" },
      state,
    })

    first.resolve(TEST_METADATA)

    const [firstResponse, secondResponse] = await Promise.all([firstDispatch, secondDispatch])

    expect(callCount).toBe(1)
    expect(firstResponse).toEqual({
      jsonrpc: "2.0",
      id: 14,
      result: {
        metadata: TEST_METADATA,
        lastRefreshAt: expect.any(String),
        refreshError: null,
        refreshedAt: expect.any(String),
      },
    })
    expect(secondResponse).toEqual({
      jsonrpc: "2.0",
      id: 15,
      result: {
        metadata: TEST_METADATA,
        lastRefreshAt: expect.any(String),
        refreshError: null,
        refreshedAt: expect.any(String),
      },
    })
    expect(
      (firstResponse as { result: { refreshedAt: string } }).result.refreshedAt
    ).toBe((secondResponse as { result: { refreshedAt: string } }).result.refreshedAt)
  })

  test("metadata/refresh joins the current cycle even when state already has a queued refresh", async () => {
    const first = deferred<DevServerGraphMetadata>()
    const second = deferred<DevServerGraphMetadata>()
    let callCount = 0

    const refreshedMetadata: DevServerGraphMetadata = {
      ...TEST_METADATA,
      validation: {
        errors: [],
        warnings: [],
      },
    }

    const state = new DevServerState({
      rootDir: "/workspace/story",
      loadMetadata: async () => {
        callCount += 1
        return callCount === 1 ? first.promise : second.promise
      },
      initialMetadata: TEST_METADATA,
      initialLastRefreshAt: new Date("2026-05-03T10:00:00.000Z"),
    })

    const currentRefresh = state.refresh()
    const queuedRefresh = state.queueRefresh()
    const dispatchRefresh = dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 16, method: "metadata/refresh" },
      state,
    })

    first.resolve(TEST_METADATA)
    const dispatchResponse = await dispatchRefresh
    const currentResult = await currentRefresh

    expect(callCount).toBe(2)
    expect(dispatchResponse).toEqual({
      jsonrpc: "2.0",
      id: 16,
      result: {
        metadata: TEST_METADATA,
        lastRefreshAt: expect.any(String),
        refreshError: null,
        refreshedAt: expect.any(String),
      },
    })
    expect(currentResult.metadata).toEqual(TEST_METADATA)
    expect(
      (dispatchResponse as { result: { refreshedAt: string } }).result.refreshedAt
    ).toBe(currentResult.refreshedAt.toISOString())

    second.resolve(refreshedMetadata)
    const queuedResult = await queuedRefresh

    expect(queuedResult.metadata).toEqual(refreshedMetadata)
  })
})
