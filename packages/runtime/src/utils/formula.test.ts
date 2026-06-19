import { describe, expect, it } from "vitest"
import type { GraphRuntimeState } from "../types"
import { evaluateFormula } from "./formula"

describe("Formula Evaluator", () => {
  const dummyState: GraphRuntimeState = {
    currentNodeId: "room-1",
    variables: {
      global_multiplier: 2,
    },
    flags: {},
    visited: new Set(),
    entityState: {
      ownedEntityIds: new Set(),
      activeEntityIds: new Set(),
      unlockedEntityIds: new Set(),
      resources: {
        intelligence: 15,
        level: 2,
      },
    },
  }

  it("evaluates simple static numbers", () => {
    expect(evaluateFormula("42", dummyState)).toBe(42)
    expect(evaluateFormula("10.5", dummyState)).toBe(10.5)
  })

  it("evaluates basic operators and respects precedence", () => {
    expect(evaluateFormula("2 + 3 * 4", dummyState)).toBe(14)
    expect(evaluateFormula("(2 + 3) * 4", dummyState)).toBe(20)
    expect(evaluateFormula("100 / 2 - 5", dummyState)).toBe(45)
  })

  it("substitutes player resources and global variables successfully", () => {
    expect(evaluateFormula("intelligence * 2", dummyState)).toBe(30)
    expect(evaluateFormula("level * 100", dummyState)).toBe(200)
    expect(evaluateFormula("intelligence + global_multiplier", dummyState)).toBe(17)
  })

  it("defaults unresolved variables to 0 safely", () => {
    expect(evaluateFormula("nonexistent_stat + 5", dummyState)).toBe(5)
  })

  it("handles division by zero safely", () => {
    expect(evaluateFormula("10 / 0", dummyState)).toBe(0)
    expect(evaluateFormula("10 / (5 - 5)", dummyState)).toBe(0)
  })

  it("handles unary minus and plus operators", () => {
    expect(evaluateFormula("-5", dummyState)).toBe(-5)
    expect(evaluateFormula("-(2 + 3)", dummyState)).toBe(-5)
    expect(evaluateFormula("+5", dummyState)).toBe(5)
    expect(evaluateFormula("intelligence * -2", dummyState)).toBe(-30)
  })
})
