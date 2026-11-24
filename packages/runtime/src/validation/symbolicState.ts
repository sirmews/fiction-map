import { cloneState } from "../core/state"
import type { Condition, GraphRuntimeState, StateTrigger, Transition } from "../types"

/** Collect the visit checks that can distinguish two otherwise identical states. */
export function getVisitedConditionNodeIds(
  transitions: readonly Transition[],
  triggers: readonly StateTrigger[],
): string[] {
  const nodeIds = new Set<string>()
  const collect = (conditions: Condition[] = []) => {
    for (const condition of conditions) {
      if (
        (condition.type === "visited" || condition.type === "notVisited") &&
        typeof condition.nodeId === "string"
      ) {
        nodeIds.add(condition.nodeId)
      }
    }
  }

  for (const { requirements, visibility } of transitions) {
    for (const group of [requirements, visibility]) {
      collect(group?.all)
      collect(group?.any)
      collect(group?.none)
    }
  }
  for (const trigger of triggers) {
    collect(trigger.conditions)
  }
  return [...nodeIds]
}

export class SymbolicState {
  state: GraphRuntimeState
  private readonly visitedNodeIds?: readonly string[]

  constructor(state: GraphRuntimeState, visitedNodeIds?: readonly string[]) {
    this.state = state
    this.visitedNodeIds = visitedNodeIds
  }

  getFingerprint(): string {
    const s = this.state
    const entityState = s.entityState
    const resources = entityState?.resources ?? {}
    return JSON.stringify({
      node: s.currentNodeId,
      flags: Object.keys(s.flags)
        .sort()
        .map((key) => [key, typeof s.flags[key], String(s.flags[key])]),
      owned: [...(entityState?.owned ?? [])].sort(),
      active: [...(entityState?.active ?? [])].sort(),
      unlocked: [...(entityState?.unlocked ?? [])].sort(),
      resources: Object.keys(resources)
        .sort()
        .map((key) => [key, String(resources[key])]),
      variables: Object.keys(s.variables)
        .sort()
        .map((key) => [key, String(s.variables[key])]),
      visited: this.visitedNodeIds
        ? this.visitedNodeIds.filter((id) => s.visited.has(id)).sort()
        : undefined,
    })
  }

  clone(): SymbolicState {
    return new SymbolicState(cloneState(this.state), this.visitedNodeIds)
  }
}
