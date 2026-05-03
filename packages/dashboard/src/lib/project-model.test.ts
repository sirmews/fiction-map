import { describe, expect, test } from "vitest"
import type { MetadataSnapshot } from "@fiction-map/dev-server"
import { buildDashboardProjectModel } from "./project-model"

function createSnapshot(): MetadataSnapshot {
  return {
    metadata: {
      nodeTypes: [
        {
          id: "scene",
          name: "Scene",
          description: "Story scene node",
          location: {
            file: "nodes/scene.node.ts",
            line: 10,
            column: 2,
          },
          properties: {},
          outgoingEdges: ["choice"],
          incomingEdges: ["choice"],
        },
        {
          id: "ending",
          name: "Ending",
          location: {
            file: "nodes/ending.node.ts",
            line: 20,
            column: 2,
          },
          properties: {},
          outgoingEdges: [],
          incomingEdges: ["choice"],
        },
      ],
      edgeTypes: [
        {
          id: "choice",
          name: "Choice",
          location: {
            file: "edges/choice.edge.ts",
            line: 4,
            column: 1,
          },
          properties: {},
          sourceTypes: ["scene"],
          targetTypes: ["scene", "ending"],
        },
      ],
      conditions: [
        {
          id: "has-key",
          name: "Has Key",
          location: {
            file: "conditions/has-key.condition.ts",
            line: 2,
            column: 1,
          },
          parameters: {},
        },
      ],
      effects: [
        {
          id: "gain-key",
          name: "Gain Key",
          location: {
            file: "effects/gain-key.effect.ts",
            line: 2,
            column: 1,
          },
          parameters: {},
        },
      ],
      graphs: [
        {
          id: "story",
          name: "Story",
          description: "Main story graph",
          location: {
            file: "graphs/story.graph.ts",
            line: 5,
            column: 1,
          },
          nodes: [
            { id: "start", type: "scene" },
            { id: "branch", type: "scene" },
            { id: "end", type: "ending" },
          ],
          edges: [
            { id: "c1", type: "choice", source: "start", target: "branch" },
            { id: "c2", type: "choice", source: "branch", target: "end" },
          ],
          nodeCount: 3,
          edgeCount: 2,
          maxDepth: 2,
          endings: ["end"],
          nodeTypesUsed: ["scene", "ending"],
          edgeTypesUsed: ["choice"],
          conditionsUsed: ["has-key"],
          effectsUsed: ["gain-key"],
          errors: [
            {
              code: "dangling-node",
              message: "Node is missing content",
              nodeId: "branch",
            },
          ],
          warnings: [
            {
              code: "unlabelled-edge",
              message: "Choice edge should have display text",
              edgeId: "c2",
            },
          ],
        },
      ],
      validation: {
        errors: [
          {
            code: "graph-error",
            message: "Project validation error",
            location: {
              file: "graphs/story.graph.ts",
              line: 18,
              column: 3,
            },
          },
        ],
        warnings: [
          {
            code: "project-warning",
            message: "Project validation warning",
          },
        ],
      },
    },
    lastRefreshAt: "2026-05-03T12:00:00.000Z",
    refreshError: null,
  }
}

describe("buildDashboardProjectModel", () => {
  test("normalizes dashboard project records and preserves stable iteration order", () => {
    const model = buildDashboardProjectModel(createSnapshot())

    expect(model.snapshot.metadataAvailable).toBe(true)
    expect(model.snapshot.lastRefreshAt).toBe("2026-05-03T12:00:00.000Z")
    expect(model.project.counts).toEqual({
      graphs: 1,
      nodeTypes: 2,
      edgeTypes: 1,
      conditions: 1,
      effects: 1,
    })
    expect(model.catalogs.graphs.map((graph) => graph.id)).toEqual(["story"])
    expect(model.catalogs.nodeTypes.map((nodeType) => nodeType.id)).toEqual([
      "scene",
      "ending",
    ])
    expect(model.catalogs.graphById.story.name).toBe("Story")
    expect(model.catalogs.nodeTypeById.scene.outgoingEdgeTypeIds).toEqual(["choice"])
    expect(model.catalogs.edgeTypeById.choice.targetNodeTypeIds).toEqual([
      "scene",
      "ending",
    ])
  })

  test("derives graph usage and reverse definition lookups once", () => {
    const model = buildDashboardProjectModel(createSnapshot())

    expect(model.catalogs.graphById.story.usedNodeTypeIds).toEqual(["scene", "ending"])
    expect(model.catalogs.graphById.story.usedEdgeTypeIds).toEqual(["choice"])
    expect(model.catalogs.graphById.story.usedConditionIds).toEqual(["has-key"])
    expect(model.catalogs.graphById.story.usedEffectIds).toEqual(["gain-key"])

    expect(model.relationships.graphIdsByNodeTypeId.scene).toEqual(["story"])
    expect(model.relationships.graphIdsByNodeTypeId.ending).toEqual(["story"])
    expect(model.relationships.graphIdsByEdgeTypeId.choice).toEqual(["story"])
    expect(model.relationships.graphIdsByConditionId["has-key"]).toEqual(["story"])
    expect(model.relationships.graphIdsByEffectId["gain-key"]).toEqual(["story"])
  })

  test("indexes validation issues by graph, node, and edge when identifiers are available", () => {
    const model = buildDashboardProjectModel(createSnapshot())

    expect(model.project.validationCounts).toEqual({
      errors: 1,
      warnings: 1,
    })
    expect(model.validation.errors.map((issue) => issue.code)).toEqual(["graph-error"])
    expect(model.validation.warnings.map((issue) => issue.code)).toEqual([
      "project-warning",
    ])

    expect(model.validation.byGraphId.story.errors.map((issue) => issue.code)).toEqual([
      "dangling-node",
    ])
    expect(model.validation.byGraphId.story.warnings.map((issue) => issue.code)).toEqual([
      "unlabelled-edge",
    ])
    expect(model.validation.byNodeId.branch.map((issue) => issue.code)).toEqual([
      "dangling-node",
    ])
    expect(model.validation.byEdgeId.c2.map((issue) => issue.code)).toEqual([
      "unlabelled-edge",
    ])
  })

  test("keeps metadata-unavailable state honest instead of inventing graph structure", () => {
    const model = buildDashboardProjectModel({
      metadata: null,
      lastRefreshAt: null,
      refreshError: {
        message: "Metadata refresh failed",
      },
    })

    expect(model.snapshot).toEqual({
      metadataAvailable: false,
      lastRefreshAt: null,
      refreshErrorMessage: "Metadata refresh failed",
    })
    expect(model.project.counts).toEqual({
      graphs: 0,
      nodeTypes: 0,
      edgeTypes: 0,
      conditions: 0,
      effects: 0,
    })
    expect(model.catalogs.graphs).toEqual([])
    expect(model.catalogs.nodeTypes).toEqual([])
    expect(model.relationships.graphIdsByNodeTypeId).toEqual({})
    expect(model.validation.errors).toEqual([])
    expect(model.validation.warnings).toEqual([])
  })
})
