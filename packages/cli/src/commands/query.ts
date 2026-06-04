import { readFile } from "fs/promises"
import { join, relative, resolve, dirname } from "path"
import type {
  EdgeInstance,
  GraphDefinition,
  GraphMetadata,
  NodeInstance,
} from "@fiction-map/core"

interface MetadataCommandOptions {
  rootDir?: string
  outputDir?: string
}

export interface QueryOptions extends MetadataCommandOptions {
  graph?: string
  type?: string
  from?: string
  to?: string
  json?: boolean
}

interface LoadedMetadata {
  metadata: GraphMetadata
  rootDir: string
}

interface NodeResult {
  graphId: string
  node: NodeInstance
}

interface EdgeResult {
  graphId: string
  edge: EdgeInstance
}

interface PathResult {
  graphId: string
  rootNodeId: string
  nodeIds: string[]
  edgeIds: string[]
  cycle: boolean
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function loadMetadata(options: MetadataCommandOptions = {}): Promise<LoadedMetadata> {
  const rootDir = resolve(options.rootDir || process.cwd())
  const outputDir = options.outputDir 
    ? resolve(options.outputDir) 
    : options.rootDir 
      ? dirname(rootDir)
      : rootDir
  const metadataPath = join(outputDir, ".fiction-map", "metadata.json")

  try {
    const raw = await readFile(metadataPath, "utf8")
    return {
      metadata: JSON.parse(raw) as GraphMetadata,
      rootDir,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      fail(`❌ ${relative(rootDir, metadataPath)} not found. Run \`fiction-map generate\` first.`)
    }
    console.error("❌ Failed to read metadata:")
    console.error(error)
    process.exit(1)
  }
}

function selectGraphs(metadata: GraphMetadata, graphId?: string): GraphDefinition[] {
  if (!graphId) return metadata.graphs
  const graph = metadata.graphs.find((item) => item.id === graphId)
  if (!graph) {
    const knownGraphIds = metadata.graphs.map((item) => item.id)
    const suffix =
      knownGraphIds.length > 0
        ? ` Known graph ids: ${knownGraphIds.map((id) => `"${id}"`).join(", ")}.`
        : " No graphs were found in metadata."
    fail(`❌ Unknown graph: ${graphId}.${suffix}`)
  }
  return [graph]
}

function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2))
}

function describeNode(node: NodeInstance): string {
  return `${node.id} (${node.type})`
}

function describeEdge(edge: EdgeInstance): string {
  return `${edge.id} (${edge.type}) ${edge.source} -> ${edge.target}`
}

function formatInstanceValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value)
  return JSON.stringify(value)
}

function formatInstances(
  items: Array<{ type: string; [key: string]: unknown }> | undefined
): string {
  if (!items || items.length === 0) return "(none)"

  return items
    .map((item) => {
      const args = Object.entries(item)
        .filter(([key]) => key !== "type")
        .map(([key, value]) => `${key}=${formatInstanceValue(value)}`)
      return args.length > 0 ? `${item.type}(${args.join(", ")})` : item.type
    })
    .join(", ")
}

function inferRootNodeIds(graph: GraphDefinition): string[] {
  const targeted = new Set(graph.edges.map((edge) => edge.target))
  const roots = graph.nodes
    .filter((node) => !targeted.has(node.id))
    .map((node) => node.id)

  return roots.length > 0 ? roots : graph.nodes.map((node) => node.id)
}

function computeStaticPaths(graph: GraphDefinition): PathResult[] {
  const outgoing = new Map<string, EdgeInstance[]>()
  for (const edge of graph.edges) {
    const bucket = outgoing.get(edge.source)
    if (bucket) {
      bucket.push(edge)
    } else {
      outgoing.set(edge.source, [edge])
    }
  }

  const results: PathResult[] = []

  const visit = (
    rootNodeId: string,
    currentNodeId: string,
    nodeIds: string[],
    edgeIds: string[],
    seen: Set<string>
  ): void => {
    const edges = outgoing.get(currentNodeId) ?? []
    if (edges.length === 0) {
      results.push({
        graphId: graph.id,
        rootNodeId,
        nodeIds,
        edgeIds,
        cycle: false,
      })
      return
    }

    for (const edge of edges) {
      const nextNodeIds = [...nodeIds, edge.target]
      const nextEdgeIds = [...edgeIds, edge.id]

      if (seen.has(edge.target)) {
        results.push({
          graphId: graph.id,
          rootNodeId,
          nodeIds: nextNodeIds,
          edgeIds: nextEdgeIds,
          cycle: true,
        })
        continue
      }

      const nextSeen = new Set(seen)
      nextSeen.add(edge.target)
      visit(rootNodeId, edge.target, nextNodeIds, nextEdgeIds, nextSeen)
    }
  }

  for (const rootNodeId of inferRootNodeIds(graph)) {
    visit(rootNodeId, rootNodeId, [rootNodeId], [], new Set([rootNodeId]))
  }

  return results
}

