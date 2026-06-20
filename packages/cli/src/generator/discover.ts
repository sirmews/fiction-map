/**
 * File discovery for Fiction Map
 *
 * Discovers graph primitives from file conventions:
 * - nodes/*.node.ts
 * - edges/*.edge.ts
 * - conditions/*.condition.ts
 * - effects/*.effect.ts
 * - graphs/*.graph.ts
 */

import { basename, join } from "node:path"
import { glob } from "glob"

export interface DiscoveredFile {
  path: string
  type: "node" | "edge" | "condition" | "effect" | "graph" | "struct"
  id: string
}

export interface DiscoveryResult {
  nodes: DiscoveredFile[]
  edges: DiscoveredFile[]
  conditions: DiscoveredFile[]
  effects: DiscoveredFile[]
  graphs: DiscoveredFile[]
  structs: DiscoveredFile[]
}

/**
 * Extract ID from filename
 *
 * Examples:
 * - "scene.node.ts" → "scene"
 * - "has-item.condition.ts" → "has-item"
 * - "my-story.graph.ts" → "my-story"
 */
function extractId(filename: string): string {
  const base = basename(filename)
  // Remove extensions like .node.ts, .condition.ts, etc.
  return base.replace(/\.(node|edge|condition|effect|graph|struct)\.ts$/, "")
}

/**
 * Discover all graph primitive files in a directory
 */
export async function discoverFiles(rootDir: string): Promise<DiscoveryResult> {
  const patterns = {
    nodes: join(rootDir, "**/*.node.ts"),
    edges: join(rootDir, "**/*.edge.ts"),
    conditions: join(rootDir, "**/*.condition.ts"),
    effects: join(rootDir, "**/*.effect.ts"),
    graphs: join(rootDir, "**/*.graph.ts"),
    structs: join(rootDir, "**/*.struct.ts"),
  }

  const [nodeFiles, edgeFiles, conditionFiles, effectFiles, graphFiles, structFiles] =
    await Promise.all([
      glob(patterns.nodes, { ignore: ["**/node_modules/**", "**/dist/**"] }),
      glob(patterns.edges, { ignore: ["**/node_modules/**", "**/dist/**"] }),
      glob(patterns.conditions, { ignore: ["**/node_modules/**", "**/dist/**"] }),
      glob(patterns.effects, { ignore: ["**/node_modules/**", "**/dist/**"] }),
      glob(patterns.graphs, { ignore: ["**/node_modules/**", "**/dist/**"] }),
      glob(patterns.structs, { ignore: ["**/node_modules/**", "**/dist/**"] }),
    ])

  return {
    nodes: nodeFiles.map((path) => ({
      path,
      type: "node" as const,
      id: extractId(path),
    })),
    edges: edgeFiles.map((path) => ({
      path,
      type: "edge" as const,
      id: extractId(path),
    })),
    conditions: conditionFiles.map((path) => ({
      path,
      type: "condition" as const,
      id: extractId(path),
    })),
    effects: effectFiles.map((path) => ({
      path,
      type: "effect" as const,
      id: extractId(path),
    })),
    graphs: graphFiles.map((path) => ({
      path,
      type: "graph" as const,
      id: extractId(path),
    })),
    structs: structFiles.map((path) => ({
      path,
      type: "struct" as const,
      id: extractId(path),
    })),
  }
}

/**
 * Print discovery summary
 */
export function printDiscoverySummary(result: DiscoveryResult): void {
  console.log("\n📁 Discovered files:")
  console.log(`   Nodes:       ${result.nodes.length}`)
  console.log(`   Edges:       ${result.edges.length}`)
  console.log(`   Conditions:  ${result.conditions.length}`)
  console.log(`   Effects:     ${result.effects.length}`)
  console.log(`   Graphs:      ${result.graphs.length}`)
  console.log(`   Structs:     ${result.structs.length}`)
  console.log("")
}
