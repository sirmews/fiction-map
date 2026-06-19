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

  it("walks the alternative Alchemist's Lab and Sunken Passage pathway to victory", () => {
    let state = createInitialState(runtime.startNodeId)
    const makeContext = (s: any) => ({ derivedState: deriveEntityState(world, s) })

    const step = (s: any, transitionId: string) => {
      const ctx = makeContext(s)
      const available = runtime.getAvailable(s, ctx)
      const transition = available.find((t) => t.id === transitionId)
      if (!transition) {
        throw new Error(`Transition ${transitionId} not available from ${s.currentNodeId}`)
      }
      const result = runtime.step(s, transition, ctx)
      if (!result.success) {
        throw new Error(`Transition ${transitionId} failed: ${result.failureReason}`)
      }
      return result.state
    }

    // 1. Entrance -> Main Hall (grants lantern, 100 HP, 50 MP, 30 gold)
    state = step(state, "enter-hall")
    expect(state.currentNodeId).toBe("main-hall")

    // 2. Main Hall -> Archives
    state = step(state, "explore-archives")
    expect(state.currentNodeId).toBe("archives")

    // 3. Archives -> Archives (Buy lockpick, spends 15 gold, leaves 15 gold)
    state = step(state, "buy-lockpick")
    expect(state.currentNodeId).toBe("archives")

    // 4. Archives -> Alchemist's Lab
    state = step(state, "enter-lab")
    expect(state.currentNodeId).toBe("alchemists-lab")

    // 5. Alchemist's Lab -> Alchemist's Lab (Brew elixir, spends 10 gold, leaves 5 gold)
    state = step(state, "brew-elixir")
    expect(state.currentNodeId).toBe("alchemists-lab")

    // 6. Alchemist's Lab -> Sunken Passage
    state = step(state, "descend-trapdoor")
    expect(state.currentNodeId).toBe("sunken-passage")

    // 7. Sunken Passage -> Forgotten Crypt (Swim, spends 30 HP, leaves 70 HP)
    state = step(state, "swim-passage")
    expect(state.currentNodeId).toBe("forgotten-crypt")

    // 8. Forgotten Crypt -> Victory (Lockpick casket, requires lockpick)
    state = step(state, "lockpick-casket")
    expect(state.currentNodeId).toBe("victory")
  })
})
