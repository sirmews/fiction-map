import { describe, expect, test } from "vitest"
import type { MetadataSnapshot } from "@fiction-map/dev-server"
import { buildDevRuntimePack, buildProjectSummaryPack } from "./context-packs"
import { deriveDashboardMetadataFacts } from "./metadata"

function countWords(value: string): number {
  return value.trim().split(/\s+/).length
}

function createSnapshot(): MetadataSnapshot {
  return {
    metadata: {
      nodeTypes: [
        {
          id: "scene",
          name: "Scene",
          location: {
            file: "examples/story/scene.node.ts",
            line: 10,
            column: 2,
          },
          properties: {},
          outgoingEdges: ["choice"],
          incomingEdges: [],
        },
      ],
      edgeTypes: [
        {
          id: "choice",
          name: "Choice",
          location: {
            file: "examples/story/choice.edge.ts",
            line: 4,
            column: 1,
          },
          properties: {},
          sourceTypes: ["scene"],
          targetTypes: ["scene"],
        },
      ],
      conditions: [
        {
          id: "has-flag",
          name: "Has Flag",
          location: {
            file: "examples/story/has-flag.condition.ts",
            line: 2,
            column: 1,
          },
          parameters: {},
        },
      ],
      effects: [
        {
          id: "set-flag",
          name: "Set Flag",
          location: {
            file: "examples/story/set-flag.effect.ts",
            line: 2,
            column: 1,
          },
          parameters: {},
        },
      ],
      graphs: [
        {
          id: "intro",
          name: "Intro",
          location: {
            file: "examples/story/intro.graph.ts",
            line: 5,
            column: 1,
          },
          nodes: [{ id: "n1", type: "scene" }],
          edges: [],
          nodeCount: 1,
          edgeCount: 0,
          maxDepth: 1,
          endings: ["n1"],
          nodeTypesUsed: ["scene"],
          edgeTypesUsed: [],
          conditionsUsed: ["has-flag"],
          effectsUsed: ["set-flag"],
          errors: [],
          warnings: [
            {
              code: "unused-condition",
              message: "Condition is defined but not referenced",
            },
          ],
        },
      ],
      validation: {
        errors: [],
        warnings: [
          {
            code: "unused-condition",
            message: "Condition is defined but not referenced",
          },
        ],
      },
    },
    lastRefreshAt: "2026-05-03T12:00:00.000Z",
    refreshError: null,
  }
}

describe("context pack generation", () => {
  test("builds the project summary pack from live metadata facts and curated references", () => {
    const facts = deriveDashboardMetadataFacts(createSnapshot())

    const pack = buildProjectSummaryPack(facts)

    expect(pack.kind).toBe("project-summary")
    expect(pack.intent).toBe("orientation")
    expect(pack.scope).toBe("project")
    expect(countWords(pack.summary)).toBeLessThanOrEqual(80)
    expect(pack.systemView).toHaveLength(5)
    expect(pack.keyConcepts.length).toBeLessThanOrEqual(6)
    expect(pack.evidence.length).toBeLessThanOrEqual(6)
    expect(pack.nextLook.length).toBeLessThanOrEqual(6)
    expect(pack.contextBlock).toContain("Current Metadata Snapshot:")
    expect(pack.contextBlock).toContain("1 graphs, 1 node types, 1 edge types")
    expect(pack.evidence.some((entry) => entry.kind === "metadata")).toBe(true)
    expect(pack.nextLook[0]?.path).toBe("docs/NORTH_STAR.md")
  })

  test("builds the dev runtime pack with current refresh state and milestone status", () => {
    const facts = deriveDashboardMetadataFacts(createSnapshot())

    const pack = buildDevRuntimePack(facts)

    expect(pack.kind).toBe("dev-runtime")
    expect(pack.intent).toBe("orientation")
    expect(pack.scope).toBe("subsystem")
    expect(countWords(pack.promptSeed)).toBeLessThanOrEqual(220)
    expect(pack.implementationStatus).toContain(
      "Dashboard app package and metadata shell are implemented."
    )
    expect(pack.implementationStatus).toContain(
      "The CLI does not yet provide a real `fiction-map dev` command."
    )
    expect(pack.contextBlock).toContain("Last refresh: 2026-05-03T12:00:00.000Z")
    expect(pack.contextBlock).toContain("Current refresh error: none")
    expect(pack.nextLook.some((entry) => entry.path === "packages/dev-server/src/state.ts")).toBe(
      true
    )
  })
})
