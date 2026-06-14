/**
 * Fiction Map — Graph Definition
 */

import {
  GraphDefinition,
  GraphConfig,
  GraphMetadata,
  NodeInstance,
  EdgeInstance,
  ValidationError,
  ValidationWarning,
  SourceLocation,
} from "./types"
import type { ProjectRegistry } from "./registry"
import { RegistryError } from "./errors"

function formatKnownValues(values: string[], label: string): string {
  return values.length > 0
    ? ` Known ${label}: ${values.map((value) => `"${value}"`).join(", ")}.`
    : ` No ${label} are currently registered.`
}

/**
 * Get the current call site for source location
 */
function getCallSite(): SourceLocation {
  const stack = new Error().stack?.split("\n") || []
  const callerLine = stack[3] || ""
  
  const match = callerLine.match(/(?:at\s+)?(?:.*?\()?(.+?):(\d+):(\d+)/)
  
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
    }
  }
  
  return { file: "unknown", line: 0, column: 0 }
}

/**
 * Validate a graph
 */
export function validateGraph(
  registry: ProjectRegistry,
  nodes: NodeInstance[],
  edges: EdgeInstance[]
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  // Build node index
  const nodeIndex = new Map<string, NodeInstance>()
  for (const node of nodes) {
    if (nodeIndex.has(node.id)) {
      errors.push({
        code: "DUPLICATE_NODE_ID",
        message: `Duplicate node id: "${node.id}"`,
        nodeId: node.id,
      })
    }
    nodeIndex.set(node.id, node)
  }
  
  // Validate nodes
  for (const node of nodes) {
    // Check type exists
    const nodeType = registry.nodeTypes.get(node.type)
    if (!nodeType) {
      errors.push({
        code: "UNKNOWN_NODE_TYPE",
        message:
          `Unknown node type "${node.type}" on node "${node.id}".` +
          formatKnownValues(Array.from(registry.nodeTypes.keys()), "node types"),
        nodeId: node.id,
      })
    }
  }
  
  // Validate edges
  for (const edge of edges) {
    // Check source exists
    if (!nodeIndex.has(edge.source)) {
      errors.push({
        code: "UNKNOWN_SOURCE",
        message:
          `Edge "${edge.id}" references unknown source node "${edge.source}".` +
          formatKnownValues(Array.from(nodeIndex.keys()), "node ids"),
        edgeId: edge.id,
      })
    }
    
    // Check target exists
    if (!nodeIndex.has(edge.target)) {
      errors.push({
        code: "UNKNOWN_TARGET",
        message:
          `Edge "${edge.id}" references unknown target node "${edge.target}".` +
          formatKnownValues(Array.from(nodeIndex.keys()), "node ids"),
        edgeId: edge.id,
      })
    }
    
    // Check edge type exists
    const edgeType = registry.edgeTypes.get(edge.type)
    if (!edgeType) {
      errors.push({
        code: "UNKNOWN_EDGE_TYPE",
        message:
          `Unknown edge type "${edge.type}" on edge "${edge.id}".` +
          formatKnownValues(Array.from(registry.edgeTypes.keys()), "edge types"),
        edgeId: edge.id,
      })
      continue
    }
    
    // Validate edge type constraints
    const sourceNode = nodeIndex.get(edge.source)
    const targetNode = nodeIndex.get(edge.target)
    
    if (sourceNode && edgeType.sourceTypes.length > 0) {
      if (!edgeType.sourceTypes.includes(sourceNode.type)) {
        errors.push({
          code: "INVALID_SOURCE_TYPE",
          message:
            `Edge type "${edge.type}" cannot start from node type "${sourceNode.type}" on edge "${edge.id}". ` +
            `Allowed source types: ${edgeType.sourceTypes.map((type) => `"${type}"`).join(", ")}.`,
          edgeId: edge.id,
          nodeId: edge.source,
        })
      }
    }
    
    if (targetNode && edgeType.targetTypes.length > 0) {
      if (!edgeType.targetTypes.includes(targetNode.type)) {
        errors.push({
          code: "INVALID_TARGET_TYPE",
          message:
            `Edge type "${edge.type}" cannot target node type "${targetNode.type}" on edge "${edge.id}". ` +
            `Allowed target types: ${edgeType.targetTypes.map((type) => `"${type}"`).join(", ")}.`,
          edgeId: edge.id,
          nodeId: edge.target,
        })
      }
    }
    
    // Validate conditions
    if (edge.conditions) {
      for (const condition of edge.conditions) {
        const conditionDef = registry.conditions.get(condition.type)
        if (!conditionDef) {
          errors.push({
            code: "UNKNOWN_CONDITION",
            message:
              `Unknown condition type "${condition.type}" on edge "${edge.id}".` +
              formatKnownValues(Array.from(registry.conditions.keys()), "conditions"),
            edgeId: edge.id,
          })
        }
      }
    }
    
    // Validate effects
    if (edge.effects) {
      for (const effect of edge.effects) {
        const effectDef = registry.effects.get(effect.type)
        if (!effectDef) {
          errors.push({
            code: "UNKNOWN_EFFECT",
            message:
              `Unknown effect type "${effect.type}" on edge "${edge.id}".` +
              formatKnownValues(Array.from(registry.effects.keys()), "effects"),
            edgeId: edge.id,
          })
        } else if (effect.type === "spendResource") {
          const hasAtLeastCondition = edge.conditions?.some(
            (c) => c.type === "resourceAtLeast" && c.key === effect.key
          )
          const isSafeOverspend = effect.clampToZero === true || effect.allowNegative === true

          if (!hasAtLeastCondition && !isSafeOverspend) {
            warnings.push({
              code: "UNPROTECTED_RESOURCE_SPEND",
              message: `Edge "${edge.id}" has a "spendResource" effect on "${effect.key}" but does not configure "clampToZero" or "allowNegative" and is not gated by a "resourceAtLeast" condition. This may result in the transaction silently failing at runtime.`,
              edgeId: edge.id,
            })
          }
        }
      }
    }
  }
  
  // Check for unreachable nodes
  const reachable = new Set<string>()
  const queue = [nodes[0]?.id].filter(Boolean)
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (reachable.has(nodeId)) continue
    reachable.add(nodeId)
    
    for (const edge of edges) {
      if (edge.source === nodeId && !reachable.has(edge.target)) {
        queue.push(edge.target)
      }
    }
  }
  
  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      warnings.push({
        code: "UNREACHABLE_NODE",
        message: `Node "${node.id}" is unreachable from the start`,
        nodeId: node.id,
      })
    }
  }
  
  // Check for nodes with no outgoing edges (endings)
  const hasOutgoing = new Set<string>()
  for (const edge of edges) {
    hasOutgoing.add(edge.source)
  }
  
  const endings: string[] = []
  for (const node of nodes) {
    if (!hasOutgoing.has(node.id)) {
      endings.push(node.id)
    }
  }
  
  // Warn if no endings
  if (endings.length === 0 && nodes.length > 0) {
    warnings.push({
      code: "NO_ENDINGS",
      message: "Graph has no ending nodes (nodes with no outgoing edges)",
    })
  }
  
  return { errors, warnings }
}

