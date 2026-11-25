import type { NodeDefinition, Transition, ValidationResult } from "../types"
import { wasm } from "../wasm"

/** Check graph endpoints, reachability, and orphan nodes in declaration order. */
export function validateGraph(
  nodes: Map<string, NodeDefinition>,
  transitions: Transition[],
  startNodeId: string,
): ValidationResult {
  return wasm.validateGraph(nodes, transitions, startNodeId) as ValidationResult
}

export function findReachableNodes(
  nodes: Map<string, NodeDefinition>,
  transitions: Transition[],
  startNodeId: string,
): Set<string> {
  return validateGraph(nodes, transitions, startNodeId).reachableNodes
}

export function hasDanglingTransitions(transitions: Transition[], nodeIds: Set<string>): boolean {
  return wasm.hasDanglingTransitions(transitions, nodeIds)
}

export function hasUnreachableNodes(
  nodes: Map<string, NodeDefinition>,
  transitions: Transition[],
  startNodeId: string,
): boolean {
  return validateGraph(nodes, transitions, startNodeId).errors.some(
    (diagnostic) => diagnostic.type === "unreachable-node",
  )
}
