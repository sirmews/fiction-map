import { defineNodeType, defineEdgeType, defineGraph, ProjectRegistry } from "@fiction-map/core"
import { bench, describe } from "vitest"
import { createRuntimeFromGraph } from "./graph-definition"
import { registerBuiltins } from "./builtins"
import { createInitialState } from "./core/state"
import { solveGraphSemantics } from "./validation/solver"
import { deriveEntityState } from "./entities/derived"

// ============================================================================
// fiction-map runtime benchmark suite
//
// This is the canonical perf measurement for the runtime. It covers the real
// call paths consumers use, not synthetic loops:
//   1. enumeratePaths to COMPLETION (no maxPaths cap) — the true state-space
//      size and exhaustion time, the number that bounds CI validate cost.
//   2. enumeratePaths capped — throughput in paths/s, comparable across impls.
//   3. solveGraphSemantics — the actual CI validation workload.
//   4. step() with derived-state context — the per-request server hot path
//      (what literature-rpg's /intent endpoint does per user action).
//   5. getAvailable() alone — transition-availability scan cost, isolated.
//
// Graphs are sized to expose scaling, not to be cute. The large graph is
// generated programmatically so we can dial N and see how cost grows.
// ============================================================================

// ---------------------------------------------------------------------------
// Graph fixtures
// ---------------------------------------------------------------------------

/**
 * The reference library-mystery graph from apps/literature-rpg.
 * 23 nodes, 60 transitions, 2 endings. Uses visited conditions + resources +
 * flags — the realistic mixed-condition shape, not a toy.
 */
function buildLibraryMysteryGraph() {
  const registry = new ProjectRegistry()
  registerBuiltins(registry)

  defineNodeType(registry, {
    id: "scene",
    properties: { title: { type: "string", required: false } },
    outgoingEdges: ["choice"],
  })
  defineEdgeType(registry, {
    id: "choice",
    properties: { text: { type: "string", required: false } },
    sourceTypes: ["scene"],
    targetTypes: ["scene"],
  })

  // The real story graph — imported shape from apps/literature-rpg.
  // We reconstruct the essential topology here so the bench doesn't depend
  // on the app's build:deps step. Node/transition counts match the real graph.
  const nodes = [
    "courtyard", "entrance", "main-hall", "grand-staircase", "observatory",
    "gallery", "archives", "dark-chapter", "alchemist-lab", "east-wing",
    "west-wing", "upstairs-hall", "death", "victory", "cellar", "library",
    "secret-room", "balcony", "kitchen", "dining-hall", "garden", "tower",
    "crypt",
  ].map((id) => ({ id, type: "scene" }))

  // Build a realistic transition set: linear backbone + branches + loops.
  // 60 transitions targeting the 23 nodes, mixing gated/ungated edges.
  const edges: { id: string; source: string; target: string; conditions?: any[] }[] = []
  const backbone = [
    "courtyard", "entrance", "main-hall", "grand-staircase", "observatory",
    "gallery", "archives", "dark-chapter",
  ]
  for (let i = 0; i < backbone.length - 1; i++) {
    edges.push({ id: `fwd-${i}`, source: backbone[i], target: backbone[i + 1] })
  }
  // Branches
  edges.push({ id: "hall-cellar", source: "main-hall", target: "cellar" })
  edges.push({ id: "hall-library", source: "main-hall", target: "library" })
  edges.push({ id: "stairs-west", source: "grand-staircase", target: "west-wing" })
  edges.push({ id: "stairs-east", source: "grand-staircase", target: "east-wing" })
  edges.push({ id: "obs-tower", source: "observatory", target: "tower" })
  edges.push({ id: "gallery-balcony", source: "gallery", target: "balcony" })
  edges.push({ id: "archives-secret", source: "archives", target: "secret-room" })
  edges.push({ id: "cellar-crypt", source: "cellar", target: "crypt" })
  edges.push({ id: "lab-kitchen", source: "alchemist-lab", target: "kitchen" })
  edges.push({ id: "kitchen-dining", source: "kitchen", target: "dining-hall" })
  edges.push({ id: "dining-garden", source: "dining-hall", target: "garden" })
  edges.push({ id: "garden-courtyard", source: "garden", target: "courtyard" })
  // Loops back to create cycles (the interesting case for pruning)
  edges.push({ id: "loop-west-stairs", source: "west-wing", target: "grand-staircase" })
  edges.push({ id: "loop-east-stairs", source: "east-wing", target: "grand-staircase" })
  edges.push({ id: "loop-cellar-hall", source: "cellar", target: "main-hall" })
  edges.push({ id: "loop-library-hall", source: "library", target: "main-hall" })
  // Gated edges (visited conditions — exercises the soundness fix)
  edges.push({
    id: "gated-dark-victory",
    source: "dark-chapter",
    target: "victory",
    conditions: [{ type: "visited", nodeId: "archives" }],
  })
  edges.push({
    id: "gated-crypt-victory",
    source: "crypt",
    target: "victory",
    conditions: [{ type: "visited", nodeId: "library" }],
  })
  edges.push({
    id: "gated-tower-victory",
    source: "tower",
    target: "victory",
    conditions: [{ type: "visited", nodeId: "observatory" }],
  })
  // Death branches
  edges.push({ id: "dark-death", source: "dark-chapter", target: "death" })
  edges.push({ id: "crypt-death", source: "crypt", target: "death" })
  // Extra cross-edges to reach ~60 transitions
  for (let i = 0; i < 35; i++) {
    const src = nodes[i % nodes.length].id
    const tgt = nodes[(i + 7) % nodes.length].id
    if (src !== tgt && src !== "death" && src !== "victory" && tgt !== "death") {
      edges.push({ id: `cross-${i}`, source: src, target: tgt })
    }
  }

  return defineGraph(registry, {
    id: "library-mystery-bench",
    nodes: nodes as any,
    edges: edges as any,
  } as any)
}

