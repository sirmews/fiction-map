import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { GraphMetadata } from "@fiction-map/core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildRequests, enumeratePaths, resolveRuntimeBinary } from "./enumerate-paths"

const TEST_DIR = join(__dirname, "enumerate-paths-fixtures")

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
        ],
        edges: [
          {
            id: "enter-hall",
            type: "choice",
            source: "entrance",
            target: "main-hall",
          },
        ],
        nodeCount: 2,
        edgeCount: 1,
        maxDepth: 1,
        endings: ["main-hall"],
        nodeTypesUsed: ["scene"],
        edgeTypesUsed: ["choice"],
        conditionsUsed: [],
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

function okSpawn(captured: { input?: string }) {
  return (_binary: string, input: string) => {
    captured.input = input
    const lines = input.trim().split("\n")
    return {
      status: 0,
      stdout: `${lines.map(() => JSON.stringify({ paths: [] })).join("\n")}\n`,
      stderr: "",
    }
  }
}

describe("enumerate-paths command", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it("builds wire requests from graph definitions", () => {
    const requests = buildRequests(makeMetadata().graphs, { maxDepth: 5, maxPaths: 10 })

    expect(requests).toHaveLength(1)
    const request = requests[0] as {
      blueprint: { nodes: unknown[]; edges: unknown[] }
      maxDepth: number
      maxPaths: number
    }
    expect(request.blueprint.nodes).toHaveLength(2)
    expect(request.blueprint.edges).toHaveLength(1)
    expect(request.maxDepth).toBe(5)
    expect(request.maxPaths).toBe(10)
  })

  it("resolves the binary from the environment override", () => {
    expect(resolveRuntimeBinary({ FICTION_MAP_RUNTIME_RS: "/nonexistent/bin" })).toBeNull()
  })

  it("sends one JSON line per graph and prints responses", async () => {
    const outputDir = join(TEST_DIR, "ok")
    await writeMetadata(outputDir, makeMetadata())

    const captured: { input?: string } = {}
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await enumeratePaths(
      { rootDir: TEST_DIR, outputDir, graph: "library", json: true },
      okSpawn(captured),
      "/fake/fiction-map-runtime",
    )

    const lines = captured.input?.trim().split("\n") ?? []
    expect(lines).toHaveLength(1)
    const sent = JSON.parse(lines[0]) as {
      blueprint: { nodes: unknown[] }
      maxDepth?: number
    }
    expect(sent.blueprint.nodes).toHaveLength(2)
    expect(sent.maxDepth).toBeUndefined()

    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("library"))).toBe(true)
  })

  it("exits non-zero when the runtime reports an error", async () => {
    const outputDir = join(TEST_DIR, "error")
    await writeMetadata(outputDir, makeMetadata())

    vi.spyOn(console, "log").mockImplementation(() => {})
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`process.exit(${code ?? ""})`)
      })

    const spawn = () => ({
      status: 0,
      stdout: `${JSON.stringify({ error: { code: "BOOM", message: "boom" } })}\n`,
      stderr: "",
    })

    await expect(
      enumeratePaths({ rootDir: TEST_DIR, outputDir, graph: "library" }, spawn, "/fake/bin"),
    ).rejects.toThrow("process.exit(1)")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it("rejects invalid max-depth values before spawning", async () => {
    const outputDir = join(TEST_DIR, "bad-depth")
    await writeMetadata(outputDir, makeMetadata())

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`process.exit(${code ?? ""})`)
      })
    const spawn = vi.fn()

    await expect(
      enumeratePaths({ rootDir: TEST_DIR, outputDir, maxDepth: 0 }, spawn, "/fake/bin"),
    ).rejects.toThrow("process.exit(1)")
    expect(spawn).not.toHaveBeenCalled()
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes("--max-depth"))).toBe(true)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
