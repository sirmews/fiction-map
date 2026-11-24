import type { GraphDefinition } from "@fiction-map/core"
import { describe, expect, it } from "vitest"
import { createRuntimeFromGraph } from "./graph-definition"
import { GraphRuntime } from "./runtime"

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

  it("keeps a visit-sensitive exit reachable after a cycle", () => {
    const graph: GraphDefinition = {
      id: "visited-gated-cycle",
      name: "Visited Gated Cycle",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [
        { id: "start", type: "scene" },
        { id: "detour", type: "scene" },
        { id: "end", type: "scene" },
      ],
      edges: [
        { id: "detour", type: "choice", source: "start", target: "detour" },
        { id: "return", type: "choice", source: "detour", target: "start" },
        {
          id: "exit-after-detour",
          type: "choice",
          source: "start",
          target: "end",
          conditions: [{ type: "visited", nodeId: "detour" }],
        },
      ],
      nodeCount: 3,
      edgeCount: 3,
      maxDepth: 3,
      endings: ["end"],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: ["visited"],
      effectsUsed: [],
      errors: [],
      warnings: [],
    }

    const paths = createRuntimeFromGraph(graph).enumeratePaths(10, 100)
    expect(paths.map((path) => path.steps.map((step) => step.transitionId))).toEqual([
      ["detour", "return", "exit-after-detour"],
    ])
  })

  it("keeps an exit gated by an existing custom evaluator", () => {
    const runtime = new GraphRuntime(
      {
        nodes: [{ id: "start" }, { id: "end" }],
        edges: [
          {
            id: "get-key",
            source: "start",
            target: "start",
            effects: [{ type: "setFlag", key: "key", value: true }],
          },
          { id: "exit", source: "start", target: "end", conditions: [{ type: "customKey" }] },
        ],
      },
      new Map([["customKey", (state) => state.flags.key === true]]),
    )

    expect(runtime.enumeratePaths().map((path) => path.finalNodeId)).toEqual(["end"])
  })

  it("continues walking when a cycle changes which choices are visible", () => {
    const runtime = new GraphRuntime({
      nodes: [{ id: "start" }, { id: "detour" }, { id: "end" }],
      edges: [
        {
          id: "take-detour",
          source: "start",
          target: "detour",
          visibility: [{ type: "notVisited", nodeId: "detour" }],
        },
        { id: "return", source: "detour", target: "start" },
        { id: "exit", source: "start", target: "end" },
      ],
    })

    const walk = runtime.walk(runtime.createState())
    const walkWithContext = runtime.walkWithContext(runtime.createState(), () => ({}))
    for (const steps of [walk, walkWithContext]) {
      expect(steps.filter((step) => step.applied).map((step) => step.nodeId)).toEqual([
        "detour",
        "start",
        "end",
      ])
    }
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
})
