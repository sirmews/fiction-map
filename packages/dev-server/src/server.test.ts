import { describe, expect, test } from "bun:test"
import type { GraphMetadata } from "@fiction-map/core"
import { DevServerState } from "./state"
import {
  createMetadataChangedNotification,
  dispatchRpcRequest,
  jsonRpcError,
  type DefinitionOpenParams,
  type JsonRpcRequest,
} from "./rpc"

const TEST_METADATA: GraphMetadata = {
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

function createState(metadata: GraphMetadata = TEST_METADATA): DevServerState<GraphMetadata> {
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
    const refreshedMetadata: GraphMetadata = {
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

  test("returns json-rpc method-not-found errors for unsupported methods", async () => {
    const state = createState()

    const response = await dispatchRpcRequest({
      request: { jsonrpc: "2.0", id: 6, method: "playtest/start" },
      state,
    })

    expect(response).toEqual(jsonRpcError(6, -32601, "Method not found: playtest/start"))
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
      jsonRpcError(7, -32602, "Invalid params for graph/get")
    )
    await expect(dispatchRpcRequest({ request: badOpenRequest, state })).resolves.toEqual(
      jsonRpcError(8, -32602, "Invalid params for definition/open")
    )
  })
})