export function analyzeGraph(
  registry: ProjectRegistry,
  nodes: NodeInstance[],
  edges: EdgeInstance[]
): {
  errors: ValidationError[]
  warnings: ValidationWarning[]
  maxDepth: number
  endings: string[]
  nodeTypesUsed: string[]
  edgeTypesUsed: string[]
  conditionsUsed: string[]
  effectsUsed: string[]
} {
  const { errors, warnings } = validateGraph(registry, nodes, edges)
  const usage = collectTypeUsage(nodes, edges)

  return {
    errors,
    warnings,
    maxDepth: calculateMaxDepth(nodes, edges),
    endings: findEndings(nodes, edges),
    ...usage,
  }
}

/**
 * Calculate max depth of the graph
 */
function calculateMaxDepth(nodes: NodeInstance[], edges: EdgeInstance[]): number {
  if (nodes.length === 0) return 0
  
  const adjacency = new Map<string, string[]>()
  for (const node of nodes) {
    adjacency.set(node.id, [])
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
  }
  
  const visited = new Set<string>()
  let maxDepth = 0
  
  function dfs(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    maxDepth = Math.max(maxDepth, depth)
    
    for (const target of adjacency.get(nodeId) || []) {
      dfs(target, depth + 1)
    }
  }
  
  dfs(nodes[0].id, 0)
  return maxDepth
}

/**
 * Collect type usage
 */
function collectTypeUsage(
  nodes: NodeInstance[],
  edges: EdgeInstance[]
): {
  nodeTypesUsed: string[]
  edgeTypesUsed: string[]
  conditionsUsed: string[]
  effectsUsed: string[]
} {
  const nodeTypesUsed = new Set<string>()
  const edgeTypesUsed = new Set<string>()
  const conditionsUsed = new Set<string>()
  const effectsUsed = new Set<string>()
  
  for (const node of nodes) {
    nodeTypesUsed.add(node.type)
  }
  
  for (const edge of edges) {
    edgeTypesUsed.add(edge.type)
    if (edge.conditions) {
      for (const c of edge.conditions) {
        conditionsUsed.add(c.type)
      }
    }
    if (edge.effects) {
      for (const e of edge.effects) {
        effectsUsed.add(e.type)
      }
    }
  }
  
  return {
    nodeTypesUsed: Array.from(nodeTypesUsed),
    edgeTypesUsed: Array.from(edgeTypesUsed),
    conditionsUsed: Array.from(conditionsUsed),
    effectsUsed: Array.from(effectsUsed),
  }
}

/**
 * Find ending nodes (nodes with no outgoing edges)
 */
function findEndings(nodes: NodeInstance[], edges: EdgeInstance[]): string[] {
  const hasOutgoing = new Set<string>()
  for (const edge of edges) {
    hasOutgoing.add(edge.source)
  }
  
  return nodes.filter(n => !hasOutgoing.has(n.id)).map(n => n.id)
}

/**
 * Define a graph
 * 
 * @example
 * ```typescript
 * export const myStory = defineGraph(registry, {
 *   id: "my-story",
 *   nodes: [
 *     { id: "start", type: "scene", title: "Beginning" },
 *     { id: "end", type: "scene", title: "Ending" },
 *   ],
 *   edges: [
 *     { id: "c1", type: "choice", source: "start", target: "end", text: "Continue" },
 *   ],
 * })
 * ```
 */
export function defineGraph(registry: ProjectRegistry, config: GraphConfig): GraphDefinition {
  if (!config.id) {
    throw new RegistryError("Graph must have an id", "ERR_REGISTRY_MISSING_ID")
  }
  
  if (registry.graphs.has(config.id)) {
    throw new RegistryError(`Graph "${config.id}" is already defined in this registry`, "ERR_REGISTRY_DUPLICATE_ID")
  }
  
  const analysis = analyzeGraph(registry, config.nodes, config.edges)
  
  const definition: GraphDefinition = {
    id: config.id,
    name: config.id,
    location: getCallSite(),
    nodes: config.nodes,
    edges: config.edges,
    nodeCount: config.nodes.length,
    edgeCount: config.edges.length,
    ...analysis,
  }
  
  registry.graphs.set(config.id, definition)
  
  return definition
}
