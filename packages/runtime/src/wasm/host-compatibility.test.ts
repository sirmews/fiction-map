import { describe, expect, it } from "vitest"
import {
  applyEffect,
  createInitialState,
  evaluateCondition,
  getAvailableTransitions,
  getTransitionsByAvailability,
  setVariableHandler,
  visitedEvaluator,
} from "../index"
import type { ConditionEvaluator, EffectHandler, Transition } from "../types"

describe("live JavaScript host", () => {
  it("dispatches by callback identity when a consumer aliases or replaces a built-in", () => {
    const state = createInitialState("start")
    const condition = { type: "alias", nodeId: "start" }
    const evaluators = new Map<string, ConditionEvaluator>([["alias", visitedEvaluator]])
    expect(evaluateCondition(state, condition, evaluators)).toBe(true)

    const thrown = { error: "consumer exception" }
    const replacement: ConditionEvaluator = () => {
      throw thrown
    }
    Object.defineProperty(replacement, "call", { value: null })
    evaluators.set("alias", replacement)
    let observed: unknown
    try {
      evaluateCondition(state, condition, evaluators)
    } catch (error) {
      observed = error
    }
    expect(observed).toBe(thrown)

    const payload = new Map([[Symbol(), new Set([2])]])
    const handlers = new Map<string, EffectHandler>([["alias", setVariableHandler]])
    const effect = { type: "alias", key: "payload", value: payload }
    expect(applyEffect(state, effect, handlers).variables.payload).toBe(payload)
    handlers.set("alias", (original) => original)
    expect(applyEffect(state, effect, handlers)).toBe(state)
  })

  it("reads future source nodes after callbacks and honors each public iterator's length semantics", () => {
    function exercise(grouped: boolean) {
      const state = createInitialState("start")
      const rows: Transition[] = [
        { id: "first", sourceNodeId: "start", requirements: { all: [{ type: "edit" }] } },
        { id: "second", sourceNodeId: "elsewhere" },
      ]
      const evaluators = new Map<string, ConditionEvaluator>([
        [
          "edit",
          () => {
            rows[1].sourceNodeId = "start"
            rows.push({ id: "appended", sourceNodeId: "start" })
            return true
          },
        ],
      ])
      return (
        grouped
          ? getTransitionsByAvailability(state, rows, evaluators).available
          : getAvailableTransitions(state, rows, evaluators)
      ).map((row) => row.id)
    }
    expect(exercise(false)).toEqual(["first", "second"])
    expect(exercise(true)).toEqual(["first", "second", "appended"])
  })

  it("reads enumerable string getters in order and keeps safe own values in null-prototype bags", () => {
    const seed = Object.create({ inherited: 1 })
    const reads: string[] = []
    for (const key of ["first", "__proto__", "last"]) {
      Object.defineProperty(seed, key, {
        enumerable: true,
        get() {
          reads.push(key)
          return key
        },
      })
    }
    Object.defineProperty(seed, Symbol("ignored"), {
      enumerable: true,
      get() {
        throw Error("symbol read")
      },
    })
    const state = createInitialState("start", seed)
    expect(reads).toEqual(["first", "__proto__", "last"])
    expect(Object.getPrototypeOf(state.variables)).toBeNull()
    expect(Object.keys(state.variables)).toEqual(["first", "last"])
  })
})
