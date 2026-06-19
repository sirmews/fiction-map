import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { generate } from "../commands/generate"
import * as generatorModule from "./index"
import { generateMetadata, generateProject } from "./index"

const TEST_DIR = join(__dirname, "orchestration-fixtures")

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
export const TestNode = defineNodeType(registry, {
  id: "test",
  properties: {
    name: { type: "string", required: true },
  },
  outgoingEdges: ["link"],
  incomingEdges: ["link"],
})
`,
  )

  await writeFile(
    join(TEST_DIR, "edges", "link.edge.ts"),
    `
import { defineEdgeType } from "@fiction-map/core"

export const LinkEdge = defineEdgeType(registry, {
  id: "link",
  sourceTypes: ["test"],
  targetTypes: ["test"],
})
`,
  )

  await writeFile(
    join(TEST_DIR, "conditions", "has-value.condition.ts"),
    `
import { defineCondition } from "@fiction-map/core"

export const HasValueCondition = defineCondition(registry, {
  id: "has-value",
  parameters: {
    key: { type: "string", required: true },
  },
})
`,
  )

  await writeFile(
    join(TEST_DIR, "effects", "set-value.effect.ts"),
    `
import { defineEffect } from "@fiction-map/core"

export const SetValueEffect = defineEffect(registry, {
  id: "set-value",
  parameters: {
    key: { type: "string", required: true },
  },
})
`,
  )
}

async function cleanupTestFixture() {
  await rm(TEST_DIR, { recursive: true, force: true })
}

describe("generator orchestration", () => {
  beforeEach(async () => {
    await createTestFixture()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanupTestFixture()
  })

  describe("generateMetadata", () => {
    it("writes only metadata through the metadata-only generation path", async () => {
      const outputDir = join(TEST_DIR, "metadata-output")

      const { metadata, metadataPath } = await generateMetadata({ rootDir: TEST_DIR, outputDir })
      const written = JSON.parse(await readFile(metadataPath, "utf8"))

      expect(metadataPath).toBe(join(outputDir, ".fiction-map", "metadata.json"))
      expect(written).toEqual(metadata)
      await expect(access(join(outputDir, "SEMANTICS.md"))).rejects.toThrow()
    })
  })

  describe("generateProject", () => {
    it("writes both project artifacts through the full generation path", async () => {
      const outputDir = join(TEST_DIR, "project-output")

      const result = await generateProject({ rootDir: TEST_DIR, outputDir })
      const writtenMetadata = JSON.parse(await readFile(result.metadataPath, "utf8"))
      const writtenSemantics = await readFile(result.semanticsPath, "utf8")

      expect(result.metadata).toEqual(writtenMetadata)
      expect(result.metadataPath).toBe(join(outputDir, ".fiction-map", "metadata.json"))
      expect(result.semanticsPath).toBe(join(outputDir, "SEMANTICS.md"))
      expect(writtenSemantics).toContain("### `test`")
      expect(writtenSemantics).toContain("### `link`")
      expect(writtenSemantics).toContain("defineNodeType(registry, {")
    })

    it("restores previous metadata when semantics writing fails", async () => {
      const outputDir = join(TEST_DIR, "project-failure-output")
      const metadataDir = join(outputDir, ".fiction-map")
      const metadataPath = join(metadataDir, "metadata.json")
      const previousMetadata = { preserved: true }

      await mkdir(metadataDir, { recursive: true })
      await writeFile(metadataPath, JSON.stringify(previousMetadata, null, 2))
      await mkdir(join(outputDir, "SEMANTICS.md"), { recursive: true })

      await expect(generateProject({ rootDir: TEST_DIR, outputDir })).rejects.toThrow()

      const restoredMetadata = JSON.parse(await readFile(metadataPath, "utf8"))
      expect(restoredMetadata).toEqual(previousMetadata)
    })
  })

  describe("generate command", () => {
    it("writes metadata and semantics through the command path", async () => {
      const outputDir = join(TEST_DIR, "command-output")
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const generateProjectSpy = vi.spyOn(generatorModule, "generateProject")
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((code?: string | number | null) => {
          throw new Error(`process.exit(${code ?? ""})`)
        }) as never

      await generate({ rootDir: TEST_DIR, outputDir })

      const metadata = JSON.parse(
        await readFile(join(outputDir, ".fiction-map", "metadata.json"), "utf8"),
      )
      const semantics = await readFile(join(outputDir, "SEMANTICS.md"), "utf8")

      expect(metadata.nodeTypes).toHaveLength(1)
      expect(semantics).toContain("# Fiction Map — Generated Semantics")
      expect(generateProjectSpy).toHaveBeenCalledOnce()
      expect(exitSpy).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalled()
    })

    it("exits cleanly without leaving new metadata behind when semantics generation fails", async () => {
      const outputDir = join(TEST_DIR, "command-failure-output")
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation((code?: string | number | null) => {
          throw new Error(`process.exit(${code ?? ""})`)
        }) as never

      await mkdir(join(outputDir, "SEMANTICS.md"), { recursive: true })

      await expect(generate({ rootDir: TEST_DIR, outputDir })).rejects.toThrow("process.exit(1)")

      await expect(access(join(outputDir, ".fiction-map", "metadata.json"))).rejects.toThrow()
      expect(errorSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(logSpy).toHaveBeenCalled()
    })
  })
})
