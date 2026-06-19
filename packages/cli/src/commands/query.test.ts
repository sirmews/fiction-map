import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { GraphMetadata } from "@fiction-map/core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { explain, query, showGraph } from "./query"

const TEST_DIR = join(__dirname, "query-fixtures")

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
          { id: "entrance", type: "scene", title: "Entrance" },
          { id: "main-hall", type: "scene", title: "Main Hall" },
          { id: "dark-chapter", type: "scene", title: "Dark Chapter" },
        ],
        edges: [
          {
            id: "enter-hall",
            type: "choice",
            source: "entrance",
            target: "main-hall",
          },
          {
            id: "descend",
            type: "choice",
            source: "main-hall",
            target: "dark-chapter",
            conditions: [{ type: "hasEntity", entityId: "lantern" }],
          },
        ],
        nodeCount: 3,
        edgeCount: 2,
        maxDepth: 2,
        endings: ["dark-chapter"],
        nodeTypesUsed: ["scene"],
        edgeTypesUsed: ["choice"],
        conditionsUsed: ["hasEntity"],
        effectsUsed: [],
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

describe("query commands", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it("lists nodes from metadata", async () => {
    const outputDir = join(TEST_DIR, "nodes")
    await writeMetadata(outputDir, makeMetadata())

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await query("nodes", { rootDir: TEST_DIR, outputDir })

    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("entrance"))).toBe(true)
    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("main-hall"))).toBe(true)
  })

  it("filters edges by source node", async () => {
    const outputDir = join(TEST_DIR, "edges")
    await writeMetadata(outputDir, makeMetadata())

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await query("edges", { rootDir: TEST_DIR, outputDir, from: "main-hall" })

    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("descend"))).toBe(true)
    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("enter-hall"))).toBe(false)
  })

  it("renders static paths", async () => {
    const outputDir = join(TEST_DIR, "paths")
    await writeMetadata(outputDir, makeMetadata())

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await query("paths", { rootDir: TEST_DIR, outputDir })

    expect(
      logSpy.mock.calls.some((call) =>
        String(call[0]).includes("entrance -> main-hall -> dark-chapter"),
      ),
    ).toBe(true)
  })

  it("shows a graph summary", async () => {
    const outputDir = join(TEST_DIR, "graph-show")
    await writeMetadata(outputDir, makeMetadata())

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await showGraph("library", { rootDir: TEST_DIR, outputDir })

    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("Graph: library"))).toBe(true)
    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("Roots: entrance"))).toBe(true)
  })

  it("explains a node", async () => {
    const outputDir = join(TEST_DIR, "explain-node")
    await writeMetadata(outputDir, makeMetadata())

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await explain("main-hall", { rootDir: TEST_DIR, outputDir })

    expect(
      logSpy.mock.calls.some((call) => String(call[0]).includes("Node main-hall (scene)")),
    ).toBe(true)
    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("Incoming: enter-hall"))).toBe(
      true,
    )
    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("Outgoing: descend"))).toBe(
      true,
    )
  })

  it("exits for unknown ids", async () => {
    const outputDir = join(TEST_DIR, "missing")
    await writeMetadata(outputDir, makeMetadata())

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`process.exit(${code ?? ""})`)
      }) as never

    await expect(explain("missing", { rootDir: TEST_DIR, outputDir })).rejects.toThrow(
      "process.exit(1)",
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(errorSpy).toHaveBeenCalled()
  })

  it("lists known graph ids when a graph lookup fails", async () => {
    const outputDir = join(TEST_DIR, "missing-graph")
    await writeMetadata(outputDir, makeMetadata())

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`process.exit(${code ?? ""})`)
      }) as never

    await expect(showGraph("missing-graph", { rootDir: TEST_DIR, outputDir })).rejects.toThrow(
      "process.exit(1)",
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(
      errorSpy.mock.calls.some((call) => String(call[0]).includes('Known graph ids: "library".')),
    ).toBe(true)
  })
})
