import { describe, expect, test } from "vitest"
import type { MetadataSnapshot } from "@fiction-map/dev-server"
import { buildCatalogModel } from "./catalog-model"
import { buildDashboardProjectModel } from "./project-model"

function createSnapshot(): MetadataSnapshot {
  return {
    metadata: {
      nodeTypes: [
        {
          id: "scene",
          name: "Scene",
          location: { file: "nodes/scene.node.ts", line: 1, column: 1 },
          properties: {},
          outgoingEdges: ["choice"],
          incomingEdges: [],
        },
      ],
      edgeTypes: [
        {
          id: "choice",
          name: "Choice",
          location: { file: "edges/choice.edge.ts", line: 1, column: 1 },
          properties: {},
          sourceTypes: ["scene"],
          targetTypes: ["scene"],
        },
      ],
      conditions: [
        {
          id: "has-key",
          name: "Has Key",
          location: { file: "conditions/has-key.condition.ts", line: 1, column: 1 },
          parameters: {},
        },
      ],
      effects: [
        {
          id: "gain-key",
          name: "Gain Key",
          location: { file: "effects/gain-key.effect.ts", line: 1, column: 1 },
          parameters: {},
        },
      ],
      graphs: [
        {
          id: "prologue",
          name: "Prologue",
          location: { file: "graphs/prologue.graph.ts", line: 1, column: 1 },
          nodes: [{ id: "start", type: "scene" }],
          edges: [],
          nodeCount: 1,
          edgeCount: 0,
          maxDepth: 0,
          endings: ["start"],
          nodeTypesUsed: ["scene"],
          edgeTypesUsed: [],
          conditionsUsed: [],
          effectsUsed: [],
          errors: [],
          warnings: [],
        },
        {
          id: "story",
          name: "Story",
          location: { file: "graphs/story.graph.ts", line: 1, column: 1 },
          nodes: [{ id: "middle", type: "scene" }],
          edges: [],
          nodeCount: 1,
          edgeCount: 0,
          maxDepth: 0,
          endings: ["middle"],
          nodeTypesUsed: ["scene"],
          edgeTypesUsed: ["choice"],
          conditionsUsed: ["has-key"],
          effectsUsed: ["gain-key"],
          errors: [
            {
              code: "graph-error",
              message: "Graph error",
            },
          ],
          warnings: [
            {
              code: "graph-warning",
              message: "Graph warning",
            },
          ],
        },
      ],
      validation: {
        errors: [],
        warnings: [],
      },
    },
    lastRefreshAt: "2026-05-03T12:00:00.000Z",
    refreshError: null,
  }
}

describe("buildCatalogModel", () => {
  test("builds stable graph and definition catalog entries from the canonical model", () => {
    const projectModel = buildDashboardProjectModel(createSnapshot())

    const catalogModel = buildCatalogModel(projectModel)

    expect(catalogModel.summary).toEqual({
      graphs: 2,
      nodeTypes: 1,
      edgeTypes: 1,
      conditions: 1,
      effects: 1,
    })
    expect(catalogModel.graphs.map((entry) => entry.id)).toEqual(["prologue", "story"])
    expect(catalogModel.graphs[1]).toEqual({
      id: "story",
      name: "Story",
      nodeCount: 1,
      edgeCount: 0,
      errorCount: 1,
      warningCount: 1,
    })
    expect(catalogModel.nodeTypes).toEqual([
      {
        id: "scene",
        name: "Scene",
        usedByGraphIds: ["prologue", "story"],
        outgoingEdgeTypeIds: ["choice"],
        incomingEdgeTypeIds: [],
      },
    ])
    expect(catalogModel.edgeTypes).toEqual([
      {
        id: "choice",
        name: "Choice",
        usedByGraphIds: ["story"],
        sourceNodeTypeIds: ["scene"],
        targetNodeTypeIds: ["scene"],
      },
    ])
    expect(catalogModel.conditions).toEqual([
      {
        id: "has-key",
        name: "Has Key",
        usedByGraphIds: ["story"],
      },
    ])
    expect(catalogModel.effects).toEqual([
      {
        id: "gain-key",
        name: "Gain Key",
        usedByGraphIds: ["story"],
      },
    ])
  })
})
