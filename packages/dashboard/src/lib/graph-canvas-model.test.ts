import { describe, expect, test } from "vitest"
import type { MetadataSnapshot } from "@fiction-map/dev-server"
import { buildGraphCanvasModel } from "./graph-canvas-model"
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
          incomingEdges: ["choice"],
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
      conditions: [],
      effects: [],
      graphs: [
        {
          id: "story",
          name: "Story",
          location: { file: "graphs/story.graph.ts", line: 1, column: 1 },
          nodes: [
            { id: "start", type: "scene", title: "Opening Scene" },
            { id: "end", type: "scene", title: "Ending Scene", isEnding: true },
          ],
          edges: [
            {
              id: "c1",
              type: "choice",
              source: "start",
              target: "end",
              text: "Continue",
            },
          ],
          nodeCount: 2,
          edgeCount: 1,
          maxDepth: 1,
          endings: ["end"],
          nodeTypesUsed: ["scene"],
          edgeTypesUsed: ["choice"],
          conditionsUsed: [],
          effectsUsed: [],
          errors: [
            {
              code: "node-error",
              message: "Node is invalid",
              nodeId: "start",
            },
          ],
          warnings: [
            {
              code: "edge-warning",
              message: "Edge warning",
              edgeId: "c1",
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

describe("buildGraphCanvasModel", () => {
  test("projects a selected graph into canvas-friendly nodes, edges, and annotations", () => {
    const projectModel = buildDashboardProjectModel(createSnapshot())

    const canvasModel = buildGraphCanvasModel(projectModel, "story")

    expect(canvasModel?.graphId).toBe("story")
    expect(canvasModel?.nodes).toEqual([
      {
        id: "start",
        label: "Opening Scene",
        nodeTypeId: "scene",
        isEnding: false,
      },
      {
        id: "end",
        label: "Ending Scene",
        nodeTypeId: "scene",
        isEnding: true,
      },
    ])
    expect(canvasModel?.edges).toEqual([
      {
        id: "c1",
        label: "Continue",
        edgeTypeId: "choice",
        source: "start",
        target: "end",
      },
    ])
    expect(canvasModel?.nodeAnnotations).toEqual([
      {
        nodeId: "start",
        type: "error",
        label: "1 error",
      },
      {
        nodeId: "end",
        type: "info",
        label: "Ending",
      },
    ])
    expect(canvasModel?.edgeIssueCounts).toEqual({
      c1: {
        errors: 0,
        warnings: 1,
      },
    })
  })

  test("returns null when the requested graph is not present", () => {
    const projectModel = buildDashboardProjectModel(createSnapshot())

    expect(buildGraphCanvasModel(projectModel, "missing")).toBeNull()
  })
})
