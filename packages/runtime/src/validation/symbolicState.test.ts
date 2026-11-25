import { describe, expect, it } from "vitest"
import { createInitialState } from "../core/state"
import { SymbolicState } from "./symbolicState"

describe("SymbolicState", () => {
  it("distinguishes active and unlocked entity sets", () => {
    const base = createInitialState("start")
    base.entityState = { owned: new Set(), active: new Set(), unlocked: new Set(), resources: {} }

    const active = structuredClone(base)
    active.entityState!.active.add("key")
    const unlocked = structuredClone(base)
    unlocked.entityState!.unlocked.add("key")

    expect(new SymbolicState(active).getFingerprint()).not.toBe(
      new SymbolicState(base).getFingerprint(),
    )
    expect(new SymbolicState(unlocked).getFingerprint()).not.toBe(
      new SymbolicState(base).getFingerprint(),
    )
  })

  it("supports values that were string-coerced by the previous fingerprint", () => {
    const state = createInitialState("start", { large: 1n })
    expect(() => new SymbolicState(state).getFingerprint()).not.toThrow()
  })
})
