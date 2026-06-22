import { mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import type { GraphMetadata } from "@fiction-map/core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { debug } from "./debug"

const TEST_DIR = join(__dirname, "debug-fixtures")

function makeMetadata(): GraphMetadata {
  return {
    nodeTypes: [],
    edgeTypes: [],
    conditions: [],
    effects: [],
    validation: {
      errors: [],
      warnings: [],
    },
    graphs: [
      {
        id: "test-debug",
        name: "test-debug",
        location: { file: "graphs/debug.graph.ts", line: 1, column: 1 },
        nodes: [
          { id: "start", type: "scene", title: "Start" },
          { id: "gate", type: "scene", title: "Gate" },
          { id: "vault", type: "scene", title: "Vault" },
          { id: "end", type: "scene", title: "End" },
        ],
        edges: [
          {
            id: "go-gate",
            type: "choice",
            source: "start",
            target: "gate",
            text: "Go to Gate",
          },
          {
            id: "secret-gate",
            type: "choice",
            source: "start",
            target: "vault",
            text: "Secret Vault",
            visibility: [{ type: "hasFlag", key: "vault-key" }],
          },
          {
            id: "open-vault",
            type: "choice",
            source: "gate",
            target: "end",
            text: "Open Vault",
            conditions: [{ type: "hasEntity", entityId: "lantern" }],
            failureEffects: [{ type: "setFlag", key: "broke", value: true }],
          },
        ],
        nodeCount: 4,
        edgeCount: 3,
        maxDepth: 2,
        endings: ["vault", "end"],
        nodeTypesUsed: ["scene"],
        edgeTypesUsed: ["choice"],
        conditionsUsed: ["hasEntity", "hasFlag"],
        effectsUsed: ["setFlag"],
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

function createPrompt(commands: string[]): () => Promise<string> {
  let step = 0

  return async () => {
    const output = commands[step]
    step += 1
    return output ?? "quit"
  }
}

describe("debug command", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it("steps through a transition and updates state", async () => {
    const outputDir = join(TEST_DIR, "step-success")
    await writeMetadata(outputDir, makeMetadata())

    const lines: string[] = []
    const prompt = createPrompt(["step 1", "state", "quit"])
    await debug("test-debug", {
      rootDir: TEST_DIR,
      outputDir,
      io: {
        prompt,
        log: (...values: unknown[]) => {
          lines.push(values.join(" "))
        },
      },
    })

    expect(lines.some((line) => line.includes("Applying go-gate"))).toBe(true)
    expect(lines.some((line) => line.includes("✅ transition succeeded"))).toBe(true)
    expect(lines.some((line) => line.includes("Current node: gate"))).toBe(true)
  })

  it("explains unavailable transitions", async () => {
    const outputDir = join(TEST_DIR, "explain-unavailable")
    await writeMetadata(outputDir, makeMetadata())

    const lines: string[] = []
    const prompt = createPrompt(["explain 2", "step 1", "explain open-vault", "quit"])
    await debug("test-debug", {
      rootDir: TEST_DIR,
      outputDir,
      io: {
        prompt,
        log: (...values: unknown[]) => {
          lines.push(values.join(" "))
        },
      },
    })

    expect(lines.some((line) => line.includes("Explain secret-gate (hidden)"))).toBe(true)
    expect(lines.some((line) => line.includes("reason: Transition is not visible"))).toBe(true)
    expect(lines.some((line) => line.includes("Applying go-gate"))).toBe(true)
    expect(lines.some((line) => line.includes("Explain open-vault (blocked)"))).toBe(true)
    expect(lines.some((line) => line.includes("Requirements not met"))).toBe(true)
  })

  it("fails on missing graph id", async () => {
    const outputDir = join(TEST_DIR, "missing-id")
    await writeMetadata(outputDir, makeMetadata())

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`process.exit(${code ?? ""})`)
      }) as never

    await expect(debug(undefined, { rootDir: TEST_DIR, outputDir })).rejects.toThrow("process.exit(1)")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it("fails for unknown graph id", async () => {
    const outputDir = join(TEST_DIR, "unknown-graph")
    await writeMetadata(outputDir, makeMetadata())

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null) => {
        throw new Error(`process.exit(${code ?? ""})`)
      }) as never

    await expect(debug("missing-graph", { rootDir: TEST_DIR, outputDir })).rejects.toThrow(
      "process.exit(1)",
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

