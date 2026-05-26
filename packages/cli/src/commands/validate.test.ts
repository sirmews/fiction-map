import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"
import type { GraphMetadata } from "@fiction-map/core"
import { validate } from "./validate"

const TEST_DIR = join(__dirname, "validate-fixtures")

function makeMetadata(overrides: Partial<GraphMetadata> = {}): GraphMetadata {
  return {
    nodeTypes: [],
    edgeTypes: [],
    conditions: [],
    effects: [],
    graphs: [],
    validation: { errors: [], warnings: [] },
    ...overrides,
  }
}

async function writeMetadata(outputDir: string, metadata: GraphMetadata): Promise<void> {
  const metadataDir = join(outputDir, ".fiction-map")
  await mkdir(metadataDir, { recursive: true })
  await writeFile(join(metadataDir, "metadata.json"), JSON.stringify(metadata, null, 2))
}

describe("validate command", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it("exits non-zero when metadata.json is missing", async () => {
    const outputDir = join(TEST_DIR, "missing")
    await mkdir(outputDir, { recursive: true })

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code ?? ""})`)
    }) as never

    await expect(validate({ rootDir: TEST_DIR, outputDir })).rejects.toThrow("process.exit(1)")
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(errorSpy).toHaveBeenCalled()
  })

  it("passes when no graphs report errors", async () => {
    const outputDir = join(TEST_DIR, "clean")
    await writeMetadata(outputDir, makeMetadata())

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code ?? ""})`)
    }) as never

    await validate({ rootDir: TEST_DIR, outputDir })
    expect(exitSpy).not.toHaveBeenCalled()
    expect(logSpy.mock.calls.some((c) => String(c[0]).includes("Validation passed"))).toBe(true)
  })

  it("exits non-zero when a graph has errors", async () => {
    const outputDir = join(TEST_DIR, "errors")
    await writeMetadata(
      outputDir,
      makeMetadata({
        graphs: [
          {
            id: "broken",
            name: "broken",
            location: { file: "x.graph.ts", line: 1, column: 1 },
            nodes: [],
            edges: [],
            nodeCount: 0,
            edgeCount: 0,
            maxDepth: 0,
            endings: [],
            nodeTypesUsed: [],
            edgeTypesUsed: [],
            conditionsUsed: [],
            effectsUsed: [],
            errors: [{ code: "UNKNOWN_NODE_TYPE", message: "Unknown node type: bad" }],
            warnings: [],
          },
        ],
      })
    )

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code ?? ""})`)
    }) as never

    await expect(validate({ rootDir: TEST_DIR, outputDir })).rejects.toThrow("process.exit(1)")
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(errorSpy.mock.calls.some((c) => String(c[0]).includes("UNKNOWN_NODE_TYPE"))).toBe(true)
    expect(errorSpy.mock.calls.some((c) => String(c[0]).includes("Hint: Define the missing node type"))).toBe(true)
  })

  it("passes warnings unless --strict is set", async () => {
    const outputDir = join(TEST_DIR, "warnings")
    await writeMetadata(
      outputDir,
      makeMetadata({
        graphs: [
          {
            id: "noisy",
            name: "noisy",
            location: { file: "x.graph.ts", line: 1, column: 1 },
            nodes: [],
            edges: [],
            nodeCount: 0,
            edgeCount: 0,
            maxDepth: 0,
            endings: [],
            nodeTypesUsed: [],
            edgeTypesUsed: [],
            conditionsUsed: [],
            effectsUsed: [],
            errors: [],
            warnings: [{ code: "UNREACHABLE_NODE", message: "Node x is unreachable" }],
          },
        ],
      })
    )

    vi.spyOn(console, "log").mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code ?? ""})`)
    }) as never

    await validate({ rootDir: TEST_DIR, outputDir })
    expect(exitSpy).not.toHaveBeenCalled()

    await expect(validate({ rootDir: TEST_DIR, outputDir, strict: true })).rejects.toThrow("process.exit(1)")
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes("Hint: Either connect the node"))).toBe(true)
  })
})
