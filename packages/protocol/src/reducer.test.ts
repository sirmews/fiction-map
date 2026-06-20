import { createInitialState, GraphRuntime } from "@fiction-map/runtime"
import { describe, expect, it } from "vitest"
import { applyIntent } from "./reducer"

describe("Session Reducer", () => {
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
      {
        id: "hall",
        type: "scene",
        blocks: [{ id: "b3", type: "paragraph", text: "You are in the main hall." }],
      },
    ],
    edges: [
      {
        id: "proceed",
        source: "entrance",
        target: "hall",
        label: "Proceed",
      },
    ],
  })

  it("handles selectChoice intent correctly", () => {
    let state = createInitialState("entrance")
    state = {
      ...state,
      extensions: { pacingIndex: 1 },
    }

    const result = applyIntent(testStory, state, {
      type: "selectChoice",
      choiceId: "proceed",
    })

    expect(result.error).toBeUndefined()
    expect(result.state.currentNodeId).toBe("hall")
    // Pacing index must reset to 0 on successful transition
    expect(result.state.extensions?.pacingIndex).toBe(0)
    expect(result.frame.currentNode.id).toBe("hall")
    expect(result.frame.pacing.pacingIndex).toBe(0)
  })

  it("returns error for invalid choiceId", () => {
    const state = createInitialState("entrance")

    const result = applyIntent(testStory, state, {
      type: "selectChoice",
      choiceId: "nonexistent",
    })

    expect(result.error).toContain("Choice 'nonexistent' is not available")
    expect(result.state).toEqual(state)
  })

  it("handles skipPacing intent correctly", () => {
    const state = createInitialState("entrance")

    const result = applyIntent(testStory, state, {
      type: "skipPacing",
    })

    expect(result.error).toBeUndefined()
    expect(result.state.extensions?.pacingIndex).toBe(1)
    expect(result.frame.pacing.pacingIndex).toBe(1)
    expect(result.frame.pacing.isComplete).toBe(true)
  })

  it("handles save intent correctly", () => {
    const state = createInitialState("entrance")

    const result = applyIntent(testStory, state, {
      type: "save",
      saveSlot: "slot1",
    })

    expect(result.error).toBeUndefined()
    expect(result.state).toEqual(state)
  })

  it("handles load intent correctly", () => {
    const state = createInitialState("entrance")
    const serializedState = resultFrameSerializedState(state)

    const result = applyIntent(testStory, state, {
      type: "load",
      serializedState,
    })

    expect(result.error).toBeUndefined()
    expect(result.state.currentNodeId).toBe("entrance")
  })

  it("handles quit intent correctly", () => {
    const state = createInitialState("entrance")

    const result = applyIntent(testStory, state, {
      type: "quit",
    })

    expect(result.error).toBeUndefined()
    expect(result.exit).toBe(true)
  })

  function resultFrameSerializedState(state: any): string {
    const frame = applyIntent(testStory, state, { type: "save" }).frame
    return frame.serializedState
  }
})
