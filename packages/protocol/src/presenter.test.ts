import { createInitialState, GraphRuntime } from "@fiction-map/runtime"
import { describe, expect, it } from "vitest"
import { computeFrame } from "./presenter"

describe("Presenter", () => {
  const testStory = new GraphRuntime({
    startNode: "entrance",
    nodes: [
      {
        id: "entrance",
        type: "scene",
        blocks: [
          { id: "b1", type: "paragraph", text: "You stand at the entrance." },
          { id: "b2", type: "paragraph", text: "It is dark." },
        ],
      },
    ],
    edges: [
      {
        id: "proceed",
        source: "entrance",
        target: "entrance",
        label: "Proceed",
      },
    ],
  })

  const dummyWorld = {
    entities: [{ id: "lantern", label: "Brass Lantern" }],
  }

  it("projects the raw engine state into a Frame correctly", () => {
    const state = createInitialState("entrance")
    const context = { derivedState: { ownedEntityIds: new Set(["lantern"]) } }

    const frame = computeFrame(testStory, state, context, dummyWorld)

    expect(frame.currentNode.id).toBe("entrance")
    expect(frame.currentNode.type).toBe("scene")
    // Pacing defaults to 0, so only the first block is active
    expect(frame.currentNode.blocks).toHaveLength(1)
    expect(frame.currentNode.blocks?.[0]).toEqual({
      id: "b1",
      type: "paragraph",
      text: "You stand at the entrance.",
    })

    expect(frame.choices).toHaveLength(1)
    expect(frame.choices[0]).toEqual({
      id: "proceed",
      label: "Proceed",
    })

    expect(frame.inventory).toHaveLength(1)
    expect(frame.inventory[0]).toEqual({
      id: "lantern",
      label: "Brass Lantern",
    })

    expect(frame.pacing).toEqual({
      pacingIndex: 0,
      isComplete: false,
    })

    expect(frame.warnings).toHaveLength(0)
    expect(frame.serializedState).toBeDefined()
  })

  it("handles pacing index and complete status correctly", () => {
    let state = createInitialState("entrance")
    state = {
      ...state,
      extensions: { pacingIndex: 1 },
    }
    const context = { derivedState: { ownedEntityIds: new Set() } }

    const frame = computeFrame(testStory, state, context, dummyWorld)

    expect(frame.currentNode.blocks).toHaveLength(2)
    expect(frame.pacing).toEqual({
      pacingIndex: 1,
      isComplete: true,
    })
  })

  it("appends warnings when turns > 10", () => {
    let state = createInitialState("entrance")
    state = {
      ...state,
      entityState: {
        owned: new Set(),
        active: new Set(),
        unlocked: new Set(),
        resources: { turns: 11 },
      },
    }
    const context = { derivedState: { ownedEntityIds: new Set() } }

    const frame = computeFrame(testStory, state, context, dummyWorld)

    expect(frame.warnings).toContain("THE CAVERN IS COLLAPSING! (-25 HP per turn!)")
  })
})
