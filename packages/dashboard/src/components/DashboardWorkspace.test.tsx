import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { MetadataSnapshot } from "@fiction-map/dev-server"
import { buildDashboardProjectModel } from "../lib/project-model"
import { DashboardWorkspace } from "./DashboardWorkspace"

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
      conditions: [],
      effects: [],
      graphs: [
        {
          id: "story",
          name: "Story",
          location: { file: "graphs/story.graph.ts", line: 1, column: 1 },
          nodes: [
            { id: "start", type: "scene", title: "Opening Scene" },
            { id: "end", type: "scene", title: "Ending Scene" },
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
          errors: [],
          warnings: [],
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

describe("DashboardWorkspace", () => {
  test("selecting a graph updates the graph panel and selection details from the shared model", () => {
    const projectModel = buildDashboardProjectModel(createSnapshot())

    render(
      <React.StrictMode>
        <DashboardWorkspace projectModel={projectModel} />
      </React.StrictMode>
    )

    expect(screen.getByText("Select a graph from the catalog to inspect its topology.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Story/ }))

    expect(screen.getByText("Story topology")).toBeTruthy()
    expect(screen.getByText("Opening Scene")).toBeTruthy()
    expect(screen.getByText("Current selection")).toBeTruthy()
    expect(screen.getByText("graph: story")).toBeTruthy()
    expect(screen.getByText("2 nodes")).toBeTruthy()
    expect(screen.getByText("1 edges")).toBeTruthy()
  })
})
