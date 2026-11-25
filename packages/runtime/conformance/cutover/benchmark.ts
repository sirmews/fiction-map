import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { GraphMetadata } from "@fiction-map/core"
import { defineWorld, EntityRegistry } from "@fiction-map/entities"
import {
  createRuntimeFromGraph,
  deriveEntityState,
  validateGraphSemantics,
} from "@fiction-map/runtime"
import { runtime, world } from "../fixtures/literature-rpg/runtime"

function summarize(samples: number[]) {
  const sorted = [...samples].sort((left, right) => left - right)
  return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted.at(-1) }
}

const start = runtime.createState()
const enterEntrance = runtime.getAvailable(start).find(({ id }) => id === "enter-entrance")!
const entrance = runtime.step(start, enterEntrance, {
  derivedState: deriveEntityState(world, start),
}).state
const context = { derivedState: deriveEntityState(world, entrance) }
const enterHall = runtime.getAvailable(entrance, context).find(({ id }) => id === "enter-hall")!

// Fixed input avoids benchmarking progressive state growth or setup work.
function stepBatch(count: number) {
  let hits = 0
  const before = performance.now()
  for (let index = 0; index < count; index++) {
    const { state } = runtime.step(entrance, enterHall, context)
    hits += state.entityState?.resources.turns ?? 0
  }
  const elapsed = performance.now() - before
  assert.equal(hits, 2 * count)
  return (elapsed * 1000) / count
}

for (let trial = 0; trial < 3; trial++) stepBatch(10_000)
console.log(
  "Literature RPG enter-hall step (µs/op):",
  summarize(Array.from({ length: 11 }, () => stepBatch(10_000))),
)

const output = mkdtempSync(join(tmpdir(), "fiction-map-cutover-"))
try {
  // The CLI half of this benchmark intentionally targets the real consumer
  // app's source tree; only the in-process runtime/world come from the
  // self-contained fixture in ../fixtures/literature-rpg/.
  function runCLI() {
    const before = performance.now()
    const result = Bun.spawnSync([
      process.execPath,
      "packages/cli/dist/cli.js",
      "generate",
      "--root-dir",
      "apps/literature-rpg/src",
      "--output-dir",
      output,
    ])
    const elapsed = performance.now() - before
    assert.equal(result.exitCode, 0, result.stderr.toString())
    return elapsed
  }

  runCLI()
  console.log(
    "Built CLI generate with semantic validation (ms/process):",
    summarize(Array.from({ length: 11 }, () => runCLI())),
  )

  const metadata: GraphMetadata = JSON.parse(
    readFileSync(join(output, ".fiction-map", "metadata.json"), "utf8"),
  )
  const warnings = metadata.graphs.flatMap((graph) =>
    graph.warnings.filter(({ code }) => code.startsWith("SEMANTIC_")),
  )
  assert.equal(warnings.length, 12)
  assert(warnings.every(({ code }) => code === "SEMANTIC_ISSUE"))
  console.log("CLI semantic warnings:", {
    count: warnings.length,
    first: warnings[0],
    last: warnings.at(-1),
  })

  // Measure the same graph and empty world the generator hands to its solver.
  const graphRuntime = createRuntimeFromGraph(metadata.graphs[0])
  const emptyWorld = defineWorld(new EntityRegistry(), { id: "empty", entities: [] })
  function semanticBatch(count: number) {
    let issues = 0
    const before = performance.now()
    for (let index = 0; index < count; index++) {
      issues += validateGraphSemantics(graphRuntime, emptyWorld).errors.length
    }
    const elapsed = performance.now() - before
    assert.equal(issues, 12 * count)
    return elapsed / count
  }
  for (let trial = 0; trial < 3; trial++) semanticBatch(20)
  console.log(
    "CLI semantic solver in-process (ms/op):",
    summarize(Array.from({ length: 11 }, () => semanticBatch(20))),
  )
} finally {
  rmSync(output, { force: true, recursive: true })
}
