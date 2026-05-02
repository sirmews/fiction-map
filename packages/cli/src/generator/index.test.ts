import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mkdir, writeFile, readFile, rm, access } from "fs/promises"
import { join } from "path"
import { buildMetadata, generateSemantics, writeMetadata } from "./index"
import * as discoverModule from "./discover"
import { discoverFiles } from "./discover"
import { extractNodeType, extractEdgeType, extractCondition, extractEffect } from "./extract"

const TEST_DIR = join(__dirname, "fixtures")

async function createTestFixture() {
  await mkdir(join(TEST_DIR, "nodes"), { recursive: true })
  await mkdir(join(TEST_DIR, "edges"), { recursive: true })
  await mkdir(join(TEST_DIR, "conditions"), { recursive: true })
  await mkdir(join(TEST_DIR, "effects"), { recursive: true })
  
  await writeFile(
    join(TEST_DIR, "nodes", "test.node.ts"),
    `
import { defineNodeType } from "@fiction-map/core"

/**
 * @description A test node type
 * @ai-rule Test nodes must have a name
 */
export const TestNode = defineNodeType({
  id: "test",
  properties: {
    name: { type: "string", required: true },
    count: { type: "number", default: 0 },
  },
  outgoingEdges: ["link"],
  incomingEdges: ["link"],
})
`
  )
  
  await writeFile(
    join(TEST_DIR, "edges", "link.edge.ts"),
    `
import { defineEdgeType } from "@fiction-map/core"

/**
 * @description A test edge type
 */
export const LinkEdge = defineEdgeType({
  id: "link",
  sourceTypes: ["test"],
  targetTypes: ["test"],
})
`
  )
  
  await writeFile(
    join(TEST_DIR, "conditions", "has-value.condition.ts"),
    `
import { defineCondition } from "@fiction-map/core"

export const HasValueCondition = defineCondition({
  id: "has-value",
  parameters: {
    key: { type: "string", required: true },
  },
})
`
  )
  
  await writeFile(
    join(TEST_DIR, "effects", "set-value.effect.ts"),
    `
import { defineEffect } from "@fiction-map/core"

export const SetValueEffect = defineEffect({
  id: "set-value",
  parameters: {
    key: { type: "string", required: true },
    value: { type: "string" },
  },
})
`
  )
}

async function cleanupTestFixture() {
  await rm(TEST_DIR, { recursive: true, force: true })
}

