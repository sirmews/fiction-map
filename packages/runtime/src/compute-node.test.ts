import type { GraphDefinition } from "@fiction-map/core"
import { RuntimeError } from "@fiction-map/core"
import { describe, expect, it } from "vitest"
import { createRuntimeFromGraph } from "./graph-definition"

describe("Compute Nodes (Auto-Resolving Nodes)", () => {
  it("should automatically resolve a compute node and route based on variables", () => {
    const graph: GraphDefinition = {
      id: "compute-story",
      name: "Compute Story",
      location: { file: "test.ts", line: 1, column: 1 },
      nodeCount: 4,
      edgeCount: 3,
      maxDepth: 0,
      endings: [],
      nodeTypesUsed: [],
      edgeTypesUsed: [],
      conditionsUsed: [],
      effectsUsed: [],
      errors: [],
      warnings: [],
      nodes: [
        { id: "start", type: "scene" },
        {
          id: "compute-roll",
          type: "compute",
          autoResolve: true,
          enterEffects: [{ type: "setVariable", key: "roll", value: 20 }],
        },
        { id: "success-node", type: "scene" },
        { id: "failure-node", type: "scene" },
      ],
      edges: [
        { id: "to-compute", type: "choice", source: "start", target: "compute-roll" },
        {
          id: "success-edge",
          type: "choice",
          source: "compute-roll",
          target: "success-node",
          conditions: [{ type: "greaterThanOrEqual", key: "roll", value: 15 }],
        },
        {
          id: "failure-edge",
          type: "choice",
          source: "compute-roll",
          target: "failure-node",
          conditions: [{ type: "lessThan", key: "roll", value: 15 }],
        },
      ],
    }

    const runtime = createRuntimeFromGraph(graph)
    const state = runtime.createState()

    // Step from start to compute-roll.
    // Since compute-roll is autoResolve: true, it should instantly apply enterEffects,
    // evaluate the conditions on success-edge and failure-edge, and land on success-node!
    const stepResult = runtime.step(state, runtime.transitions[0])

    expect(stepResult.success).toBe(true)
    expect(stepResult.nextNodeId).toBe("success-node")
    expect(stepResult.state.currentNodeId).toBe("success-node")
    expect(stepResult.state.variables.roll).toBe(20)
  })

  it("should throw a RuntimeError if an infinite loop of auto-resolving nodes is detected", () => {
    const graph: GraphDefinition = {
      id: "infinite-loop-story",
      name: "Infinite Loop Story",
      location: { file: "test.ts", line: 1, column: 1 },
      nodeCount: 3,
      edgeCount: 3,
      maxDepth: 0,
      endings: [],
      nodeTypesUsed: [],
      edgeTypesUsed: [],
      conditionsUsed: [],
      effectsUsed: [],
      errors: [],
      warnings: [],
      nodes: [
        { id: "start", type: "scene" },
        { id: "node-a", type: "compute", autoResolve: true },
        { id: "node-b", type: "compute", autoResolve: true },
      ],
      edges: [
        { id: "to-a", type: "choice", source: "start", target: "node-a" },
        { id: "a-to-b", type: "choice", source: "node-a", target: "node-b" },
        { id: "b-to-a", type: "choice", source: "node-b", target: "node-a" },
      ],
    }

    const runtime = createRuntimeFromGraph(graph)
    const state = runtime.createState()

    expect(() => {
      runtime.step(state, runtime.transitions[0])
    }).toThrow(RuntimeError)

    expect(() => {
      runtime.step(state, runtime.transitions[0])
    }).toThrow("Infinite loop detected")
  })
})