export async function query(kind: "nodes" | "edges" | "paths", options: QueryOptions = {}): Promise<void> {
  const { metadata } = await loadMetadata(options)
  const graphs = selectGraphs(metadata, options.graph)

  if (kind === "nodes") {
    const results: NodeResult[] = []
    for (const graph of graphs) {
      for (const node of graph.nodes) {
        if (options.type && node.type !== options.type) continue
        results.push({ graphId: graph.id, node })
      }
    }

    if (options.json) {
      printJson(results)
      return
    }

    console.log(`Found ${results.length} node${results.length === 1 ? "" : "s"}.\n`)
    for (const result of results) {
      console.log(`[${result.graphId}] ${describeNode(result.node)}`)
    }
    console.log("")
    return
  }

  if (kind === "edges") {
    const results: EdgeResult[] = []
    for (const graph of graphs) {
      for (const edge of graph.edges) {
        if (options.type && edge.type !== options.type) continue
        if (options.from && edge.source !== options.from) continue
        if (options.to && edge.target !== options.to) continue
        results.push({ graphId: graph.id, edge })
      }
    }

    if (options.json) {
      printJson(results)
      return
    }

    console.log(`Found ${results.length} edge${results.length === 1 ? "" : "s"}.\n`)
    for (const result of results) {
      console.log(`[${result.graphId}] ${describeEdge(result.edge)}`)
    }
    console.log("")
    return
  }

  const results = graphs.flatMap((graph) => computeStaticPaths(graph))
  if (options.json) {
    printJson(results)
    return
  }

  console.log(`Found ${results.length} static path${results.length === 1 ? "" : "s"}.\n`)
  for (const result of results) {
    const rendered = result.nodeIds.join(" -> ")
    const suffix = result.cycle ? " [cycle]" : ""
    console.log(`[${result.graphId}] ${rendered}${suffix}`)
  }
  console.log("")
}

export async function showGraph(graphId: string | undefined, options: QueryOptions = {}): Promise<void> {
  if (!graphId) {
    fail("❌ Missing graph id. Usage: `fiction-map graph show <graph-id>`")
  }

  const { metadata } = await loadMetadata(options)
  const graph = selectGraphs(metadata, graphId)[0]
  const roots = inferRootNodeIds(graph)
  const summary = {
    id: graph.id,
    source: `${graph.location.file}:${graph.location.line}`,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    roots,
    endings: graph.endings,
    nodeTypesUsed: graph.nodeTypesUsed,
    edgeTypesUsed: graph.edgeTypesUsed,
    conditionsUsed: graph.conditionsUsed,
    effectsUsed: graph.effectsUsed,
    errors: graph.errors,
    warnings: graph.warnings,
  }

  if (options.json) {
    printJson(summary)
    return
  }

  console.log(`Graph: ${graph.id}`)
  console.log(`Source: ${summary.source}`)
  console.log(`Nodes: ${graph.nodeCount}`)
  console.log(`Edges: ${graph.edgeCount}`)
  console.log(`Roots: ${roots.join(", ") || "(none)"}`)
  console.log(`Endings: ${graph.endings.join(", ") || "(none)"}`)
  console.log(`Conditions used: ${graph.conditionsUsed.join(", ") || "(none)"}`)
  console.log(`Effects used: ${graph.effectsUsed.join(", ") || "(none)"}`)
  console.log("")
  console.log("Topology:")
  for (const edge of graph.edges) {
    console.log(`- ${describeEdge(edge)}`)
  }
  console.log("")
}

export async function explain(targetId: string | undefined, options: QueryOptions = {}): Promise<void> {
  if (!targetId) {
    fail("❌ Missing id. Usage: `fiction-map explain <graph|node|edge-id>`")
  }

  const { metadata } = await loadMetadata(options)
  const graphs = selectGraphs(metadata, options.graph)
  const graph = graphs.find((item) => item.id === targetId)
  if (graph) {
    await showGraph(graph.id, options)
    return
  }

  const nodeMatches = graphs.flatMap((item) =>
    item.nodes
      .filter((node) => node.id === targetId)
      .map((node) => ({ graph: item, node }))
  )

  if (nodeMatches.length > 0) {
    const results = nodeMatches.map(({ graph: item, node }) => {
      const incoming = item.edges.filter((edge) => edge.target === node.id).map((edge) => edge.id)
      const outgoing = item.edges.filter((edge) => edge.source === node.id).map((edge) => edge.id)
      return {
        graphId: item.id,
        node,
        incoming,
        outgoing,
      }
    })

    if (options.json) {
      printJson(results)
      return
    }

    for (const result of results) {
      console.log(`[${result.graphId}] Node ${describeNode(result.node)}`)
      console.log(`  Incoming: ${result.incoming.join(", ") || "(none)"}`)
      console.log(`  Outgoing: ${result.outgoing.join(", ") || "(none)"}`)
      console.log("")
    }
    return
  }

  const edgeMatches = graphs.flatMap((item) =>
    item.edges
      .filter((edge) => edge.id === targetId)
      .map((edge) => ({ graph: item, edge }))
  )

  if (edgeMatches.length > 0) {
    const results = edgeMatches.map(({ graph: item, edge }) => ({
      graphId: item.id,
      edge,
    }))

    if (options.json) {
      printJson(results)
      return
    }

    for (const result of results) {
      console.log(`[${result.graphId}] Edge ${describeEdge(result.edge)}`)
      console.log(`  Conditions: ${formatInstances(result.edge.conditions)}`)
      console.log(`  Effects: ${formatInstances(result.edge.effects)}`)
      console.log("")
    }
    return
  }

  fail(`❌ Could not find graph, node, or edge with id: ${targetId}`)
}
