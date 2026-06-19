import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { checkProject, generateProject } from "./index"

const TEST_DIR = join(__dirname, "check-fixtures")

async function createTestFixture() {
  await mkdir(join(TEST_DIR, "nodes"), { recursive: true })

  await writeFile(
    join(TEST_DIR, "nodes", "test.node.ts"),
    `
import { defineNodeType } from "@fiction-map/core"

export const TestNode = defineNodeType(registry, {
  id: "test",
  properties: { name: { type: "string", required: true } },
  outgoingEdges: [],
  incomingEdges: [],
})
`,
  )
}

async function cleanupTestFixture() {
  await rm(TEST_DIR, { recursive: true, force: true })
}

describe("checkProject", () => {
  beforeEach(async () => {
    await createTestFixture()
  })

  afterEach(async () => {
    await cleanupTestFixture()
  })

  it("reports missing artifacts when nothing has been generated", async () => {
    const outputDir = join(TEST_DIR, "check-missing-output")
    const result = await checkProject({ rootDir: TEST_DIR, outputDir })

    expect(result.ok).toBe(false)
    expect(result.mismatches.map((m) => m.reason)).toEqual(["missing", "missing"])
  })

  it("reports ok after a fresh generation", async () => {
    const outputDir = join(TEST_DIR, "check-ok-output")
    await generateProject({ rootDir: TEST_DIR, outputDir })

    const result = await checkProject({ rootDir: TEST_DIR, outputDir })
    expect(result.ok).toBe(true)
    expect(result.mismatches).toEqual([])
  })

  it("reports a difference when metadata is stale", async () => {
    const outputDir = join(TEST_DIR, "check-stale-output")
    await generateProject({ rootDir: TEST_DIR, outputDir })

    const metadataPath = join(outputDir, ".fiction-map", "metadata.json")
    const original = JSON.parse(await readFile(metadataPath, "utf8"))
    original.nodeTypes.push({
      id: "ghost",
      name: "ghost",
      location: { file: "x", line: 1, column: 1 },
      properties: {},
      outgoingEdges: [],
      incomingEdges: [],
    })
    await writeFile(metadataPath, JSON.stringify(original, null, 2))

    const result = await checkProject({ rootDir: TEST_DIR, outputDir })
    expect(result.ok).toBe(false)
    expect(result.mismatches.some((m) => m.reason === "different" && m.path === metadataPath)).toBe(
      true,
    )
  })
})