describe("generator", () => {
  beforeEach(async () => {
    await createTestFixture()
  })
  
  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanupTestFixture()
  })
  
  describe("discoverFiles", () => {
    it("should discover node files", async () => {
      const result = await discoverFiles(TEST_DIR)
      
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].id).toBe("test")
      expect(result.nodes[0].type).toBe("node")
    })
    
    it("should discover edge files", async () => {
      const result = await discoverFiles(TEST_DIR)
      
      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].id).toBe("link")
      expect(result.edges[0].type).toBe("edge")
    })
    
    it("should discover condition files", async () => {
      const result = await discoverFiles(TEST_DIR)
      
      expect(result.conditions).toHaveLength(1)
      expect(result.conditions[0].id).toBe("has-value")
      expect(result.conditions[0].type).toBe("condition")
    })
    
    it("should discover effect files", async () => {
      const result = await discoverFiles(TEST_DIR)
      
      expect(result.effects).toHaveLength(1)
      expect(result.effects[0].id).toBe("set-value")
      expect(result.effects[0].type).toBe("effect")
    })
  })
  
  describe("extractNodeType", () => {
    it("should extract node type definition", async () => {
      const result = await discoverFiles(TEST_DIR)
      const nodeFile = result.nodes[0]
      
      const definition = extractNodeType(nodeFile.path, TEST_DIR)
      
      expect(definition).not.toBeNull()
      expect(definition!.id).toBe("test")
      expect(definition!.name).toBe("testNode")
      expect(definition!.description).toBe("A test node type")
      expect(definition!.aiRule).toBe("Test nodes must have a name")
    })
    
    it("should extract properties", async () => {
      const result = await discoverFiles(TEST_DIR)
      const nodeFile = result.nodes[0]
      
      const definition = extractNodeType(nodeFile.path, TEST_DIR)
      
      expect(definition!.properties.name).toBeDefined()
      expect(definition!.properties.name.type).toBe("string")
      expect(definition!.properties.name.required).toBe(true)
      
      expect(definition!.properties.count).toBeDefined()
      expect(definition!.properties.count.type).toBe("number")
      expect(definition!.properties.count.default).toBe(0)
    })
    
    it("should extract edge constraints", async () => {
      const result = await discoverFiles(TEST_DIR)
      const nodeFile = result.nodes[0]
      
      const definition = extractNodeType(nodeFile.path, TEST_DIR)
      
      expect(definition!.outgoingEdges).toContain("link")
      expect(definition!.incomingEdges).toContain("link")
    })
  })
  
  describe("extractEdgeType", () => {
    it("should extract edge type definition", async () => {
      const result = await discoverFiles(TEST_DIR)
      const edgeFile = result.edges[0]
      
      const definition = extractEdgeType(edgeFile.path, TEST_DIR)
      
      expect(definition).not.toBeNull()
      expect(definition!.id).toBe("link")
      expect(definition!.name).toBe("linkEdge")
      expect(definition!.description).toBe("A test edge type")
    })
    
    it("should extract source and target types", async () => {
      const result = await discoverFiles(TEST_DIR)
      const edgeFile = result.edges[0]
      
      const definition = extractEdgeType(edgeFile.path, TEST_DIR)
      
      expect(definition!.sourceTypes).toContain("test")
      expect(definition!.targetTypes).toContain("test")
    })
  })
  
  describe("extractCondition", () => {
    it("should extract condition definition", async () => {
      const result = await discoverFiles(TEST_DIR)
      const conditionFile = result.conditions[0]
      
      const definition = extractCondition(conditionFile.path, TEST_DIR)
      
      expect(definition).not.toBeNull()
      expect(definition!.id).toBe("has-value")
      expect(definition!.name).toBe("hasValueCondition")
      expect(definition!.parameters.key).toBeDefined()
      expect(definition!.parameters.key.type).toBe("string")
    })
  })
  
  describe("extractEffect", () => {
    it("should extract effect definition", async () => {
      const result = await discoverFiles(TEST_DIR)
      const effectFile = result.effects[0]
      
      const definition = extractEffect(effectFile.path, TEST_DIR)
      
      expect(definition).not.toBeNull()
      expect(definition!.id).toBe("set-value")
      expect(definition!.name).toBe("setValueEffect")
      expect(definition!.parameters.key).toBeDefined()
      expect(definition!.parameters.key.required).toBe(true)
    })
  })

  describe("buildMetadata", () => {
    it("builds metadata without writing output files", async () => {
      const metadata = await buildMetadata({ rootDir: TEST_DIR })

      expect(metadata.nodeTypes).toHaveLength(1)
      expect(metadata.edgeTypes).toHaveLength(1)
      expect(metadata.conditions).toHaveLength(1)
      expect(metadata.effects).toHaveLength(1)
      expect(metadata.graphs).toHaveLength(0)
      await expect(access(join(TEST_DIR, ".fiction-map", "metadata.json"))).rejects.toThrow()
    })

    it("propagates discovery failures", async () => {
      vi.spyOn(discoverModule, "discoverFiles").mockRejectedValueOnce(new Error("discovery failed"))

      await expect(buildMetadata({ rootDir: TEST_DIR })).rejects.toThrow("discovery failed")
    })
  })

  describe("writeMetadata", () => {
    it("writes metadata.json when asked", async () => {
      const metadata = await buildMetadata({ rootDir: TEST_DIR })
      const outputDir = join(TEST_DIR, "generated")

      const outputPath = await writeMetadata(metadata, { rootDir: TEST_DIR, outputDir })
      const written = JSON.parse(await readFile(outputPath, "utf8"))

      expect(outputPath).toBe(join(outputDir, ".fiction-map", "metadata.json"))
      expect(written).toEqual(metadata)
    })

    it("propagates filesystem write failures", async () => {
      const metadata = await buildMetadata({ rootDir: TEST_DIR })
      const blockedOutputDir = join(TEST_DIR, "blocked-output")

      await writeFile(blockedOutputDir, "not a directory")

      await expect(
        writeMetadata(metadata, { rootDir: TEST_DIR, outputDir: blockedOutputDir })
      ).rejects.toThrow()
    })
  })

  describe("generateSemantics", () => {
    it("creates its output directory when writing semantics standalone", async () => {
      const metadata = await buildMetadata({ rootDir: TEST_DIR })
      const outputDir = join(TEST_DIR, "nested", "semantics-output")

      const outputPath = await generateSemantics(metadata, { rootDir: TEST_DIR, outputDir })
      const semantics = await readFile(outputPath, "utf8")

      expect(outputPath).toBe(join(outputDir, "SEMANTICS.md"))
      expect(semantics).toContain('<node_type id="test">')
      expect(semantics).toContain('<edge_type id="link">')
      expect(semantics).toContain('<condition id="has-value">')
      expect(semantics).toContain('<effect id="set-value">')
    })
  })
})
