import type { GraphDefinition } from "@fiction-map/core"
import { describe, expect, it } from "vitest"
import { createRuntimeFromGraph } from "./graph-definition"

describe("GraphRuntime path enumeration", () => {
  it("prunes cycles by symbolic-state fingerprint to avoid unbounded branching", () => {
    const graph: GraphDefinition = {
      id: "cycle-path-enumeration",
      name: "Cycle Path Enumeration",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [
        { id: "start", type: "scene" },
        { id: "loop", type: "scene" },
        { id: "end", type: "scene" },
      ],
      edges: [
        { id: "to-loop", type: "choice", source: "start", target: "loop" },
        { id: "to-end", type: "choice", source: "start", target: "end" },
        { id: "loop-back", type: "choice", source: "loop", target: "start" },
        { id: "loop-exit", type: "choice", source: "loop", target: "end" },
      ],
      nodeCount: 3,
      edgeCount: 4,
      maxDepth: 2,
      endings: ["end"],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: [],
      effectsUsed: [],
      errors: [],
      warnings: [],
    }

    const runtime = createRuntimeFromGraph(graph)
    const paths = runtime.enumeratePaths(6, 100)

    expect(paths).toHaveLength(2)
    expect(paths.map((path) => path.steps.map((step) => step.transitionId)).sort()).toEqual([
      ["to-end"],
      ["to-loop", "loop-exit"],
    ])
  })

  it("returns finite paths from cyclic graphs with large maxDepth", () => {
    const graph: GraphDefinition = {
      id: "large-cycle-path-enumeration",
      name: "Large Cycle Path Enumeration",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [
        { id: "start", type: "scene" },
        { id: "loop", type: "scene" },
        { id: "end", type: "scene" },
      ],
      edges: [
        { id: "to-loop", type: "choice", source: "start", target: "loop" },
        { id: "to-end", type: "choice", source: "start", target: "end" },
        { id: "loop-back", type: "choice", source: "loop", target: "start" },
        { id: "loop-exit", type: "choice", source: "loop", target: "end" },
      ],
      nodeCount: 3,
      edgeCount: 4,
      maxDepth: 2,
      endings: ["end"],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: [],
      effectsUsed: [],
      errors: [],
      warnings: [],
    }

    const runtime = createRuntimeFromGraph(graph)
    const paths = runtime.enumeratePaths(50, 1000)

    expect(paths).toHaveLength(2)
    expect(paths.every((path) => path.steps.length <= 2)).toBe(true)
  })
})
