import { describe, it, expect } from "vitest"
import { GraphRuntime } from "../runtime"
import { createInitialState, addResource, getResource } from "../core/state"
import { GraphBlueprint } from "../adapter"

describe("State Triggers & Reaction Engine", () => {
  const blueprint: GraphBlueprint = {
    startNode: "entrance",
    nodes: [
      { id: "entrance", type: "scene" },
      { id: "main-hall", type: "scene" },
      { id: "death", type: "scene" },
    ],
    edges: [
      {
        id: "enter-hall",
        type: "choice",
        source: "entrance",
        target: "main-hall",
        effects: [{ type: "spendResource", key: "health", amount: 40, clampToZero: true }],
      },
    ],
  }

  it("registers and automatically executes a state trigger on step", () => {
    const runtime = new GraphRuntime(blueprint)

    // Register a trigger to auto-navigate to 'death' if health drops below 50
    runtime.addTrigger({
      id: "low-health-death",
      conditions: [{ type: "resourceLessThan", key: "health", value: 50 }],
      effects: [{ type: "navigate", nodeId: "death" }],
    })

    let state = createInitialState("entrance")
    // Start with 80 health
    state = addResource(state, "health", 80)
    expect(getResource(state, "health")).toBe(80)

    // Take enter-hall transition which reduces HP by 40 (leaves 40 HP).
    // Because health is now 40 (<= 50), the trigger should fire and navigate us to 'death'!
    const enterTransition = runtime.transitions.find((t) => t.id === "enter-hall")!
    const result = runtime.step(state, enterTransition)

    expect(result.success).toBe(true)
    expect(result.state.currentNodeId).toBe("death")
    expect(result.nextNodeId).toBe("death")
    expect(getResource(result.state, "health")).toBe(40)
  })
})
