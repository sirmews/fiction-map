# CLI Graph Formatters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the `fiction-map ascii` (or `map`, `draw`) CLI command with a `--format <mode>` / `-f <mode>` parameter supporting `terminal`, `llm`, and `mermaid` formats.

**Architecture:** We will implement `generateLlmMap` and `generateMermaidMap` formatters in `packages/cli/src/commands/ascii.ts` and rename `generateAsciiMap` to `generateTerminalMap`. We will update the CLI argument parser in `cli.ts` to support `--format` and `-f` flags.

**Tech Stack:** TypeScript, Bun, Bun Test

---

### Task 1: Implement LLM and Mermaid Formatters

**Files:**
- Create/Modify: `packages/cli/src/commands/ascii.ts` (implement formatters, export them, rename current function to `generateTerminalMap`).
- Create/Modify: `packages/cli/src/commands/ascii.test.ts` (write unit tests for `llm` and `mermaid` formats).

- [ ] **Step 1: Write formatters inside ascii.ts**

Update `packages/cli/src/commands/ascii.ts` to include the three formatters and update the `ascii` entry point:

```typescript
import { GraphDefinition, NodeInstance, EdgeInstance } from "@fiction-map/core"
import { loadMetadata, selectGraphs } from "./query"

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

// 1. TERMINAL FORMATTER (Polished box tree)
export function generateTerminalMap(graph: GraphDefinition): string {
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

  function drawNodeBlock(node: NodeInstance, prefix: string): string {
    const typeLabel = ` (${node.type})`
    const title = typeof node.title === "string" ? node.title : ""
    const body = typeof node.body === "string" ? node.body : ""
    const titleLine = title ? ` "${title}"` : ""
    const bodyLine = body ? `  ${body.length > 34 ? body.slice(0, 31) + "..." : body}` : ""

    const lines = [
      `┌──────────────────────────────────────┐`,
      `│ ${node.id}${typeLabel}${titleLine.padStart(36 - node.id.length - typeLabel.length)} │`,
    ]
    if (bodyLine) {
      lines.push(`│ ${bodyLine.padEnd(36)} │`)
    }
    lines.push(`└──────────────────────────────────────┘`)

    return lines.map((l) => prefix + l).join("\n") + "\n"
  }

  function traverse(nodeId: string, prefix: string, _isLast: boolean) {
    if (visited.has(nodeId)) {
      output += `${prefix}   └───► [see ${nodeId} above]\n`
      return
    }
    visited.add(nodeId)

    const node = nodesMap.get(nodeId)
    if (!node) return

    output += drawNodeBlock(node, prefix)

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
        output += `${prefix}${lastEdge ? "    " : "   │"}     ❓ conditions: ${formatInstances(edge.conditions)}\n`
      }
      if (edge.effects && edge.effects.length > 0) {
        output += `${prefix}${lastEdge ? "    " : "   │"}     ⚡ effects: ${formatInstances(edge.effects)}\n`
      }

      output += `${prefix}${lastEdge ? "    " : "   │"}     ▼\n`
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

// 2. LLM FORMATTER (Compact Markdown Adjacency List)
export function generateLlmMap(graph: GraphDefinition): string {
  let output = `# Graph: ${graph.id}\n\n`
  const endings = new Set(graph.endings)

  for (const node of graph.nodes) {
    const isEnding = endings.has(node.id) ? " [Ending]" : ""
    output += `* **${node.id}** (${node.type})${isEnding}\n`
    if (node.title) output += `  * Title: "${node.title}"\n`
    if (node.body) {
      const bodyClean = node.body.replace(/\n/g, " ")
      output += `  * Body: "${bodyClean.length > 60 ? bodyClean.slice(0, 57) + "..." : bodyClean}"\n`
    }

    const nodeEdges = graph.edges.filter((e) => e.source === node.id)
    if (nodeEdges.length > 0) {
      output += "  * Choices:\n"
      for (const edge of nodeEdges) {
        const textLabel = edge.text ?? (edge.metadata as any)?.text ?? edge.id
        output += `    * \`${edge.id}\` ──► **${edge.target}** ("${textLabel}")\n`
        if (edge.conditions && edge.conditions.length > 0) {
          output += `      * ❓ conditions: ${formatInstances(edge.conditions)}\n`
        }
        if (edge.effects && edge.effects.length > 0) {
          output += `      * ⚡ effects: ${formatInstances(edge.effects)}\n`
        }
      }
    }
    output += "\n"
  }

  return output.trim() + "\n"
}

