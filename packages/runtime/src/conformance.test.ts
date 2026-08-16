import fs from "node:fs"
import path from "node:path"
import type { GraphBlueprint } from "./adapter"
import { describe, expect, it } from "vitest"
import { GraphRuntime } from "./runtime"

/**
 * Runtime conformance harness.
 *
 * Loads JSON fixtures from `conformance/fixtures/` and asserts the runtime
 * produces the expected, hand-verified output. Fixtures are a language-agnostic
 * contract: a Rust (or Go) port of the runtime MUST produce byte-identical
 * output for the same `{ blueprint, method, args }` triple.
 *
 * Each fixture's `expected` encodes the CORRECT behavior. A failing assertion
 * here is a runtime bug, not a fixture bug — the fixture is the spec.
 *
 * Fixture shape:
 * {
 *   "name": "...",
 *   "blueprint": { nodes, edges, endings, startNode },   // GraphBlueprint as JSON
 *   "calls": [
 *     { "method": "enumeratePaths", "args": [maxDepth, maxPaths],
 *       "expected": [ { steps, finalNodeId, endedAt }, ... ] }
 *   ]
 * }
 *
 * Comparison is order-insensitive (paths are sorted by their steps) because
 * path enumeration order is an implementation detail and MUST NOT be part of
 * the contract a Rust port has to match.
 */

interface ExpectedStep {
  transitionId: string
  fromNodeId: string
  toNodeId: string
  success: boolean
}
interface ExpectedPath {
  steps: ExpectedStep[]
  finalNodeId: string
  endedAt: string
}
interface WalkExpected {
  length: number
  finalNodeId: string
  nodeSequence: string[]
}
interface Call {
  method: "enumeratePaths" | "walk"
  args: number[]
  expected: ExpectedPath[] | WalkExpected
}
interface Fixture {
  name: string
  description: string
  blueprint: GraphBlueprint
  calls: Call[]
}

const fixturesDir = path.resolve(__dirname, "../conformance/fixtures")
const fixtureFiles = fs
  .readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".json"))

function canonicalPath(p: { steps: ExpectedStep[]; finalNodeId: string; endedAt: string }) {
  return JSON.stringify({
    steps: p.steps,
    finalNodeId: p.finalNodeId,
    endedAt: p.endedAt,
  })
}

function sortPaths(paths: ExpectedPath[]): ExpectedPath[] {
  return [...paths].sort((a, b) => canonicalPath(a).localeCompare(canonicalPath(b)))
}

describe("Runtime conformance (golden fixtures)", () => {
  for (const file of fixtureFiles) {
    const raw = fs.readFileSync(path.join(fixturesDir, file), "utf8")
    const fixture = JSON.parse(raw) as Fixture

    describe(fixture.name, () => {
      for (const call of fixture.calls) {
        it(`${call.method}(${call.args.join(", ")}) matches golden fixture`, () => {
          const runtime = new GraphRuntime(fixture.blueprint)

          if (call.method === "enumeratePaths") {
            const [maxDepth, maxPaths] = call.args
            const result = runtime.enumeratePaths(maxDepth, maxPaths)
            const actual = result.map((p) => ({
              steps: p.steps.map((s) => ({
                transitionId: s.transitionId,
                fromNodeId: s.fromNodeId,
                toNodeId: s.toNodeId,
                success: s.success,
              })),
              finalNodeId: p.finalNodeId,
              endedAt: p.endedAt,
            }))
            expect(sortPaths(actual)).toEqual(sortPaths(call.expected as ExpectedPath[]))
          } else if (call.method === "walk") {
            const [maxSteps] = call.args
            const result = runtime.walk(runtime.createState(), maxSteps)
            const expected = call.expected as WalkExpected
            expect(result.length).toBe(expected.length)
            expect(result[result.length - 1]?.nodeId).toBe(expected.finalNodeId)
            expect(result.map((s) => s.nodeId)).toEqual(expected.nodeSequence)
          } else {
            throw new Error(`Unsupported method in fixture: ${call.method}`)
          }
        })
      }
    })
  }
})
