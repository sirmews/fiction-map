import { createInitialState } from "../core/state"
import { deriveEntityState } from "../entities/derived"
import type { GraphRuntime } from "../runtime"
import type { GraphRuntimeState } from "../types"
import { SymbolicState } from "./symbolicState"
import type { SemanticError, SemanticValidationOptions, SemanticValidationResult } from "./types"

interface PathNode {
  state: GraphRuntimeState
  path: string[]
  visitedNodes: string[]
}

export function solveGraphSemantics(
  runtime: GraphRuntime,
  world: any, // WorldDefinition
  options: SemanticValidationOptions = {},
): SemanticValidationResult {
  const maxSteps = options.maxSteps ?? 100
  const errors: SemanticError[] = []
  let winnablePathsCount = 0

  // Find all nodes in the graph to identify ending nodes (nodes with no outgoing transitions defined)
  const isEndingNode = (nodeId: string): boolean => {
    return runtime.isEnding(nodeId)
  }

  // Initialize the queue with the start state
  const startState = createInitialState(runtime.startNodeId)
  const queue: PathNode[] = [
    {
      state: startState,
      path: [],
      visitedNodes: [runtime.startNodeId],
    },
  ]

  const visitedStateFingerprints = new Set<string>()
  visitedStateFingerprints.add(new SymbolicState(startState).getFingerprint())

  let stepsCount = 0

  while (queue.length > 0 && stepsCount < maxSteps) {
    stepsCount++
    const { state, path, visitedNodes } = queue.shift()!
    const currentNodeId = state.currentNodeId

    // 1. Check if the current node is a valid ending node
    if (isEndingNode(currentNodeId)) {
      if (currentNodeId !== "death") {
        winnablePathsCount++
      }
      continue
    }

    // 2. Evaluate available transitions under the current simulated state
    const context = {
      derivedState: deriveEntityState(world, state),
    }
    const available = runtime.getAvailable(state, context)

    // 3. Check for Dead Ends (has outgoing transitions defined, but none are available)
    if (available.length === 0) {
      errors.push({
        type: "dead-end-node",
        nodeId: currentNodeId,
        message: `Player is trapped at node '${currentNodeId}'. Outgoing choices exist but none are available under the current state.`,
        path,
      })
      continue
    }

    // 4. Iterate over available transitions
    for (const transition of available) {
      // Apply the transition (which runs effects and triggers)
      const result = runtime.step(state, transition, context)

      if (!result.success || !result.state) {
        continue
      }

      const nextState = result.state
      const nextNodeId = nextState.currentNodeId

      // 5. Check for Unwinnable Paths (Death)
      const health = nextState.entityState?.resources?.health
      const isDead = (health !== undefined && health <= 0) || nextNodeId === "death"

      if (isDead) {
        errors.push({
          type: "unwinnable-path",
          nodeId: nextNodeId,
          message: `Player died at node '${nextNodeId}' after taking transition '${transition.id}'.`,
          path: [...path, transition.id],
        })
        continue
      }

      // 6. Check for Infinite Loops / Cycles
      if (visitedNodes.includes(nextNodeId)) {
        // We detected a cycle. Let's check if it's a resource-draining loop.
        const prevHealth = state.entityState?.resources?.health ?? 100
        const nextHealth = nextState.entityState?.resources?.health ?? 100
        if (nextHealth < prevHealth) {
          errors.push({
            type: "infinite-drain-loop",
            nodeId: nextNodeId,
            message: `Infinite resource-draining loop detected at node '${nextNodeId}'. Health decreased from ${prevHealth} to ${nextHealth}.`,
            path: [...path, transition.id],
          })
          continue
        }
      }

      // 7. Memoize and Prune
      const symbolic = new SymbolicState(nextState)
      const fingerprint = symbolic.getFingerprint()

      if (visitedStateFingerprints.has(fingerprint)) {
        continue
      }

      visitedStateFingerprints.add(fingerprint)

      // Push the new state to the queue to continue exploration
      queue.push({
        state: nextState,
        path: [...path, transition.id],
        visitedNodes: [...visitedNodes, nextNodeId],
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    winnablePathsCount,
  }
}
