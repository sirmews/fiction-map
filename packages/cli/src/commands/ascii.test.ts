import type { GraphDefinition } from "@fiction-map/core"
import { describe, expect, test } from "vitest"
import { generateLlmMap, generateMermaidMap, generateTerminalMap } from "./ascii"

const sampleGraph: GraphDefinition = {
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

describe("generateTerminalMap", () => {
  test("renders simple linear graph correctly", () => {
    const output = generateTerminalMap(sampleGraph)
    expect(output).toContain("node-a (scene)")
    expect(output).toContain("node-b (scene)")
    expect(output).toContain('[edge-ab] "Go to B"')
  })

  test("handles cycle detection gracefully", () => {
    const graph: GraphDefinition = {
      id: "cyclic-graph",
      name: "cyclicGraph",
      location: { file: "test.ts", line: 1, column: 1 },
      nodes: [{ id: "node-a", type: "scene", title: "Node A", body: "First node" }],
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

    const output = generateTerminalMap(graph)
    expect(output).toContain("node-a (scene)")
    expect(output).toContain("see node-a above")
  })
})

describe("generateLlmMap", () => {
  test("renders highly token-efficient flat markdown outline", () => {
    const output = generateLlmMap(sampleGraph)
    expect(output).toContain("# Graph: test-graph")
    expect(output).toContain("* **node-a** (scene)")
    expect(output).toContain('  * Title: "Node A"')
    expect(output).toContain('  * Body: "First node"')
    expect(output).toContain('    * `edge-ab` ──► **node-b** ("Go to B")')
    expect(output).toContain('      * ❓ conditions: hasEntity(entityId="lantern")')
    expect(output).toContain('      * ⚡ effects: grantEntity(entityId="key")')
    expect(output).toContain("* **node-b** (scene) [Ending]")
  })
})

describe("generateMermaidMap", () => {
  test("renders valid mermaid.js diagram", () => {
    const output = generateMermaidMap(sampleGraph)
    expect(output).toContain("```mermaid")
    expect(output).toContain("flowchart TD")
    expect(output).toContain('  node-a["node-a (scene)<br/>Node A"]')
    expect(output).toContain('  node-b["node-b (scene)<br/>Node B"]')
    expect(output).toContain(
      "  node-a -->|\"edge-ab: 'Go to B' [requires: hasEntity(entityId='lantern')] [grants: grantEntity(entityId='key')]\"| node-b",
    )
    expect(output).toContain("```")
  })
})
