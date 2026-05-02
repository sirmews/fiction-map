import { describe, it, expect, beforeEach } from "vitest"
import {
  defineNodeType,
  defineEdgeType,
  defineCondition,
  defineEffect,
  defineGraph,
  generateMetadata,
  clearNodeTypes,
  clearEdgeTypes,
  clearConditions,
  clearEffects,
  clearGraphs,
} from "../src"

describe("@fiction-map/core", () => {
  beforeEach(() => {
    clearNodeTypes()
    clearEdgeTypes()
    clearConditions()
    clearEffects()
    clearGraphs()
  })
  
  describe("defineNodeType", () => {
    it("should define a node type", () => {
      const sceneNode = defineNodeType({
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
    })
    
    it("should not allow duplicate node type ids", () => {
      defineNodeType({ id: "scene" })
      
      expect(() => {
        defineNodeType({ id: "scene" })
      }).toThrow("already defined")
    })
  })
  
  describe("defineEdgeType", () => {
    it("should define an edge type", () => {
      const choiceEdge = defineEdgeType({
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
    })
  })
  
  describe("defineCondition", () => {
    it("should define a condition", () => {
      const hasItem = defineCondition({
        id: "has-item",
        parameters: {
          itemId: { type: "string", required: true },
        },
      })
      
      expect(hasItem.id).toBe("has-item")
      expect(hasItem.name).toBe("hasItemCondition")
    })
  })
  
  describe("defineEffect", () => {
    it("should define an effect", () => {
      const giveItem = defineEffect({
        id: "give-item",
        parameters: {
          itemId: { type: "string", required: true },
        },
      })
      
      expect(giveItem.id).toBe("give-item")
      expect(giveItem.name).toBe("giveItemEffect")
    })
  })
  
  describe("defineGraph", () => {
    it("should define a valid graph", () => {
      defineNodeType({ id: "scene", outgoingEdges: ["choice"], incomingEdges: ["choice"] })
      defineEdgeType({ id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })
      
      const graph = defineGraph({
        id: "test-story",
        nodes: [
          { id: "start", type: "scene", title: "Beginning" },
          { id: "end", type: "scene", title: "Ending" },
        ],
        edges: [
          { id: "c1", type: "choice", source: "start", target: "end", text: "Continue" },
        ],
      })
      
      expect(graph.id).toBe("test-story")
      expect(graph.nodeCount).toBe(2)
      expect(graph.edgeCount).toBe(1)
      expect(graph.errors).toHaveLength(0)
    })
    
    it("should detect unknown node types", () => {
      const graph = defineGraph({
        id: "test-story",
        nodes: [
          { id: "start", type: "unknown-type" },
        ],
        edges: [],
      })
      
      expect(graph.errors).toContainEqual(
        expect.objectContaining({ code: "UNKNOWN_NODE_TYPE" })
      )
    })
    
    it("should detect invalid edge type connections", () => {
      defineNodeType({ id: "scene", outgoingEdges: ["choice"], incomingEdges: ["choice"] })
      defineNodeType({ id: "task", outgoingEdges: ["flow"], incomingEdges: ["flow"] })
      defineEdgeType({ id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })
      
      const graph = defineGraph({
        id: "test-story",
        nodes: [
          { id: "start", type: "scene" },
          { id: "end", type: "task" },
        ],
        edges: [
          { id: "c1", type: "choice", source: "start", target: "end" },
        ],
      })
      
      expect(graph.errors).toContainEqual(
        expect.objectContaining({ code: "INVALID_TARGET_TYPE" })
      )
    })
    
    it("should find endings", () => {
      defineNodeType({ id: "scene" })
      defineEdgeType({ id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })
      
      const graph = defineGraph({
        id: "test-story",
        nodes: [
          { id: "start", type: "scene" },
          { id: "end", type: "scene" },
        ],
        edges: [
          { id: "c1", type: "choice", source: "start", target: "end" },
        ],
      })
      
      expect(graph.endings).toContain("end")
    })
  })
  
  describe("generateMetadata", () => {
    it("should generate complete metadata", () => {
      defineNodeType({ id: "scene" })
      defineEdgeType({ id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })
      defineCondition({ id: "has-item" })
      defineEffect({ id: "give-item" })
      defineGraph({
        id: "test",
        nodes: [{ id: "start", type: "scene" }],
        edges: [],
      })
      
      const metadata = generateMetadata()
      
      expect(metadata.nodeTypes).toHaveLength(1)
      expect(metadata.edgeTypes).toHaveLength(1)
      expect(metadata.conditions).toHaveLength(1)
      expect(metadata.effects).toHaveLength(1)
      expect(metadata.graphs).toHaveLength(1)
    })
  })
})