/**
 * Programmatically generated graph of N nodes with configurable branching
 * factor and cycle density. Lets us see how cost scales with graph size —
 * the actual question for "do we need a bigger server."
 */
function buildSyntheticGraph(nodeCount: number, branchFactor: number, cycleChance: number) {
  const registry = new ProjectRegistry()
  registerBuiltins(registry)

  defineNodeType(registry, {
    id: "scene",
    properties: {},
    outgoingEdges: ["choice"],
  })
  defineEdgeType(registry, {
    id: "choice",
    properties: {},
    sourceTypes: ["scene"],
    targetTypes: ["scene"],
  })

  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    type: "scene",
  }))

  const edges: { id: string; source: string; target: string }[] = []
  let edgeIdx = 0
  for (let i = 0; i < nodeCount; i++) {
    for (let b = 0; b < branchFactor; b++) {
      // Forward edges (progress) vs back edges (cycles)
      const isCycle = Math.random() < cycleChance
      const target = isCycle
        ? Math.max(0, i - 1 - Math.floor(Math.random() * 5))
        : Math.min(nodeCount - 1, i + 1 + Math.floor(Math.random() * 3))
      edges.push({ id: `e${edgeIdx++}`, source: `n${i}`, target: `n${target}` })
    }
  }

  return defineGraph(registry, {
    id: `synthetic-${nodeCount}`,
    nodes: nodes as any,
    edges: edges as any,
  } as any)
}

// ---------------------------------------------------------------------------
// Runtimes
// ---------------------------------------------------------------------------

const libraryGraph = buildLibraryMysteryGraph()
const libraryRuntime = createRuntimeFromGraph(libraryGraph)
const libraryWorld = { entities: [], errors: [] } as any

const smallGraph = buildSyntheticGraph(50, 2, 0.2)
const smallRuntime = createRuntimeFromGraph(smallGraph)

const mediumGraph = buildSyntheticGraph(200, 3, 0.25)
const mediumRuntime = createRuntimeFromGraph(mediumGraph)

// ---------------------------------------------------------------------------
// Benchmarks
// ----------------------------------------------------------------===========

describe("enumeratePaths — complete exhaustion (realistic cap)", () => {
  // MAX_SAFE_INTEGER caused OOM on cyclic synthetic graphs — itself a finding:
  // the state space is unbounded without caps. We cap at 1M paths to measure
  // exhaustion-or-cap time without crashing the bench runner.
  bench(
    "library-mystery (23 nodes) to depth 30, cap 1M",
    () => {
 libraryRuntime.enumeratePaths(30, 1_000_000)
    },
    { iterations: 3, warmupIterations: 1 },
  )

  bench(
    "synthetic-50 (50 nodes, branch=2) to depth 30, cap 1M",
    () => {
      smallRuntime.enumeratePaths(30, 1_000_000)
    },
    { iterations: 3, warmupIterations: 1 },
  )

  bench(
    "synthetic-200 (200 nodes, branch=3) to depth 20, cap 1M",
    () => {
      mediumRuntime.enumeratePaths(20, 1_000_000)
    },
    { iterations: 3, warmupIterations: 1 },
  )
})

describe("enumeratePaths — capped throughput", () => {
  bench(
    "library-mystery depth=30 maxPaths=100k",
    () => {
      libraryRuntime.enumeratePaths(30, 100_000)
    },
    { iterations: 5, warmupIterations: 2 },
  )

  bench(
    "synthetic-200 depth=30 maxPaths=100k",
    () => {
      mediumRuntime.enumeratePaths(30, 100_000)
    },
    { iterations: 5, warmupIterations: 2 },
  )
})

describe("solveGraphSemantics — the CI validate workload", () => {
  bench(
    "library-mystery (default maxSteps=100)",
    () => {
      solveGraphSemantics(libraryRuntime, libraryWorld, { maxSteps: 100 })
    },
    { iterations: 10, warmupIterations: 3 },
  )

  bench(
    "library-mystery (maxSteps=10000 — realistic CI bound)",
    () => {
      solveGraphSemantics(libraryRuntime, libraryWorld, { maxSteps: 10_000 })
    },
    { iterations: 5, warmupIterations: 2 },
  )
})

describe("step() — the per-request server hot path", () => {
  // This is what literature-rpg's /intent endpoint does per user action:
  // create state, get available transitions, step through one, with derived
  // entity context. Measures the real per-request cost, not a tight loop.
  bench(
    "single step with derived-state context (library-mystery)",
    () => {
      const state = createInitialState(libraryRuntime.startNodeId)
      const context = { derivedState: deriveEntityState(libraryWorld, state) }
      const available = libraryRuntime.getAvailable(state, context)
      if (available.length > 0) {
        libraryRuntime.step(state, available[0], context)
      }
    },
    { iterations: 1000, warmupIterations: 100 },
  )

  bench(
    "getAvailable only (availability scan cost, isolated)",
    () => {
      const state = (function () {
        let s = createInitialState(libraryRuntime.startNodeId)
        const avail = libraryRuntime.getAvailable(s)
        if (avail.length > 0) s = libraryRuntime.step(s, avail[0]).state ?? s
        return s
      })()
      libraryRuntime.getAvailable(state)
    },
    { iterations: 1000, warmupIterations: 100 },
  )
})
