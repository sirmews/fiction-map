import { expect, test, describe } from "vitest"
import { generateAsciiMap } from "./ascii"
import { GraphDefinition } from "@fiction-map/core"

describe("generateAsciiMap", () => {
  test("renders simple linear graph with conditions and effects", () => {
    const graph: GraphDefinition = {
      id: "test-graph",
      name: "testGraph",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [
        { id: "node-a", type: "scene", title: "Node A", body: "First node" },
        { id: "node-b", type: "scene", title: "Node B", body: "Second node" },
      ],
      edges: [
        {
          id: "edge-ab",
          type: "choice",
          source: "node-a",
          target: "node-b",
          text: "Go to B",
          conditions: [{ type: "hasEntity", entityId: "lantern" }],
          effects: [{ type: "grantEntity", entityId: "key" }],
        },
      ],
      nodeCount: 2,
      edgeCount: 1,
      maxDepth: 1,
      endings: ["node-b"],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: ["hasEntity"],
      effectsUsed: ["grantEntity"],
      errors: [],
      warnings: [],
    }

    const output = generateAsciiMap(graph)
    expect(output).toContain("node-a (scene)")
    expect(output).toContain("node-b (scene)")
    expect(output).toContain('[edge-ab] "Go to B"')
    expect(output).toContain("❓ conditions: hasEntity(entityId=\"lantern\")")
    expect(output).toContain("⚡ effects: grantEntity(entityId=\"key\")")
  })

  test("handles cycle detection gracefully", () => {
    const graph: GraphDefinition = {
      id: "cyclic-graph",
      name: "cyclicGraph",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [
        { id: "node-a", type: "scene", title: "Node A", body: "First node" },
      ],
      edges: [
        {
          id: "edge-loop",
          type: "choice",
          source: "node-a",
          target: "node-a",
          text: "Loop back",
        },
      ],
      nodeCount: 1,
      edgeCount: 1,
      maxDepth: 1,
      endings: [],
      nodeTypesUsed: ["scene"],
      edgeTypesUsed: ["choice"],
      conditionsUsed: [],
      effectsUsed: [],
      errors: [],
      warnings: [],
    }

    const output = generateAsciiMap(graph)
    expect(output).toContain("node-a (scene)")
    expect(output).toContain("see node-a above")
  })
})
