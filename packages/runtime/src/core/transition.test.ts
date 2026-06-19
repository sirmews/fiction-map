import { describe, expect, it } from "vitest"
import { evaluateConditionSet } from "../conditions"
import {
  addResource,
  createInitialState,
  entityIsActive,
  entityIsUnlocked,
  getResource,
  grantEntity,
  ownsEntity,
  unlockEntity,
} from "../core/state"
import {
  applyTransition,
  checkTransitionAvailability,
  getAvailableTransitions,
  getTransitionsByAvailability,
} from "../core/transition"
import {
  findReachableNodes,
  hasDanglingTransitions,
  hasUnreachableNodes,
  validateGraph,
} from "../core/validation"
import { builtinEvaluators, builtinHandlers } from "../default-bindings"
import { applyEffect, applyEffects } from "../effects"
import type { ConditionSet, Transition } from "../types"

describe("condition evaluation", () => {
  it("evaluates equals condition", () => {
    const state = createInitialState("scene-1", { gold: 100 })
    const condition = { type: "equals" as const, key: "gold", value: 100 }

    const result = evaluateConditionSet(state, { all: [condition] }, builtinEvaluators)

    expect(result).toBe(true)
  })

  it("evaluates greaterThan condition", () => {
    const state = createInitialState("scene-1", { gold: 100 })
    const condition = { type: "greaterThan" as const, key: "gold", value: 50 }

    const result = evaluateConditionSet(state, { all: [condition] }, builtinEvaluators)

    expect(result).toBe(true)
  })

  it("evaluates hasFlag condition", () => {
    let state = createInitialState("scene-1")
    state = { ...state, flags: { ...state.flags, "has-key": true } }

    const condition = { type: "hasFlag" as const, key: "has-key" }

    const result = evaluateConditionSet(state, { all: [condition] }, builtinEvaluators)

    expect(result).toBe(true)
  })

  it("evaluates visited condition", () => {
    const state = createInitialState("scene-1")

    const condition = { type: "visited" as const, nodeId: "scene-1" }

    const result = evaluateConditionSet(state, { all: [condition] }, builtinEvaluators)

    expect(result).toBe(true)
  })

  it("evaluates entity-aware conditions", () => {
    let state = createInitialState("scene-1")
    state = grantEntity(state, "lantern")
    state = unlockEntity(state, "dark-cave")
    state = addResource(state, "gold", 12)

    const conditionSet: ConditionSet = {
      all: [
        { type: "hasEntity", entityId: "lantern" },
        { type: "entityUnlocked", entityId: "dark-cave" },
        { type: "resourceAtLeast", key: "gold", value: 10 },
      ],
      none: [
        { type: "entityActive", entityId: "cursed-ring" },
        { type: "resourceAtLeast", key: "gold", value: 20 },
      ],
    }

    const result = evaluateConditionSet(state, conditionSet, builtinEvaluators)

    expect(result).toBe(true)
  })

  it("evaluates all/any/none composition", () => {
    let state = createInitialState("scene-1", { gold: 100 })
    state = { ...state, flags: { ...state.flags, "has-key": true } }

    const conditionSet: ConditionSet = {
      all: [
        { type: "greaterThan", key: "gold", value: 50 },
        { type: "hasFlag", key: "has-key" },
      ],
      none: [{ type: "equals", key: "gold", value: 0 }],
    }

    const result = evaluateConditionSet(state, conditionSet, builtinEvaluators)

    expect(result).toBe(true)
  })
})

