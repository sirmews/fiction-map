import { beforeEach, describe, expect, it } from "vitest"
import {
  defineCondition,
  defineEdgeType,
  defineEffect,
  defineGraph,
  defineNodeType,
  defineStruct,
  ProjectRegistry,
} from "../src"

describe("@fiction-map/core", () => {
  let registry: ProjectRegistry

  beforeEach(() => {
    registry = new ProjectRegistry()
  })

  describe("defineStruct", () => {
    it("should define a struct type", () => {
      const coordinate = defineStruct(registry, {
        id: "coordinate",
        properties: {
          x: { type: "number", required: true },
          y: { type: "number", required: true },
        },
      })

      expect(coordinate.id).toBe("coordinate")
      expect(coordinate.name).toBe("coordinateStruct")
      expect(coordinate.properties.x.type).toBe("number")
      expect(registry.structs.get("coordinate")).toBeDefined()
    })

    it("should not allow duplicate struct ids", () => {
      defineStruct(registry, { id: "coordinate" })

      expect(() => {
        defineStruct(registry, { id: "coordinate" })
      }).toThrow("already defined")
    })
  })

  describe("struct validation", () => {
    it("should validate a node property against a struct schema", () => {
      defineStruct(registry, {
        id: "coordinate",
        properties: {
          x: { type: "number", required: true },
          y: { type: "number", required: true },
        },
      })

      defineNodeType(registry, {
        id: "location-node",
        properties: {
          pos: { type: "struct", structId: "coordinate", required: true },
        },
      })

      // Valid pos property
      const validGraph = defineGraph(registry, {
        id: "valid-story",
        nodes: [{ id: "start", type: "location-node", pos: { x: 10, y: 20 } }],
        edges: [],
      })
      expect(validGraph.errors).toHaveLength(0)

      // Invalid pos property (wrong type for x)
      const invalidGraph = defineGraph(registry, {
        id: "invalid-story",
        nodes: [{ id: "start", type: "location-node", pos: { x: "10", y: 20 } }],
        edges: [],
      })
      expect(invalidGraph.errors).toContainEqual(
        expect.objectContaining({ code: "INVALID_PROPERTY_TYPE" }),
      )
    })

    it("should recursively validate an array of structs", () => {
      defineStruct(registry, {
        id: "loot-entry",
        properties: {
          itemId: { type: "string", required: true },
          dropChance: { type: "number", required: true },
        },
      })

      defineNodeType(registry, {
        id: "chest-node",
        properties: {
          loot: {
            type: "array",
            items: { type: "struct", structId: "loot-entry" },
          },
        },
      })

      // Valid array of structs
      const validGraph = defineGraph(registry, {
        id: "valid-chest",
        nodes: [
          {
            id: "start",
            type: "chest-node",
            loot: [
              { itemId: "sword", dropChance: 0.5 },
              { itemId: "shield", dropChance: 0.2 },
            ],
          },
        ],
        edges: [],
      })
      expect(validGraph.errors).toHaveLength(0)

      // Invalid array of structs (wrong type for dropChance)
      const invalidGraph = defineGraph(registry, {
        id: "invalid-chest",
        nodes: [
          {
            id: "start",
            type: "chest-node",
            loot: [{ itemId: "sword", dropChance: "high" }],
          },
        ],
        edges: [],
      })
      expect(invalidGraph.errors).toContainEqual(
        expect.objectContaining({ code: "INVALID_PROPERTY_TYPE" }),
      )
    })
  })

  describe("defineNodeType", () => {
    it("should define a node type", () => {
      const sceneNode = defineNodeType(registry, {
        id: "scene",
        properties: {
          title: { type: "string", required: true },
        },
        outgoingEdges: ["choice"],
        incomingEdges: ["choice"],
      })

      expect(sceneNode.id).toBe("scene")
      expect(sceneNode.name).toBe("sceneNode")
      expect(sceneNode.properties.title.type).toBe("string")
      expect(registry.nodeTypes.get("scene")).toBeDefined()
    })

    it("should not allow duplicate node type ids", () => {
      defineNodeType(registry, { id: "scene" })

      expect(() => {
        defineNodeType(registry, { id: "scene" })
      }).toThrow("already defined")
    })
  })

  describe("defineEdgeType", () => {
    it("should define an edge type", () => {
      const choiceEdge = defineEdgeType(registry, {
        id: "choice",
        properties: {
          text: { type: "string", required: true },
        },
        sourceTypes: ["scene"],
        targetTypes: ["scene"],
      })

      expect(choiceEdge.id).toBe("choice")
      expect(choiceEdge.name).toBe("choiceEdge")
      expect(choiceEdge.sourceTypes).toContain("scene")
      expect(registry.edgeTypes.get("choice")).toBeDefined()
    })
  })

  describe("defineCondition", () => {
    it("should define a condition", () => {
      const hasItem = defineCondition(registry, {
        id: "has-item",
        parameters: {
          itemId: { type: "string", required: true },
        },
      })

      expect(hasItem.id).toBe("has-item")
      expect(hasItem.name).toBe("hasItemCondition")
      expect(registry.conditions.get("has-item")).toBeDefined()
    })
  })

  describe("defineEffect", () => {
    it("should define an effect", () => {
      const giveItem = defineEffect(registry, {
        id: "give-item",
        parameters: {
          itemId: { type: "string", required: true },
        },
      })

      expect(giveItem.id).toBe("give-item")
      expect(giveItem.name).toBe("giveItemEffect")
      expect(registry.effects.get("give-item")).toBeDefined()
    })
  })

  describe("defineGraph", () => {
    it("should define a valid graph", () => {
      defineNodeType(registry, {
        id: "scene",
        outgoingEdges: ["choice"],
        incomingEdges: ["choice"],
      })
      defineEdgeType(registry, { id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })

      const graph = defineGraph(registry, {
        id: "test-story",
        nodes: [
          { id: "start", type: "scene", title: "Beginning" },
          { id: "end", type: "scene", title: "Ending" },
        ],
        edges: [{ id: "c1", type: "choice", source: "start", target: "end", text: "Continue" }],
      })

      expect(graph.id).toBe("test-story")
      expect(graph.nodeCount).toBe(2)
      expect(graph.edgeCount).toBe(1)
      expect(graph.errors).toHaveLength(0)
    })

    it("should detect unknown node types", () => {
      const graph = defineGraph(registry, {
        id: "test-story",
        nodes: [{ id: "start", type: "unknown-type" }],
        edges: [],
      })

      expect(graph.errors).toContainEqual(expect.objectContaining({ code: "UNKNOWN_NODE_TYPE" }))
      expect(graph.errors[0].message).toContain('Unknown node type "unknown-type" on node "start".')
      expect(graph.errors[0].message).toContain("No node types are currently registered.")
    })

    it("should detect invalid edge type connections", () => {
      defineNodeType(registry, {
        id: "scene",
        outgoingEdges: ["choice"],
        incomingEdges: ["choice"],
      })
      defineNodeType(registry, { id: "task", outgoingEdges: ["flow"], incomingEdges: ["flow"] })
      defineEdgeType(registry, { id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })

      const graph = defineGraph(registry, {
        id: "test-story",
        nodes: [
          { id: "start", type: "scene" },
          { id: "end", type: "task" },
        ],
        edges: [{ id: "c1", type: "choice", source: "start", target: "end" }],
      })

      expect(graph.errors).toContainEqual(expect.objectContaining({ code: "INVALID_TARGET_TYPE" }))
      const targetTypeError = graph.errors.find((error) => error.code === "INVALID_TARGET_TYPE")
      expect(targetTypeError?.message).toContain('Allowed target types: "scene".')
    })

    it("should find endings", () => {
      defineNodeType(registry, { id: "scene" })
      defineEdgeType(registry, { id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })

      const graph = defineGraph(registry, {
        id: "test-story",
        nodes: [
          { id: "start", type: "scene" },
          { id: "end", type: "scene" },
        ],
        edges: [{ id: "c1", type: "choice", source: "start", target: "end" }],
      })

      expect(graph.endings).toContain("end")
    })

    it("should warn about unprotected resource spending", () => {
      defineNodeType(registry, { id: "scene" })
      defineEdgeType(registry, { id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })
      defineEffect(registry, {
        id: "spendResource",
        parameters: {
          key: { type: "string", required: true },
          amount: { type: "number", required: true },
        },
      })

      const graph = defineGraph(registry, {
        id: "test-story",
        nodes: [
          { id: "start", type: "scene" },
          { id: "end", type: "scene" },
        ],
        edges: [
          {
            id: "c1",
            type: "choice",
            source: "start",
            target: "end",
            effects: [{ type: "spendResource", key: "health", amount: 10 }],
          },
        ],
      })

      expect(graph.warnings).toContainEqual(
        expect.objectContaining({ code: "UNPROTECTED_RESOURCE_SPEND" }),
      )
    })

    it("should fail validation if anchorBlockId does not exist on source node", () => {
      defineNodeType(registry, {
        id: "scene",
        outgoingEdges: ["choice"],
        incomingEdges: ["choice"],
      })
      defineEdgeType(registry, { id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })

      const graph = defineGraph(registry, {
        id: "test-story",
        nodes: [
          {
            id: "start",
            type: "scene",
            blocks: [{ id: "intro", type: "paragraph", text: "Hello" }],
          },
          { id: "end", type: "scene" },
        ],
        edges: [
          {
            id: "c1",
            type: "choice",
            source: "start",
            target: "end",
            anchorBlockId: "non-existent-block-id",
          },
        ],
      })

      expect(graph.errors).toContainEqual(
        expect.objectContaining({ code: "UNKNOWN_ANCHOR_BLOCK_ID" }),
      )
    })
  })
})
