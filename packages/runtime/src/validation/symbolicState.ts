import { cloneState } from "../core/state"
import type { GraphRuntimeState } from "../types"

export class SymbolicState {
  state: GraphRuntimeState

  constructor(state: GraphRuntimeState) {
    this.state = state
  }

  getFingerprint(): string {
    const s = this.state
    const flagsStr = Array.from(Object.keys(s.flags))
      .sort()
      .map((k) => `${k}:${s.flags[k]}`)
      .join(",")

    let entitiesStr = ""
    if (s.entityState?.owned) {
      entitiesStr = Array.from(s.entityState.owned).sort().join(",")
    }

    let resourcesStr = ""
    if (s.entityState?.resources) {
      resourcesStr = Object.keys(s.entityState.resources)
        .sort()
        .map((k) => `${k}:${s.entityState!.resources[k]}`)
        .join(",")
    }

    const varsStr = Object.keys(s.variables)
      .sort()
      .map((k) => `${k}:${s.variables[k]}`)
      .join(",")

    return `${s.currentNodeId}|flags:${flagsStr}|entities:${entitiesStr}|resources:${resourcesStr}|vars:${varsStr}`
  }

  clone(): SymbolicState {
    return new SymbolicState(cloneState(this.state))
  }
}