describe("effect application", () => {
  it("applies setVariable effect", () => {
    const state = createInitialState("scene-1", { gold: 100 })
    const effect = { type: "setVariable" as const, key: "gold", value: 200 }

    const newState = applyEffect(state, effect, builtinHandlers)

    expect(newState.variables.gold).toBe(200)
    expect(state.variables.gold).toBe(100)
  })

  it("applies increment effect", () => {
    const state = createInitialState("scene-1", { gold: 100 })
    const effect = { type: "increment" as const, key: "gold", delta: 50 }

    const newState = applyEffect(state, effect, builtinHandlers)

    expect(newState.variables.gold).toBe(150)
  })

  it("applies setFlag effect", () => {
    const state = createInitialState("scene-1")
    const effect = { type: "setFlag" as const, key: "has-key", value: true }

    const newState = applyEffect(state, effect, builtinHandlers)

    expect(newState.flags["has-key"]).toBe(true)
  })

  it("applies multiple effects in sequence", () => {
    const state = createInitialState("scene-1", { gold: 100 })
    const effects = [
      { type: "increment" as const, key: "gold", delta: 50 },
      { type: "setFlag" as const, key: "opened-chest", value: true },
    ]

    const newState = applyEffects(state, effects, builtinHandlers)

    expect(newState.variables.gold).toBe(150)
    expect(newState.flags["opened-chest"]).toBe(true)
  })

  it("applies entity-aware effects", () => {
    const state = createInitialState("scene-1")
    const effects = [
      { type: "grantEntity", entityId: "lantern" },
      { type: "activateEntity", entityId: "night-vision" },
      { type: "unlockEntity", entityId: "dark-cave" },
      { type: "addResource", key: "gold", amount: 12 },
      { type: "spendResource", key: "gold", amount: 5 },
    ]

    const newState = applyEffects(state, effects, builtinHandlers)

    expect(ownsEntity(newState, "lantern")).toBe(true)
    expect(entityIsActive(newState, "night-vision")).toBe(true)
    expect(entityIsUnlocked(newState, "dark-cave")).toBe(true)
    expect(getResource(newState, "gold")).toBe(7)
    expect(state.entityState).toBeUndefined()
  })

  it("applies entity-aware removal effects", () => {
    let state = createInitialState("scene-1")
    state = grantEntity(state, "lantern")
    state = grantEntity(state, "silver-key")
    state = unlockEntity(state, "dark-cave")
    state = applyEffect(
      state,
      { type: "activateEntity", entityId: "night-vision" },
      builtinHandlers,
    )

    const newState = applyEffects(
      state,
      [
        { type: "revokeEntity", entityId: "silver-key" },
        { type: "deactivateEntity", entityId: "night-vision" },
        { type: "lockEntity", entityId: "dark-cave" },
      ],
      builtinHandlers,
    )

    expect(ownsEntity(newState, "lantern")).toBe(true)
    expect(ownsEntity(newState, "silver-key")).toBe(false)
    expect(entityIsActive(newState, "night-vision")).toBe(false)
    expect(entityIsUnlocked(newState, "dark-cave")).toBe(false)
  })

  it("does not spend unavailable resources", () => {
    const state = addResource(createInitialState("scene-1"), "gold", 3)

    const newState = applyEffect(
      state,
      { type: "spendResource", key: "gold", amount: 5 },
      builtinHandlers,
    )

    expect(getResource(newState, "gold")).toBe(3)
  })
})

