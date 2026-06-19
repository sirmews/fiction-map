import { createInitialState, deriveEntityState } from "@fiction-map/runtime"
import { describe, expect, it } from "vitest"
import { runtime } from "./main"
import { world } from "./world"

describe("literature-rpg consumer app", () => {
  it("world has no definition errors", () => {
    expect(world.errors).toEqual([])
  })

  it("walks the classic East/West wing puzzle pathway to victory", () => {
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
      console.log(
        `[Step ${transitionId}] Node: ${result.state.currentNodeId}, HP: ${result.state.entityState?.resources?.health}, Turns: ${result.state.entityState?.resources?.turns}`,
      )
      return result.state
    }

    // 1. Courtyard -> Entrance
    state = step(state, "enter-entrance")
    expect(state.currentNodeId).toBe("entrance")

    // 2. Entrance -> Main Hall (grants lantern, 100 HP, 50 MP, 30 gold)
    state = step(state, "enter-hall")
    expect(state.currentNodeId).toBe("main-hall")

    // 3. Main Hall -> Grand Staircase
    state = step(state, "climb-staircase")
    expect(state.currentNodeId).toBe("grand-staircase")

    // 4. Grand Staircase -> Observatory
    state = step(state, "go-west")
    expect(state.currentNodeId).toBe("observatory")

    // 5. Observatory -> Observatory (Align telescope, sets switch flag, grants spirit-elixir)
    state = step(state, "align-telescope")
    expect(state.currentNodeId).toBe("observatory")

    // 6. Observatory -> Grand Staircase
    state = step(state, "return-to-stairs-from-observatory")
    expect(state.currentNodeId).toBe("grand-staircase")

    // 7. Grand Staircase -> Gallery of Kings
    state = step(state, "go-east")
    expect(state.currentNodeId).toBe("gallery-of-kings")

    // 8. Gallery of Kings -> Armory
    state = step(state, "go-to-armory")
    expect(state.currentNodeId).toBe("armory")

    // 9. Armory -> Armory (Take Silver Shield)
    state = step(state, "take-shield")
    expect(state.currentNodeId).toBe("armory")

    // 9.5. Armory -> Armory (Take rusty iron key)
    state = step(state, "take-iron-key")
    expect(state.currentNodeId).toBe("armory")

    // 10. Armory -> Gallery of Kings
    state = step(state, "return-to-gallery-from-armory")
    expect(state.currentNodeId).toBe("gallery-of-kings")

    // 11. Gallery of Kings -> Gallery of Kings (Place Silver Shield, deactivates statues)
    state = step(state, "place-shield")
    expect(state.currentNodeId).toBe("gallery-of-kings")

    // 12. Gallery of Kings -> Riddle Chamber (Walk past safely)
    state = step(state, "walk-past-statues-safely")
    expect(state.currentNodeId).toBe("riddle-chamber")

    // 12.5. Riddle Chamber -> Riddle Chamber (Drink Spirit Elixir to survive cavern collapse)
    state = step(state, "drink-spirit-elixir")
    expect(state.currentNodeId).toBe("riddle-chamber")

    // 13. Riddle Chamber -> Forgotten Crypt (Answer riddle, gets 30 gold, gets spirit-elixir)
    state = step(state, "answer-riddle")
    expect(state.currentNodeId).toBe("forgotten-crypt")

    // 13.5. Forgotten Crypt -> Forgotten Crypt (Drink second Spirit Elixir to survive final unlock)
    state = step(state, "drink-spirit-elixir-crypt")
    expect(state.currentNodeId).toBe("forgotten-crypt")

    // 14. Forgotten Crypt -> Victory (Unlock casket using the iron key)
    state = step(state, "unlock-casket")
    expect(state.currentNodeId).toBe("victory")
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

    // 1. Courtyard -> Entrance
    state = step(state, "enter-entrance")
    expect(state.currentNodeId).toBe("entrance")

    // 2. Entrance -> Main Hall (grants lantern, 100 HP, 50 MP, 30 gold)
    state = step(state, "enter-hall")
    expect(state.currentNodeId).toBe("main-hall")

    // 3. Main Hall -> Archives
    state = step(state, "explore-archives")
    expect(state.currentNodeId).toBe("archives")

    // 4. Archives -> Archives (Buy lockpick, spends 15 gold, leaves 15 gold)
    state = step(state, "buy-lockpick")
    expect(state.currentNodeId).toBe("archives")

    // 5. Archives -> Alchemist's Lab
    state = step(state, "enter-lab")
    expect(state.currentNodeId).toBe("alchemists-lab")

    // 6. Alchemist's Lab -> Alchemist's Lab (Brew elixir, spends 10 gold, leaves 5 gold)
    state = step(state, "brew-elixir")
    expect(state.currentNodeId).toBe("alchemists-lab")

    // 7. Alchemist's Lab -> Sunken Passage
    state = step(state, "descend-trapdoor")
    expect(state.currentNodeId).toBe("sunken-passage")

    // 8. Sunken Passage -> Forgotten Crypt (Swim, spends 30 HP, leaves 70 HP)
    state = step(state, "swim-passage")
    expect(state.currentNodeId).toBe("forgotten-crypt")

    // 9. Forgotten Crypt -> Victory (Lockpick casket, requires lockpick)
    state = step(state, "lockpick-casket")
    expect(state.currentNodeId).toBe("victory")
  })

  it("walks the magic-user pathway to victory using spells and mana", () => {
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

    // 1. Courtyard -> Entrance
    state = step(state, "enter-entrance")
    expect(state.currentNodeId).toBe("entrance")

    // 2. Entrance -> Main Hall (grants lantern, 100 HP, 50 MP, 30 gold)
    state = step(state, "enter-hall")
    expect(state.currentNodeId).toBe("main-hall")
    expect(state.entityState?.resources?.mana).toBe(50)

    // 3. Main Hall -> Archives
    state = step(state, "explore-archives")
    expect(state.currentNodeId).toBe("archives")

    // 4. Archives -> Archives (Study Heal Spell)
    state = step(state, "study-heal")
    expect(state.currentNodeId).toBe("archives")

    // 5. Archives -> Archives (Study Mage Light Spell)
    state = step(state, "study-mage-light")
    expect(state.currentNodeId).toBe("archives")

    // 6. Archives -> Main Hall
    state = step(state, "return-from-archives")
    expect(state.currentNodeId).toBe("main-hall")

    // 7. Main Hall -> Dark Chapter
    state = step(state, "descend")
    expect(state.currentNodeId).toBe("dark-chapter")

    // 8. Dark Chapter -> Chamber of Runes (Cast Mage Light Spell, spends 15 MP, leaves 35 MP, then regenerates +5 MP to 40 MP)
    state = step(state, "cast-mage-light")
    expect(state.currentNodeId).toBe("chamber-of-runes")
    expect(state.entityState?.resources?.mana).toBe(40)

    // 9. Chamber of Runes -> Forgotten Crypt (Translate runes, grants key)
    state = step(state, "translate-runes")
    expect(state.currentNodeId).toBe("forgotten-crypt")

    // 10. Forgotten Crypt -> Victory (Unlock casket using key)
    state = step(state, "unlock-casket")
    expect(state.currentNodeId).toBe("victory")
  })
})
