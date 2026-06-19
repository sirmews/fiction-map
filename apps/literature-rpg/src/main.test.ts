import { createInitialState, deriveEntityState } from "@fiction-map/runtime"
import { describe, expect, it } from "vitest"
import { runtime } from "./main"
import { world } from "./world"

describe("literature-rpg consumer app", () => {
  it("world has no definition errors", () => {
    expect(world.errors).toEqual([])
  })

  it("walks from the entrance to victory learning spells along the way", () => {
    const visited: string[] = [runtime.startNodeId]

    const steps = runtime.walkWithContext(
      createInitialState(runtime.startNodeId),
      (currentState) => ({ derivedState: deriveEntityState(world, currentState) }),
    )

    for (const step of steps) {
      if (step.applied) {
        visited.push(step.state.currentNodeId)
      }
    }

    expect(visited).toEqual([
      "entrance",
      "main-hall",
      "archives",
      "archives", // Studies Tome of Heal
      "archives", // Studies Tome of Mage Light
      "archives", // Buys lockpick
      "main-hall",
      "dark-chapter",
      "chamber-of-runes",
      "forgotten-crypt",
      "victory",
    ])
  })
})