describe("transition engine", () => {
  it("checks transition availability", () => {
    const state = createInitialState("scene-1", { gold: 100 })

    const transition: Transition = {
      id: "buy-sword",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [{ type: "greaterThan", key: "gold", value: 50 }],
      },
    }

    const availability = checkTransitionAvailability(state, transition, builtinEvaluators)

    expect(availability.allowed).toBe(true)
    expect(availability.visible).toBe(true)
  })

  it("applies successful transition", () => {
    const state = createInitialState("scene-1", { gold: 100 })

    const transition: Transition = {
      id: "buy-sword",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [{ type: "greaterThan", key: "gold", value: 50 }],
      },
      effects: [
        { type: "increment", key: "gold", delta: -50 },
        { type: "setFlag", key: "has-sword", value: true },
      ],
    }

    const result = applyTransition(state, transition, builtinEvaluators, builtinHandlers)

    expect(result.success).toBe(true)
    expect(result.shouldNavigate).toBe(true)
    expect(result.nextNodeId).toBe("scene-2")
    expect(result.state.variables.gold).toBe(50)
    expect(result.state.flags["has-sword"]).toBe(true)
    expect(result.state.currentNodeId).toBe("scene-2")
  })

  it("applies successful entity-aware transition", () => {
    let state = createInitialState("scene-1")
    state = grantEntity(state, "lantern")
    state = addResource(state, "gold", 10)

    const transition: Transition = {
      id: "enter-cave",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [
          { type: "hasEntity", entityId: "lantern" },
          { type: "resourceAtLeast", key: "gold", value: 5 },
        ],
      },
      effects: [
        { type: "spendResource", key: "gold", amount: 5 },
        { type: "unlockEntity", entityId: "dark-cave" },
      ],
    }

    const result = applyTransition(state, transition, builtinEvaluators, builtinHandlers)

    expect(result.success).toBe(true)
    expect(result.state.currentNodeId).toBe("scene-2")
    expect(getResource(result.state, "gold")).toBe(5)
    expect(entityIsUnlocked(result.state, "dark-cave")).toBe(true)
  })

  it("blocks entity-aware transition when requirements are not met", () => {
    const state = addResource(createInitialState("scene-1"), "gold", 3)

    const transition: Transition = {
      id: "enter-cave",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [
          { type: "hasEntity", entityId: "lantern" },
          { type: "resourceAtLeast", key: "gold", value: 5 },
        ],
      },
      effects: [
        { type: "spendResource", key: "gold", amount: 5 },
        { type: "unlockEntity", entityId: "dark-cave" },
      ],
    }

    const result = applyTransition(state, transition, builtinEvaluators, builtinHandlers)

    expect(result.success).toBe(false)
    expect(result.state.currentNodeId).toBe("scene-1")
    expect(getResource(result.state, "gold")).toBe(3)
    expect(entityIsUnlocked(result.state, "dark-cave")).toBe(false)
  })

  it("explains failed entity-aware availability requirements", () => {
    const state = addResource(createInitialState("scene-1"), "gold", 3)

    const transition: Transition = {
      id: "enter-cave",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [
          { type: "hasEntity", entityId: "lantern" },
          { type: "resourceAtLeast", key: "gold", value: 5 },
        ],
      },
    }

    const availability = checkTransitionAvailability(state, transition, builtinEvaluators)

    expect(availability.allowed).toBe(false)
    expect(availability.visible).toBe(true)
    expect(availability.reason).toBe("Requirements not met")
    expect(availability.failedConditions).toEqual([
      {
        scope: "requirements",
        group: "all",
        condition: { type: "hasEntity", entityId: "lantern" },
      },
      {
        scope: "requirements",
        group: "all",
        condition: { type: "resourceAtLeast", key: "gold", value: 5 },
      },
    ])
  })

  it("explains hidden entity-aware transitions separately from blocked transitions", () => {
    const state = createInitialState("scene-1")

    const transition: Transition = {
      id: "secret-door",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      visibility: {
        all: [{ type: "entityUnlocked", entityId: "secret-door" }],
      },
      requirements: {
        all: [{ type: "hasEntity", entityId: "silver-key" }],
      },
    }

    const availability = checkTransitionAvailability(state, transition, builtinEvaluators)

    expect(availability.allowed).toBe(false)
    expect(availability.visible).toBe(false)
    expect(availability.reason).toBe("Transition is not visible")
    expect(availability.failedConditions).toEqual([
      {
        scope: "visibility",
        group: "all",
        condition: { type: "entityUnlocked", entityId: "secret-door" },
      },
    ])
  })

  it("returns failed conditions on blocked transition results", () => {
    const state = addResource(createInitialState("scene-1"), "gold", 3)

    const transition: Transition = {
      id: "enter-cave",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [
          { type: "hasEntity", entityId: "lantern" },
          { type: "resourceAtLeast", key: "gold", value: 5 },
        ],
      },
    }

    const result = applyTransition(state, transition, builtinEvaluators, builtinHandlers)

    expect(result.success).toBe(false)
    expect(result.failedConditions).toEqual([
      {
        scope: "requirements",
        group: "all",
        condition: { type: "hasEntity", entityId: "lantern" },
      },
      {
        scope: "requirements",
        group: "all",
        condition: { type: "resourceAtLeast", key: "gold", value: 5 },
      },
    ])
  })

  it("applies failed transition", () => {
    const state = createInitialState("scene-1", { gold: 10 })

    const transition: Transition = {
      id: "buy-sword",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [{ type: "greaterThan", key: "gold", value: 50 }],
      },
      effects: [{ type: "setFlag", key: "has-sword", value: true }],
      failureEffects: [{ type: "setFlag", key: "broke", value: true }],
    }

    const result = applyTransition(state, transition, builtinEvaluators, builtinHandlers)

    expect(result.success).toBe(false)
    expect(result.failureReason).toBe("Requirements not met")
    expect(result.state.flags["has-sword"]).toBeUndefined()
    expect(result.state.flags.broke).toBe(true)
  })

  it("gets available transitions", () => {
    const state = createInitialState("scene-1", { gold: 100 })

    const transitions: Transition[] = [
      {
        id: "buy-sword",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-2",
        requirements: { all: [{ type: "greaterThan", key: "gold", value: 50 }] },
      },
      {
        id: "buy-potion",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-3",
        requirements: { all: [{ type: "greaterThan", key: "gold", value: 200 }] },
      },
      {
        id: "go-east",
        sourceNodeId: "scene-2",
        targetNodeId: "scene-4",
      },
    ]

    const available = getAvailableTransitions(state, transitions, builtinEvaluators)

    expect(available).toHaveLength(1)
    expect(available[0].id).toBe("buy-sword")
  })

  it("groups transitions by availability", () => {
    const state = createInitialState("scene-1", { gold: 100 })

    const transitions: Transition[] = [
      {
        id: "buy-sword",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-2",
        requirements: { all: [{ type: "greaterThan", key: "gold", value: 50 }] },
      },
      {
        id: "buy-potion",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-3",
        requirements: { all: [{ type: "greaterThan", key: "gold", value: 200 }] },
      },
      {
        id: "secret-path",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-4",
        visibility: { all: [{ type: "hasFlag", key: "knows-secret" }] },
      },
    ]

    const grouped = getTransitionsByAvailability(state, transitions, builtinEvaluators)

    expect(grouped.available).toHaveLength(1)
    expect(grouped.available[0].id).toBe("buy-sword")

    expect(grouped.blocked).toHaveLength(1)
    expect(grouped.blocked[0].id).toBe("buy-potion")

    expect(grouped.hidden).toHaveLength(1)
    expect(grouped.hidden[0].id).toBe("secret-path")
  })
})

