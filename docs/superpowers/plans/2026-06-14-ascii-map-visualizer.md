# ASCII Map Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a native CLI subcommand `fiction-map ascii <graph-id>` that renders an intuitive and detailed vertical tree ASCII visualization of story graphs, including node titles, transition conditions, and effects.

**Architecture:** We will implement the visualization logic inside `packages/cli/src/commands/ascii.ts` using a Depth-First Search (DFS) tree generator with cycle-detection. We will export core metadata helpers from `query.ts` to maintain a DRY architecture.

**Tech Stack:** TypeScript, Bun, Bun Test

---

### Task 1: Export Metadata Helpers from Query

**Files:**
- Modify: `packages/cli/src/commands/query.ts` (export `loadMetadata` and `selectGraphs` so they can be reused).

- [ ] **Step 1: Export loadMetadata and selectGraphs**

Read `packages/cli/src/commands/query.ts` and change the function signatures to add the `export` keyword:

```typescript
export async function loadMetadata(options: MetadataCommandOptions = {}): Promise<LoadedMetadata> {
  // ... existing code
}

export function selectGraphs(metadata: GraphMetadata, graphId?: string): GraphDefinition[] {
  // ... existing code
}
```

- [ ] **Step 2: Run typecheck to verify exports**

Run: `bun run typecheck`
Expected: Success

- [ ] **Step 3: Commit changes**

```bash
git add packages/cli/src/commands/query.ts
git commit -m "refactor(cli): export metadata loading helpers from query"
```

---

### Task 2: Implement ASCII Map Generator

**Files:**
- Create: `packages/cli/src/commands/ascii.ts`
- Create: `packages/cli/src/commands/ascii.test.ts`

- [ ] **Step 1: Write the visualizer and CLI subcommand**

Write `packages/cli/src/commands/ascii.ts` with the visualizer and DFS generator:

```typescript
import { join } from "path"
import { GraphDefinition, NodeInstance, EdgeInstance } from "@fiction-map/core"
import { loadMetadata, selectGraphs } from "./query"

export function generateAsciiMap(graph: GraphDefinition): string {
  const outgoing = new Map<string, EdgeInstance[]>()
  for (const edge of graph.edges) {
    const bucket = outgoing.get(edge.source)
    if (bucket) {
      bucket.push(edge)
    } else {
      outgoing.set(edge.source, [edge])
    }
  }

  const nodesMap = new Map<string, NodeInstance>()
  for (const node of graph.nodes) {
    nodesMap.set(node.id, node)
  }

  const targeted = new Set(graph.edges.map((e) => e.target))
  const roots = graph.nodes.filter((n) => !targeted.has(n.id)).map((n) => n.id)
  const startNodes = roots.length > 0 ? roots : (graph.nodes.length > 0 ? [graph.nodes[0].id] : [])

  let output = ""
  const visited = new Set<string>()

  function formatInstanceValue(value: unknown): string {
    return typeof value === "string" ? JSON.stringify(value) : String(value)
  }

  function formatInstances(items: Array<{ type: string; [key: string]: unknown }> | undefined): string {
    if (!items || items.length === 0) return ""
    return items
      .map((item) => {
        const args = Object.entries(item)
          .filter(([key]) => key !== "type")
          .map(([key, value]) => `${key}=${formatInstanceValue(value)}`)
        return args.length > 0 ? `${item.type}(${args.join(", ")})` : item.type
      })
      .join(", ")
  }

  function drawNodeBlock(node: NodeInstance, prefix: string): string {
    const typeLabel = ` (${node.type})`
    const titleLine = node.title ? ` "${node.title}"` : ""
    const bodyLine = node.body ? `  ${node.body.length > 40 ? node.body.slice(0, 37) + "..." : node.body}` : ""

    const lines = [
      `┌──────────────────────────────────────┐`,
      `│ ${node.id}${typeLabel}${titleLine.padStart(38 - node.id.length - typeLabel.length)} │`,
    ]
    if (bodyLine) {
      lines.push(`│ ${bodyLine.padEnd(36)} │`)
    }
    lines.push(`└──────────────────────────────────────┘`)

    return lines.map((l, i) => i === 0 ? l : prefix + l).join("\n") + "\n"
  }

  function traverse(nodeId: string, prefix: string, isLast: boolean) {
    const node = nodesMap.get(nodeId)
    if (!node) return

    output += drawNodeBlock(node, prefix)

    if (visited.has(nodeId)) {
      output += `${prefix}   └───► [see ${nodeId} above]\n`
      return
    }
    visited.add(nodeId)

    const edges = outgoing.get(nodeId) ?? []
    if (edges.length === 0) {
      return
    }

    edges.forEach((edge, index) => {
      const lastEdge = index === edges.length - 1
      const branchPrefix = lastEdge ? "   └───► " : "   ├───► "
      const nextPrefix = prefix + (lastEdge ? "         " : "   │     ")

      output += `${prefix}   │\n`
      const edgeLabel = `${branchPrefix}[${edge.id}] "${edge.text ?? (edge.metadata as any)?.text ?? edge.id}"`
      output += `${prefix}${edgeLabel}\n`

      if (edge.conditions && edge.conditions.length > 0) {
        output += `${prefix}${lastEdge ? " " : "   │"}     ❓ conditions: ${formatInstances(edge.conditions)}\n`
      }
      if (edge.effects && edge.effects.length > 0) {
        output += `${prefix}${lastEdge ? " " : "   │"}     ⚡ effects: ${formatInstances(edge.effects)}\n`
      }

      output += `${prefix}${lastEdge ? " " : "   │"}     ▼\n`
      traverse(edge.target, nextPrefix, lastEdge)
    })
  }

  for (let i = 0; i < startNodes.length; i++) {
    traverse(startNodes[i], "", i === startNodes.length - 1)
    if (i < startNodes.length - 1) {
      output += "\n========================================\n\n"
    }
  }

  return output
}

export interface AsciiOptions {
  rootDir?: string
  outputDir?: string
}

export async function ascii(graphId: string | undefined, options: AsciiOptions = {}): Promise<void> {
  if (!graphId) {
    console.error("❌ Missing graph id. Usage: `fiction-map ascii <graph-id>`")
    process.exit(1)
  }

  const { metadata } = await loadMetadata(options)
  const graphs = selectGraphs(metadata, graphId)
  if (graphs.length === 0) {
    console.error(`❌ Graph ${graphId} not found in metadata.`)
    process.exit(1)
  }

  const map = generateAsciiMap(graphs[0])
  console.log(`Graph: ${graphId}`)
  console.log("=".repeat(graphId.length + 7))
  console.log("")
  console.log(map)
}
```

