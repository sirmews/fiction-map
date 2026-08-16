import { cloneState } from "../core/state"
import type { GraphRuntimeState, StateField } from "../types"

/**
 * Fields the fingerprint ALWAYS includes. `currentNode` is the position; the
 * rest are the mutable data buckets every default evaluator touches.
 */
const CORE_FIELDS: ReadonlySet<StateField> = new Set<StateField>([
  "currentNode",
  "flags",
  "variables",
  "entityOwned",
  "entityActive",
  "entityUnlocked",
  "entityResources",
])

/**
 * Symbolic abstraction of a runtime state used for cycle detection during
 * graph traversal and path enumeration.
 *
 * The fingerprint is a canonical string over the subset of state fields that
 * any registered condition evaluator declares it reads (via `reads`). Two
 * states with the same fingerprint are treated as equivalent for forward
 * exploration and pruned. This is sound iff the fingerprint captures every
 * state field that could affect future transition availability — which is
 * exactly what the `reads` declarations guarantee.
 *
 * `history` is intentionally excluded from the default projection: it is
 * unbounded (grows every step), so including it would defeat cycle pruning.
 * If a consumer registers an evaluator that reads `history`, the runtime
 * disables pruning entirely and relies on depth/path bounds for termination.
 */
export class SymbolicState {
  state: GraphRuntimeState
  private readonly projection: ReadonlySet<StateField>

  constructor(state: GraphRuntimeState, projection?: ReadonlySet<StateField>) {
    this.state = state
    this.projection = projection ?? CORE_FIELDS
  }

  getFingerprint(): string {
    const s = this.state
    const p = this.projection

    const parts: string[] = []

    if (p.has("currentNode")) {
      parts.push(`n:${s.currentNodeId}`)
    }

    if (p.has("flags")) {
      const flagsStr = Object.keys(s.flags)
        .sort()
        .map((k) => `${k}:${s.flags[k]}`)
        .join(",")
      parts.push(`f:${flagsStr}`)
    }

    if (p.has("variables")) {
      const varsStr = Object.keys(s.variables)
        .sort()
        .map((k) => `${k}:${s.variables[k]}`)
        .join(",")
      parts.push(`v:${varsStr}`)
    }

    if (p.has("visited")) {
      const visitedStr = Array.from(s.visited).sort().join(",")
      parts.push(`vs:${visitedStr}`)
    }

    if (p.has("history")) {
      const historyStr = s.history.join(",")
      parts.push(`h:${historyStr}`)
    }

    const es = s.entityState
    if (es) {
      if (p.has("entityOwned")) {
        parts.push(`eo:${Array.from(es.owned ?? []).sort().join(",")}`)
      }
      if (p.has("entityActive")) {
        parts.push(`ea:${Array.from(es.active ?? []).sort().join(",")}`)
      }
      if (p.has("entityUnlocked")) {
        parts.push(`eu:${Array.from(es.unlocked ?? []).sort().join(",")}`)
      }
      if (p.has("entityResources")) {
        const resStr = Object.keys(es.resources ?? {})
          .sort()
          .map((k) => `${k}:${es.resources[k]}`)
          .join(",")
        parts.push(`er:${resStr}`)
      }
    }

    if (p.has("extensions") && s.extensions) {
      const extStr = Object.keys(s.extensions)
        .sort()
        .map((k) => `${k}:${JSON.stringify(s.extensions![k])}`)
        .join(",")
      parts.push(`x:${extStr}`)
    }

    return parts.join("|")
  }

  clone(): SymbolicState {
    return new SymbolicState(cloneState(this.state), this.projection)
  }
}
