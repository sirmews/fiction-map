import type { GraphDefinition } from "@fiction-map/core"
import { describe, expect, it } from "vitest"
import { registry } from "../../../../apps/literature-rpg/src/project"
import { world } from "../../../../apps/literature-rpg/src/world"
import {
  addResource,
  createInitialState,
  createRuntimeFromGraph,
  deriveEntityState,
  registerBuiltins,
} from ".."

registerBuiltins(registry)

const testStory: GraphDefinition = {
  id: "formula-story",
  startNodeId: "entrance",
  nodes: [
    {
      id: "entrance",
      type: "scene",
      blocks: [{ id: "welcome", type: "paragraph", text: "You stand at the gate." }],
    },
    {
      id: "victory",
      type: "scene",
      blocks: [{ id: "won", type: "paragraph", text: "Victory." }],
    },
  ],
  edges: [
    {
      id: "gain-xp",
      source: "entrance",
      target: "entrance",
      label: "Gain XP",
      effects: [{ type: "addResource", key: "xp", amount: 100 }],
    },
    {
      id: "cast-heal",
      source: "entrance",
      target: "entrance",
      label: "Cast Heal",
      effects: [{ type: "addResource", key: "health", formula: "20 + intelligence * 2" }],
    },
  ],
}

describe("Dynamic Scaling and Progression Integration", () => {
  it("scales healing effects using intelligence attribute dynamically", () => {
    const runtime = createRuntimeFromGraph(testStory)
    let state = createInitialState(runtime.startNodeId)

    // Set core stats using addResource
    state = addResource(state, "health", 10)
    state = addResource(state, "intelligence", 15)

    const context = { derivedState: deriveEntityState(world, state) }

    const castHealEdge = testStory.edges.find((e) => e.id === "cast-heal")!
    const result = runtime.step(state, castHealEdge, context)

    expect(result.success).toBe(true)
    // Formula: 20 + 15 * 2 = 50. Health goes from 10 -> 60.
    expect(result.state.entityState?.resources.health).toBe(60)
  })

  it("handles a multi-stage custom progression loop (Level-Up) via triggers", () => {
    const runtime = createRuntimeFromGraph(testStory)

    // Register automatic progression trigger based on level formula
    runtime.addTrigger({
      id: "progression-level-up",
      conditions: [{ type: "resourceAtLeast", key: "xp", value: 100 }],
      effects: [
        { type: "spendResource", key: "xp", amount: 100, clampToZero: true },
        { type: "addResource", key: "level", amount: 1 },
        { type: "addResource", key: "intelligence", formula: "level * 5" }, // Scale INT with level
      ],
    })

    let state = createInitialState(runtime.startNodeId)

    state = addResource(state, "xp", 0)
    state = addResource(state, "level", 1)
    state = addResource(state, "intelligence", 10)

    const context = { derivedState: deriveEntityState(world, state) }

    const gainXpEdge = testStory.edges.find((e) => e.id === "gain-xp")!

    // Step 1: Gain 100 XP -> Triggers level-up trigger after step!
    const stepResult = runtime.step(state, gainXpEdge, context)
    expect(stepResult.success).toBe(true)

    const finalState = stepResult.state
    // XP is consumed (100 - 100 = 0)
    expect(finalState.entityState?.resources.xp).toBe(0)
    // Level increments to 2
    expect(finalState.entityState?.resources.level).toBe(2)
    // Intelligence increases dynamically using formula: level * 5 = 2 * 5 = 10 -> 10 + 10 = 20 INT!
    expect(finalState.entityState?.resources.intelligence).toBe(20)
  })
})
