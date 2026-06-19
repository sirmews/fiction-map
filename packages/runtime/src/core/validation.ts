import type { GraphError, NodeDefinition, Transition, ValidationResult } from "../types"

/**
 * Validate graph integrity.
 *
 * Checks:
 * - Empty graph
 * - Missing start node
 * - Dangling transitions (references non-existent nodes)
 * - Unreachable nodes (not reachable from start)
 * - Orphan nodes (no connections)
 *
 * @param nodes - Map of node ID → node definition
 * @param transitions - All transitions in the graph
 * @param startNodeId - The starting node ID
 * @returns ValidationResult with valid flag, errors, and reachable nodes
 */
export function validateGraph(
  nodes: Map<string, NodeDefinition>,
  transitions: Transition[],
  startNodeId: string,
): ValidationResult {
  const errors: GraphError[] = []
  const reachableNodes = new Set<string>()

  if (nodes.size === 0) {
    errors.push({
      type: "empty-graph",
      message: "Graph is empty",
    })

    return {
      valid: false,
      errors,
      reachableNodes,
    }
  }

  if (!nodes.has(startNodeId)) {
    errors.push({
      type: "missing-start-node",
      nodeId: startNodeId,
      message: `Start node '${startNodeId}' does not exist in graph`,
    })

    return {
      valid: false,
      errors,
      reachableNodes,
    }
  }

  const nodeIds = new Set(nodes.keys())
  const transitionIndex = buildTransitionIndex(transitions)

  for (const transition of transitions) {
    if (!nodes.has(transition.sourceNodeId)) {
      errors.push({
        type: "dangling-transition",
        transitionId: transition.id,
        message: `Transition '${transition.id}' has non-existent source node '${transition.sourceNodeId}'`,
      })
    }

    const targetId = transition.targetNodeId
    if (targetId && !nodes.has(targetId)) {
      errors.push({
        type: "dangling-transition",
        transitionId: transition.id,
        nodeId: targetId,
        message: `Transition '${transition.id}' points to non-existent node '${targetId}'`,
      })
    }

    const failureTargetId = transition.failureTargetNodeId
    if (failureTargetId && !nodes.has(failureTargetId)) {
      errors.push({
        type: "dangling-transition",
        transitionId: transition.id,
        nodeId: failureTargetId,
        message: `Transition '${transition.id}' has failure target pointing to non-existent node '${failureTargetId}'`,
      })
    }
  }

  const queue = [startNodeId]

  while (queue.length > 0) {
    const currentId = queue.shift()!

    if (reachableNodes.has(currentId)) {
      continue
    }

    reachableNodes.add(currentId)

    const outgoingTransitions = transitionIndex.outgoing.get(currentId) ?? []
    for (const transition of outgoingTransitions) {
      const targets = [transition.targetNodeId, transition.failureTargetNodeId].filter(
        (id): id is string => id !== undefined,
      )

      for (const targetId of targets) {
        if (!reachableNodes.has(targetId)) {
          queue.push(targetId)
        }
      }
    }
  }

  for (const nodeId of nodeIds) {
    if (!reachableNodes.has(nodeId)) {
      errors.push({
        type: "unreachable-node",
        nodeId,
        message: `Node '${nodeId}' is not reachable from start node '${startNodeId}'`,
      })
    }
  }

  for (const nodeId of nodeIds) {
    const hasIncoming = transitionIndex.incoming.has(nodeId)
    const hasOutgoing = transitionIndex.outgoing.has(nodeId)

    if (!hasIncoming && !hasOutgoing && nodeId !== startNodeId) {
      errors.push({
        type: "orphan-node",
        nodeId,
        message: `Node '${nodeId}' has no incoming or outgoing transitions`,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    reachableNodes,
  }
}

/**
 * Find all reachable nodes from a starting node.
 *
 * @param nodes - Map of node ID → node definition
 * @param transitions - All transitions in the graph
 * @param startNodeId - The starting node ID
 * @returns Set of reachable node IDs
 */
export function findReachableNodes(
  nodes: Map<string, NodeDefinition>,
  transitions: Transition[],
  startNodeId: string,
): Set<string> {
  const result = validateGraph(nodes, transitions, startNodeId)
  return result.reachableNodes
}

/**
 * Check if a graph has dangling transitions.
 *
 * @param transitions - All transitions in the graph
 * @param nodeIds - Set of valid node IDs
 * @returns true if any transition points to a non-existent node
 */
export function hasDanglingTransitions(transitions: Transition[], nodeIds: Set<string>): boolean {
  for (const transition of transitions) {
    if (!nodeIds.has(transition.sourceNodeId)) {
      return true
    }
    if (transition.targetNodeId && !nodeIds.has(transition.targetNodeId)) {
      return true
    }
    if (transition.failureTargetNodeId && !nodeIds.has(transition.failureTargetNodeId)) {
      return true
    }
  }
  return false
}

/**
 * Check if a graph has unreachable nodes.
 *
 * @param nodes - Map of node ID → node definition
 * @param transitions - All transitions in the graph
 * @param startNodeId - The starting node ID
 * @returns true if any node is not reachable from start
 */
export function hasUnreachableNodes(
  nodes: Map<string, NodeDefinition>,
  transitions: Transition[],
  startNodeId: string,
): boolean {
  const result = validateGraph(nodes, transitions, startNodeId)
  return result.errors.some((e) => e.type === "unreachable-node")
}

/**
 * Build an index of transitions by source and target.
 */
function buildTransitionIndex(transitions: Transition[]): {
  outgoing: Map<string, Transition[]>
  incoming: Map<string, Transition[]>
} {
  const outgoing = new Map<string, Transition[]>()
  const incoming = new Map<string, Transition[]>()

  for (const transition of transitions) {
    const sourceList = outgoing.get(transition.sourceNodeId) ?? []
    sourceList.push(transition)
    outgoing.set(transition.sourceNodeId, sourceList)

    if (transition.targetNodeId) {
      const targetList = incoming.get(transition.targetNodeId) ?? []
      targetList.push(transition)
      incoming.set(transition.targetNodeId, targetList)
    }

    if (transition.failureTargetNodeId) {
      const failureList = incoming.get(transition.failureTargetNodeId) ?? []
      failureList.push(transition)
      incoming.set(transition.failureTargetNodeId, failureList)
    }
  }

  return { outgoing, incoming }
}
