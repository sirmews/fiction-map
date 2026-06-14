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