- [ ] **Step 2: Write tests for `generateAsciiMap`**

Write `packages/cli/src/commands/ascii.test.ts`:

```typescript
import { expect, test, describe } from "bun:test"
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
```

- [ ] **Step 3: Run the new tests**

Run: `bun test packages/cli/src/commands/ascii.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit changes**

```bash
git add packages/cli/src/commands/ascii.ts packages/cli/src/commands/ascii.test.ts
git commit -m "feat(cli): implement generateAsciiMap visualizer and test suite"
```

---

### Task 3: Wire Subcommand up in CLI

**Files:**
- Modify: `packages/cli/src/cli.ts` (register the `ascii` command and wire up options).

- [ ] **Step 1: Import ascii command and wire up parser**

Add the import for `ascii` and wire up the subcommand:

```typescript
// Add near existing imports:
import { ascii } from "./commands/ascii"

// In printHelp():
// Under Commands:
//   ascii       Draw a beautiful ASCII map of the story graph

// In main() switch:
    case "ascii":
    case "map":
    case "draw":
      await ascii(positionals[1], {
        rootDir: values["root-dir"],
        outputDir: values["output-dir"],
      })
      break
```

- [ ] **Step 2: Build the packages**

Run: `bun run build`
Expected: Success

- [ ] **Step 3: Run the CLI subcommand on library-mystery**

Run: `bun packages/cli/src/cli.ts ascii library-mystery --root-dir apps/literature-rpg/src`
Expected: Beautiful vertical ASCII map of the story graph prints in terminal successfully.

- [ ] **Step 4: Run typechecks and test suite**

Run: `bun run typecheck && bun test`
Expected: Clean pass with all 124 tests green.

- [ ] **Step 5: Commit changes**

```bash
git add packages/cli/src/cli.ts
git commit -m "feat(cli): wire up ascii command to fiction-map CLI"
```
