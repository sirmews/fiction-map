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

  it("walk() prunes cyclic loops when symbolic state repeats", () => {
    const graph: GraphDefinition = {
      id: "cycle-walk-traversal",
      name: "Cycle Walk Traversal",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [
        { id: "start", type: "scene" },
        { id: "loop", type: "scene" },
      ],
      edges: [
        { id: "to-loop", type: "choice", source: "start", target: "loop" },
        { id: "loop-back", type: "choice", source: "loop", target: "start" },
        { id: "loop-exit", type: "choice", source: "loop", target: "start" },
      ],
      nodeCount: 2,
      edgeCount: 3,
      maxDepth: 1,
      endings: [],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: [],
      effectsUsed: [],
      errors: [],
      warnings: [],
    }

    const runtime = createRuntimeFromGraph(graph)
    const steps = runtime.walk(runtime.createState(), 100)

    expect(steps).toHaveLength(2)
    expect(steps[0].state.currentNodeId).toBe("loop")
    expect(steps[1].state.currentNodeId).toBe("start")
  })

  it("walkWithContext() prunes cyclic loops when symbolic state repeats", () => {
    const graph: GraphDefinition = {
      id: "cycle-walkwithcontext-traversal",
      name: "Cycle WalkWithContext Traversal",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [
        { id: "start", type: "scene" },
        { id: "loop", type: "scene" },
      ],
      edges: [
        { id: "to-loop", type: "choice", source: "start", target: "loop" },
        { id: "loop-back", type: "choice", source: "loop", target: "start" },
        { id: "loop-exit", type: "choice", source: "loop", target: "start" },
      ],
      nodeCount: 2,
      edgeCount: 3,
      maxDepth: 1,
      endings: [],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: [],
      effectsUsed: [],
      errors: [],
      warnings: [],
    }

    const runtime = createRuntimeFromGraph(graph)
    const steps = runtime.walkWithContext(runtime.createState(), (state) => ({
      derivedState: { node: state.currentNodeId },
    }))

    expect(steps).toHaveLength(2)
    expect(steps[0].state.currentNodeId).toBe("loop")
    expect(steps[1].state.currentNodeId).toBe("start")
  })

  it("does NOT prune states that differ only in visited history (sound fingerprint)", () => {
    // A transition gated by `visited(b)` is only available on the SECOND arrival
    // at `a` (after the path start->a->b->a). The first and second arrival at `a`
    // share the same abstract fingerprint {currentNodeId, flags, vars, entities}
    // but differ in `state.visited` (b is visited only on the second arrival).
    // A fingerprint that excludes `visited` is UNSOUND here: it treats the second
    // arrival as a revisit of the first and drops the only path to `end_via_loop`.
    const graph: GraphDefinition = {
      id: "visited-gated-path-enumeration",
      name: "Visited-Gated Path Enumeration",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [
        { id: "start", type: "scene" },
        { id: "a", type: "scene" },
        { id: "b", type: "scene" },
        { id: "end_direct", type: "scene" },
        { id: "end_via_loop", type: "scene" },
      ],
      edges: [
        { id: "e1", type: "choice", source: "start", target: "a" },
        { id: "e2", type: "choice", source: "a", target: "end_direct" },
        { id: "e3", type: "choice", source: "a", target: "b" },
        { id: "e4", type: "choice", source: "b", target: "a" },
        {
          id: "e5",
          type: "choice",
          source: "a",
          target: "end_via_loop",
          conditions: [{ type: "visited", nodeId: "b" }],
        },
      ],
      nodeCount: 5,
      edgeCount: 5,
      maxDepth: 4,
      endings: ["end_direct", "end_via_loop"],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: ["visited"],
      effectsUsed: [],
      errors: [],
      warnings: [],
    }

    const runtime = createRuntimeFromGraph(graph)
    const paths = runtime.enumeratePaths(6, 100)

    const pathIds = paths
      .map((p) => p.steps.map((s) => s.transitionId))
      .sort()

    expect(pathIds).toEqual([
      ["e1", "e2"],
      ["e1", "e3", "e4", "e2"],
      ["e1", "e3", "e4", "e5"],
    ])
    expect(
      paths.some((p) => p.finalNodeId === "end_via_loop"),
    ).toBe(true)
  })
})
