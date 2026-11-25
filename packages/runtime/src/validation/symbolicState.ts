import { cloneState } from "../core/state"
import type { GraphRuntimeState, StateTrigger, Transition } from "../types"
import { wasm } from "../wasm"

/** Collect the visit checks that can distinguish two otherwise identical states. */
export function getVisitedConditionNodeIds(
  transitions: readonly Transition[],
  triggers: readonly StateTrigger[],
): string[] {
  return wasm.visitedConditionNodes(transitions, triggers) as string[]
}

export class SymbolicState {
  state: GraphRuntimeState
  private readonly visitedNodeIds?: readonly string[]

  constructor(state: GraphRuntimeState, visitedNodeIds?: readonly string[]) {
    this.state = state
    this.visitedNodeIds = visitedNodeIds
  }

  getFingerprint(): string {
    return wasm.symbolicFingerprint(this.state, this.visitedNodeIds) as string
  }

  clone(): SymbolicState {
    return new SymbolicState(cloneState(this.state), this.visitedNodeIds)
  }
}