describe("graph validation", () => {
  it("validates empty graph", () => {
    const nodes = new Map()
    const transitions: Transition[] = []

    const result = validateGraph(nodes, transitions, "start")

    expect(result.valid).toBe(false)
    expect(result.errors[0].type).toBe("empty-graph")
  })

  it("validates missing start node", () => {
    const nodes = new Map([["scene-1", { id: "scene-1" }]])
    const transitions: Transition[] = []

    const result = validateGraph(nodes, transitions, "nonexistent")

    expect(result.valid).toBe(false)
    expect(result.errors[0].type).toBe("missing-start-node")
  })

  it("validates dangling transitions", () => {
    const nodes = new Map([["scene-1", { id: "scene-1" }]])
    const transitions: Transition[] = [
      { id: "t1", sourceNodeId: "scene-1", targetNodeId: "nonexistent" },
    ]

    const result = validateGraph(nodes, transitions, "scene-1")

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.type === "dangling-transition")).toBe(true)
  })

  it("validates unreachable nodes", () => {
    const nodes = new Map([
      ["scene-1", { id: "scene-1" }],
      ["scene-2", { id: "scene-2" }],
      ["orphan", { id: "orphan" }],
    ])
    const transitions: Transition[] = [
      { id: "t1", sourceNodeId: "scene-1", targetNodeId: "scene-2" },
    ]

    const result = validateGraph(nodes, transitions, "scene-1")

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.type === "unreachable-node")).toBe(true)
  })

  it("finds reachable nodes", () => {
    const nodes = new Map([
      ["scene-1", { id: "scene-1" }],
      ["scene-2", { id: "scene-2" }],
      ["scene-3", { id: "scene-3" }],
    ])
    const transitions: Transition[] = [
      { id: "t1", sourceNodeId: "scene-1", targetNodeId: "scene-2" },
      { id: "t2", sourceNodeId: "scene-2", targetNodeId: "scene-3" },
    ]

    const reachable = findReachableNodes(nodes, transitions, "scene-1")

    expect(reachable).toContain("scene-1")
    expect(reachable).toContain("scene-2")
    expect(reachable).toContain("scene-3")
  })

  it("detects dangling transitions", () => {
    const transitions: Transition[] = [
      { id: "t1", sourceNodeId: "scene-1", targetNodeId: "nonexistent" },
    ]
    const nodeIds = new Set(["scene-1"])

    expect(hasDanglingTransitions(transitions, nodeIds)).toBe(true)
  })

  it("detects unreachable nodes", () => {
    const nodes = new Map([
      ["scene-1", { id: "scene-1" }],
      ["orphan", { id: "orphan" }],
    ])
    const transitions: Transition[] = []

    expect(hasUnreachableNodes(nodes, transitions, "scene-1")).toBe(true)
  })
})
