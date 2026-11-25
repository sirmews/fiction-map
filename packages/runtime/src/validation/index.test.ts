import { defineEdgeType, defineGraph, defineNodeType, ProjectRegistry } from "@fiction-map/core"
import { defineEntityType, defineWorld, EntityRegistry } from "@fiction-map/entities"
import { describe, expect, it } from "vitest"
import { createRuntimeFromGraph, registerBuiltins } from "../index"
import { validateGraphSemantics } from "./index"

describe("Semantic Graph Validator", () => {
  const registry = new ProjectRegistry()
  registerBuiltins(registry)

  const _SceneNode = defineNodeType(registry, {
    id: "scene",
    properties: {
      title: { type: "string", required: true },
    },
  })

  const _ChoiceEdge = defineEdgeType(registry, {
    id: "choice",
    sourceTypes: ["scene"],
    targetTypes: ["scene"],
  })

  const worldRegistry = new EntityRegistry()
  defineEntityType(worldRegistry, {
    id: "item",
    properties: {
      label: { type: "string", required: true },
    },
  })
  const world = defineWorld(worldRegistry, {
    id: "test-world",
    entities: [{ id: "key", type: "item", label: "Rusty Key" }],
  })

  it("passes for a simple winnable graph", () => {
    const graph = defineGraph(registry, {
      id: "simple-win",
      nodes: [
        { id: "start", type: "scene", title: "Start" },
        { id: "end", type: "scene", title: "End" },
      ],
      edges: [{ id: "go", type: "choice", source: "start", target: "end" }],
    })

    const runtime = createRuntimeFromGraph(graph)
    const result = validateGraphSemantics(runtime, world)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.winnablePathsCount).toBe(1)
  })

  it("detects a dead-end node when transitions exist but are blocked", () => {
    const graph = defineGraph(registry, {
      id: "dead-end",
      nodes: [
        { id: "start", type: "scene", title: "Start" },
        { id: "locked-room", type: "scene", title: "Locked Room" },
      ],
      edges: [
        {
          id: "unlock",
          type: "choice",
          source: "start",
          target: "locked-room",
          conditions: [{ type: "hasEntity", entityId: "key" }],
        },
      ],
    })

    const runtime = createRuntimeFromGraph(graph)
    const result = validateGraphSemantics(runtime, world)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].type).toBe("dead-end-node")
    expect(result.errors[0].nodeId).toBe("start")
  })

  it("detects an unwinnable path where the player is guaranteed to die", () => {
    const graph = defineGraph(registry, {
      id: "unwinnable",
      nodes: [
        { id: "start", type: "scene", title: "Start" },
        { id: "end", type: "scene", title: "End" },
      ],
      edges: [
        {
          id: "go-dangerous",
          type: "choice",
          source: "start",
          target: "end",
          effects: [
            { type: "addResource", key: "health", amount: 100 }, // Initialize health
            { type: "spendResource", key: "health", amount: 100, clampToZero: true }, // Instantly die
          ],
        },
      ],
    })

    const runtime = createRuntimeFromGraph(graph)
    const result = validateGraphSemantics(runtime, world)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].type).toBe("unwinnable-path")
    expect(result.errors[0].nodeId).toBe("end")
  })

  it("detects an infinite resource-draining loop", () => {
    const graph = defineGraph(registry, {
      id: "drain-loop",
      nodes: [
        { id: "start", type: "scene", title: "Start" },
        { id: "room-2", type: "scene", title: "Room 2" },
      ],
      edges: [
        {
          id: "enter-hall",
          type: "choice",
          source: "start",
          target: "room-2",
          effects: [{ type: "addResource", key: "health", amount: 100 }], // Initialize health
        },
        {
          id: "go-loop",
          type: "choice",
          source: "room-2",
          target: "start",
          effects: [{ type: "spendResource", key: "health", amount: 10, clampToZero: true }], // Drain health
        },
      ],
    })

    const runtime = createRuntimeFromGraph(graph)
    const result = validateGraphSemantics(runtime, world)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].type).toBe("infinite-drain-loop")
    expect(result.errors[0].nodeId).toBe("start")
  })

  it("keeps distinct resource states at a join during semantic validation", () => {
    const graph = defineGraph(registry, {
      id: "resource-join",
      nodes: [
        { id: "start", type: "scene", title: "Start" },
        { id: "high", type: "scene", title: "High" },
        { id: "low", type: "scene", title: "Low" },
        { id: "join", type: "scene", title: "Join" },
        { id: "end", type: "scene", title: "End" },
      ],
      edges: [
        {
          id: "choose-high",
          type: "choice",
          source: "start",
          target: "high",
          effects: [{ type: "addResource", key: "health", amount: 100 }],
        },
        {
          id: "choose-low",
          type: "choice",
          source: "start",
          target: "low",
          effects: [{ type: "addResource", key: "health", amount: 10 }],
        },
        { id: "high-join", type: "choice", source: "high", target: "join" },
        { id: "low-join", type: "choice", source: "low", target: "join" },
        {
          id: "spend",
          type: "choice",
          source: "join",
          target: "end",
          effects: [{ type: "spendResource", key: "health", amount: 20, clampToZero: true }],
        },
      ],
    })

    const result = validateGraphSemantics(createRuntimeFromGraph(graph), world)
    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.type === "unwinnable-path")).toBe(true)
  })
})