// 3. MERMAID FORMATTER (Standard Flowchart)
export function generateMermaidMap(graph: GraphDefinition): string {
  const lines: string[] = ["flowchart TD"]

  for (const node of graph.nodes) {
    const typeLabel = node.type
    const titleLabel = node.title ? `<br/>${node.title}` : ""
    // Escape quotes for mermaid double-quoted node labels
    const sanitizedLabel = `${node.id} (${typeLabel})${titleLabel}`.replace(/"/g, "'")
    lines.push(`  ${node.id}["${sanitizedLabel}"]`)
  }

  for (const edge of graph.edges) {
    const textLabel = edge.text ?? (edge.metadata as any)?.text ?? edge.id
    const conds = edge.conditions && edge.conditions.length > 0 ? ` [requires: ${formatInstances(edge.conditions)}]` : ""
    const effs = edge.effects && edge.effects.length > 0 ? ` [grants: ${formatInstances(edge.effects)}]` : ""
    const label = `${edge.id}: "${textLabel}"${conds}${effs}`.replace(/"/g, "'")
    lines.push(`  ${edge.source} -->|"${label}"| ${edge.target}`)
  }

  return "```mermaid\n" + lines.join("\n") + "\n```\n"
}

export interface AsciiOptions {
  rootDir?: string
  outputDir?: string
  format?: string
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

  const mode = options.format || "terminal"
  let output = ""

  if (mode === "mermaid") {
    output = generateMermaidMap(graphs[0])
  } else if (mode === "llm") {
    output = generateLlmMap(graphs[0])
  } else {
    output = `Graph: ${graphId}\n` + "=".repeat(graphId.length + 7) + "\n\n" + generateTerminalMap(graphs[0])
  }

  console.log(output)
}
```

- [ ] **Step 2: Add tests for LLM and Mermaid formats**

Modify `packages/cli/src/commands/ascii.test.ts` to include assertions for LLM and Mermaid generation:

```typescript
import { expect, test, describe } from "bun:test"
import { generateTerminalMap, generateLlmMap, generateMermaidMap } from "./ascii"
import { GraphDefinition } from "@fiction-map/core"

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
})

describe("generateLlmMap", () => {
  test("renders highly token-efficient flat markdown outline", () => {
    const output = generateLlmMap(sampleGraph)
    expect(output).toContain("# Graph: test-graph")
    expect(output).toContain("* **node-a** (scene)")
    expect(output).toContain('  * Title: "Node A"')
    expect(output).toContain('  * Body: "First node"')
    expect(output).toContain('    * `edge-ab` ──► **node-b** ("Go to B")')
    expect(output).toContain("      * ❓ conditions: hasEntity(entityId=\"lantern\")")
    expect(output).toContain("      * ⚡ effects: grantEntity(entityId=\"key\")")
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
    expect(output).toContain('  node-a -->|"edge-ab: \'Go to B\' [requires: hasEntity(entityId=\'lantern\')] [grants: grantEntity(entityId=\'key\')]"| node-b')
    expect(output).toContain("```")
  })
})
```

- [ ] **Step 3: Run the new tests**

Run: `bun test packages/cli/src/commands/ascii.test.ts`
Expected: All tests pass successfully

- [ ] **Step 4: Commit changes**

```bash
git add packages/cli/src/commands/ascii.ts packages/cli/src/commands/ascii.test.ts
git commit -m "feat(cli): implement llm and mermaid diagram formatters with unit tests"
```

---

### Task 2: Register formatting arguments in CLI

**Files:**
- Modify: `packages/cli/src/cli.ts` (wire up the `--format` and `-f` command-line flags).

- [ ] **Step 1: Wire up CLI command arguments**

Read `packages/cli/src/cli.ts` and modify `parseArgs` options and the `ascii` switch command to support options `format` and `f`:

```typescript
// In main() parseArgs options:
      format: { type: "string", short: "f" },

// In printHelp() help menu output:
// Under Options or Ascii help:
//   --format, -f      Output format: terminal, llm, mermaid (default: terminal)

// In main() switch:
    case "ascii":
    case "map":
    case "draw":
      await ascii(positionals[1], {
        rootDir: values["root-dir"],
        outputDir: values["output-dir"],
        format: values.format,
      })
      break
```

- [ ] **Step 2: Build workspace packages**

Run: `bun run build`
Expected: Success

- [ ] **Step 3: Verify the formatters on library-mystery**

Run and inspect outputs:
1. `bun packages/cli/src/cli.ts ascii library-mystery --root-dir apps/literature-rpg/src --format terminal`
2. `bun packages/cli/src/cli.ts ascii library-mystery --root-dir apps/literature-rpg/src --format llm`
3. `bun packages/cli/src/cli.ts ascii library-mystery --root-dir apps/literature-rpg/src --format mermaid`

Expected: Outputs correspond perfectly to target designs.

- [ ] **Step 4: Run typecheck and full test suite**

Run: `bun run typecheck && bun test`
Expected: Clean pass (126/126 green tests)

- [ ] **Step 5: Commit changes**

```bash
git add packages/cli/src/cli.ts
git commit -m "feat(cli): wire up format/f parameter to CLI command parser"
```
