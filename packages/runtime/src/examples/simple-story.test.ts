import { defineEdgeType, defineGraph, defineNodeType, ProjectRegistry } from "@fiction-map/core"
import { describe, expect, it } from "vitest"
import { createRuntimeFromGraph } from "../graph-definition"

/**
 * A basic interactive fiction (Choose Your Own Adventure) example.
 * Demonstrates node data (text), basic edge conditions (hasVisited, hasFlag),
 * and effects (setFlag). No complex entities needed.
 */
describe("Example: Simple Story", () => {
  it("executes a complete branching narrative", () => {
    const registry = new ProjectRegistry()

    // 1. Define Schemas
    defineNodeType(registry, {
      id: "scene",
      properties: {
        text: { type: "string", required: true },
      },
    })

    defineEdgeType(registry, {
      id: "choice",
      properties: {
        label: { type: "string", required: true },
      },
      sourceTypes: ["scene"],
      targetTypes: ["scene"],
    })

    // 2. Define the Story Graph
    const story = defineGraph(registry, {
      id: "haunted-house",
      startNode: "entrance",
      nodes: [
        {
          id: "entrance",
          type: "scene",
          properties: { text: "You stand before a creepy house. The door is slightly ajar." },
        },
        {
          id: "hallway",
          type: "scene",
          properties: { text: "A dark hallway. You hear scratching sounds." },
        },
        {
          id: "kitchen",
          type: "scene",
          properties: { text: "A smelly kitchen. You find a rusty key." },
        },
        {
          id: "basement",
          type: "scene",
          properties: { text: "The basement is locked." },
        },
        {
          id: "treasure-room",
          type: "scene",
          properties: { text: "You unlocked the basement and found the treasure!" },
        },
      ],
      edges: [
        {
          id: "enter-house",
          type: "choice",
          source: "entrance",
          target: "hallway",
          properties: { label: "Go inside" },
        },
        {
          id: "go-kitchen",
          type: "choice",
          source: "hallway",
          target: "kitchen",
          properties: { label: "Explore the kitchen" },
          // Only show if we haven't visited the kitchen yet
          visibility: [{ type: "notVisited", nodeId: "kitchen" }],
          effects: [{ type: "setVariable", key: "has-key", value: true }],
        },
        {
          id: "try-basement-locked",
          type: "choice",
          source: "hallway",
          target: "basement",
          properties: { label: "Go down to the basement" },
          conditions: [{ type: "notEquals", key: "has-key", value: true }],
        },
        {
          id: "try-basement-unlocked",
          type: "choice",
          source: "hallway",
          target: "treasure-room",
          properties: { label: "Unlock the basement" },
          conditions: [{ type: "equals", key: "has-key", value: true }],
        },
        {
          id: "kitchen-to-hallway",
          type: "choice",
          source: "kitchen",
          target: "hallway",
          properties: { label: "Go back to hallway" },
        },
      ],
    })

    // 3. Playthrough Execution
    const runtime = createRuntimeFromGraph(story)
    let state = runtime.createState({ "has-key": false })

    expect(state.currentNodeId).toBe("entrance")

    // Step 1: Enter house
    let available = runtime.getAvailable(state)
    expect(available.length).toBe(1)
    expect(available[0].id).toBe("enter-house")

    let result = runtime.step(state, available[0])
    state = result.state
    expect(state.currentNodeId).toBe("hallway")

    // Step 2: In hallway, we can try basement (locked) or go to kitchen
    available = runtime.getAvailable(state)
    expect(available).toHaveLength(2)
    const labels = available.map((a) => story.edges.find((e) => e.id === a.id)?.properties.label)
    expect(labels).toContain("Go down to the basement")
    expect(labels).toContain("Explore the kitchen")

    // Let's go to the kitchen to get the key
    const toKitchen = available.find((a) => a.id === "go-kitchen")!
    result = runtime.step(state, toKitchen)
    state = result.state
    expect(state.currentNodeId).toBe("kitchen")
    expect(state.variables["has-key"]).toBe(true)

    // Step 3: Go back to hallway
    available = runtime.getAvailable(state)
    result = runtime.step(state, available[0])
    state = result.state
    expect(state.currentNodeId).toBe("hallway")

    // Step 4: Back in hallway, 'Explore the kitchen' should be hidden (visibility: notVisited kitchen)
    // and 'Unlock the basement' should be available instead of the locked option
    available = runtime.getAvailable(state)
    expect(available).toHaveLength(1)
    expect(available[0].id).toBe("try-basement-unlocked")

    // Step 5: Win the game
    result = runtime.step(state, available[0])
    state = result.state
    expect(state.currentNodeId).toBe("treasure-room")
  })
})
