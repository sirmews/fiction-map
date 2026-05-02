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
import { getNodeTypes, getNodeType } from "./node-type"
import { getEdgeTypes, getEdgeType } from "./edge-type"
import { getConditions, getCondition } from "./condition"
import { getEffects, getEffect } from "./effect"

// Global registry for graphs
const graphRegistry = new Map<string, GraphDefinition>()

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
function validateGraph(
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
    const nodeType = getNodeType(node.type)
    if (!nodeType) {
      errors.push({
        code: "UNKNOWN_NODE_TYPE",
        message: `Unknown node type: "${node.type}"`,
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
        message: `Edge "${edge.id}" references unknown source node: "${edge.source}"`,
        edgeId: edge.id,
      })
    }
    
    // Check target exists
    if (!nodeIndex.has(edge.target)) {
      errors.push({
        code: "UNKNOWN_TARGET",
        message: `Edge "${edge.id}" references unknown target node: "${edge.target}"`,
        edgeId: edge.id,
      })
    }
    
    // Check edge type exists
    const edgeType = getEdgeType(edge.type)
    if (!edgeType) {
      errors.push({
        code: "UNKNOWN_EDGE_TYPE",
        message: `Unknown edge type: "${edge.type}"`,
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
          message: `Edge type "${edge.type}" cannot start from node type "${sourceNode.type}"`,
          edgeId: edge.id,
          nodeId: edge.source,
        })
      }
    }
    
    if (targetNode && edgeType.targetTypes.length > 0) {
      if (!edgeType.targetTypes.includes(targetNode.type)) {
        errors.push({
          code: "INVALID_TARGET_TYPE",
          message: `Edge type "${edge.type}" cannot target node type "${targetNode.type}"`,
          edgeId: edge.id,
          nodeId: edge.target,
        })
      }
    }
    
    // Validate conditions
    if (edge.conditions) {
      for (const condition of edge.conditions) {
        const conditionDef = getCondition(condition.type)
        if (!conditionDef) {
          errors.push({
            code: "UNKNOWN_CONDITION",
            message: `Unknown condition type: "${condition.type}"`,
            edgeId: edge.id,
          })
        }
      }
    }
    
    // Validate effects
    if (edge.effects) {
      for (const effect of edge.effects) {
        const effectDef = getEffect(effect.type)
        if (!effectDef) {
          errors.push({
            code: "UNKNOWN_EFFECT",
            message: `Unknown effect type: "${effect.type}"`,
            edgeId: edge.id,
          })
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
 * export const myStory = defineGraph({
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
export function defineGraph(config: GraphConfig): GraphDefinition {
  if (!config.id) {
    throw new Error("Graph must have an id")
  }
  
  if (graphRegistry.has(config.id)) {
    throw new Error(`Graph "${config.id}" is already defined`)
  }
  
  const { errors, warnings } = validateGraph(config.nodes, config.edges)
  const usage = collectTypeUsage(config.nodes, config.edges)
  
  const definition: GraphDefinition = {
    id: config.id,
    name: config.id,
    location: getCallSite(),
    nodes: config.nodes,
    edges: config.edges,
    nodeCount: config.nodes.length,
    edgeCount: config.edges.length,
    maxDepth: calculateMaxDepth(config.nodes, config.edges),
    endings: findEndings(config.nodes, config.edges),
    ...usage,
    errors,
    warnings,
  }
  
  graphRegistry.set(config.id, definition)
  
  return definition
}

/**
 * Get all registered graphs
 */
export function getGraphs(): Map<string, GraphDefinition> {
  return new Map(graphRegistry)
}

/**
 * Get a specific graph
 */
export function getGraph(id: string): GraphDefinition | undefined {
  return graphRegistry.get(id)
}

/**
 * Clear the registry (useful for testing)
 */
export function clearGraphs(): void {
  graphRegistry.clear()
}

/**
 * Generate metadata for all registered types
 */
export function generateMetadata(): GraphMetadata {
  const nodeTypes = Array.from(getNodeTypes().values())
  const edgeTypes = Array.from(getEdgeTypes().values())
  const conditions = Array.from(getConditions().values())
  const effects = Array.from(getEffects().values())
  const graphs = Array.from(getGraphs().values())
  
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  
  for (const graph of graphs) {
    errors.push(...graph.errors)
    warnings.push(...graph.warnings)
  }
  
  return {
    nodeTypes,
    edgeTypes,
    conditions,
    effects,
    graphs,
    validation: { errors, warnings },
  }
}
