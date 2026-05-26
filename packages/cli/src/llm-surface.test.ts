import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"
import type { GraphMetadata } from "@fiction-map/core"
import { explain } from "./commands/query"
import { renderSemantics } from "./generator/semantics"

const TEST_DIR = join(__dirname, "llm-surface-fixtures")

function makeMetadata(): GraphMetadata {
  return {
    nodeTypes: [],
    edgeTypes: [],
    conditions: [],
    effects: [],
    validation: { errors: [], warnings: [] },
    graphs: [
      {
        id: "library",
        name: "library",
        location: { file: "graphs/library.graph.ts", line: 10, column: 1 },
        nodes: [
          { id: "entrance", type: "scene" },
          { id: "main-hall", type: "scene" },
          { id: "dark-chapter", type: "scene" },
        ],
        edges: [
          {
            id: "descend",
            type: "choice",
            source: "main-hall",
            target: "dark-chapter",
            conditions: [{ type: "hasEntity", entityId: "lantern" }],
            effects: [{ type: "grantEntity", entityId: "torch" }],
          },
        ],
        nodeCount: 3,
        edgeCount: 1,
        maxDepth: 1,
        endings: ["dark-chapter"],
        nodeTypesUsed: ["scene"],
        edgeTypesUsed: ["choice"],
        conditionsUsed: ["hasEntity"],
        effectsUsed: ["grantEntity"],
        errors: [],
        warnings: [],
      },
    ],
  }
}

async function writeMetadata(outputDir: string, metadata: GraphMetadata): Promise<void> {
  const metadataDir = join(outputDir, ".fiction-map")
  await mkdir(metadataDir, { recursive: true })
  await writeFile(join(metadataDir, "metadata.json"), JSON.stringify(metadata, null, 2))
}

describe("LLM-facing surfaces", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it("renders graph topology with readable conditions and effects in SEMANTICS.md", () => {
    const content = renderSemantics(makeMetadata())

    expect(content).toContain("| Source | Edge | Target | Conditions | Effects |")
    expect(content).toContain("`hasEntity(entityId=\"lantern\")`")
    expect(content).toContain("`grantEntity(entityId=\"torch\")`")
    expect(content).toContain("- Conditions used: `hasEntity`")
    expect(content).toContain("- Effects used: `grantEntity`")
  })

  it("explains edges without raw JSON dumps", async () => {
    const outputDir = join(TEST_DIR, "explain-edge")
    await writeMetadata(outputDir, makeMetadata())

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await explain("descend", { rootDir: TEST_DIR, outputDir })

    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("Conditions: hasEntity(entityId=\"lantern\")"))).toBe(true)
    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("Effects: grantEntity(entityId=\"torch\")"))).toBe(true)
  })
})
