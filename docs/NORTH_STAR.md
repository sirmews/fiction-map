# Fiction Map — North Star

---

## What We're Building

**Fiction Map is a framework for building node-based systems.**

It applies Encore's "infrastructure from code" approach to graphs:
- Define graph primitives in code
- Static analysis extracts structure
- Metadata feeds agents, CI, and runtimes
- Runtime executes traversals with full traceability

The principle underneath is **a single source of truth plus machine-readable, agent-legible
artifacts** — generation is a means, applied per the decision rule in
[ADR 2026-06-20: LLM-Friendly Artifact Strategy](decisions/2026-06-20-llm-friendly-artifact-strategy.md)
(generate for authored content or cross-language contracts; annotate + test stable single-language
types).

The key boundary is:

- Fiction Map owns the engine/framework layer
- Consumer apps own concrete schemas and end-user UI

Consumer apps may live in a separate repo or in the same monorepo, but they are not part of
the package contract of Fiction Map itself.

The accepted decision record for this boundary is:

- [Headless Engine Direction](decisions/2026-05-16-headless-engine-direction.md)
- [Literature RPG Active Plan](plans/literature-rpg/05-consumer-app-readiness-plan.md)
- [Literature RPG Gap Analysis](plans/2026-05-16-literature-rpg-gap-analysis.md) as background

---

## The Problem

TaleWeaver retrofitted graph concepts onto a story engine. It was confusing.

## The Solution

Start with graphs as the primary artifact. Stories, workflows, games, decision trees — they're all graphs.

Fiction Map should make it easier for another app to build and operate those graphs, not try to
be the app itself.

---

## The Delivery

### What the Consumer App Writes

```typescript
// project.ts
import { ProjectRegistry } from "@fiction-map/core"
export const registry = new ProjectRegistry()

// nodes/scene.node.ts
import { defineNodeType } from "@fiction-map/core"
import { registry } from "../project"

export const SceneNode = defineNodeType(registry, {
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
  },
  outgoingEdges: ["choice"],
})

// edges/choice.edge.ts
import { defineEdgeType } from "@fiction-map/core"
import { registry } from "../project"

export const ChoiceEdge = defineEdgeType(registry, {
  id: "choice",
  properties: { text: { type: "string", required: true } },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})

// graphs/story.graph.ts
import { defineGraph } from "@fiction-map/core"
import { registry } from "../project"

export const story = defineGraph(registry, {
  id: "my-story",
  nodes: [
    { id: "start", type: "scene", title: "Beginning" },
    { id: "end", type: "scene", title: "Ending" },
  ],
  edges: [
    { id: "c1", type: "choice", source: "start", target: "end", text: "Continue" },
  ],
})
```

These are app-specific definitions. `SceneNode`, `ChoiceEdge`, and the story graph belong to the
consumer app, not to `@fiction-map/core`.

### What Agents, CI, and Runtimes Get

```bash
$ fiction-map generate

✓ Discovered 1 node type, 1 edge type
✓ Parsed 1 graph with 2 nodes, 1 edge
✓ No validation errors

→ .fiction-map/metadata.json  — structured graph data
→ SEMANTICS.md                — LLM-friendly semantic summary
```

**An agent or CI pipeline can:**
- Read `metadata.json` for structured graph data
- Parse `SEMANTICS.md` for LLM-friendly context
- Run `GraphRuntime` to simulate traversals and find bugs
- Validate that every path is solvable in CI

**`fiction-map generate` hooks into:**
- Pre-commit hooks (re-generate on `*.node.ts` changes)
- CI checks (fail on validation errors)
- AI coding assistants (read metadata for context)

---

## The Products

### 1. Core Framework

**What:** TypeScript packages for defining graphs

**Packages:**
- `@fiction-map/core` — defineNodeType, defineEdgeType, defineCondition, defineEffect
- `@fiction-map/entities` — optional generic entity meta-model for consumer-defined world concepts
- `@fiction-map/runtime` — `GraphRuntime` class, traversal, validation, path enumeration

**Delivery:** npm packages

**User:** Developer building a graph-based system or a consumer app on top of Fiction Map

### 2. CLI

**What:** Metadata extraction and generation

**Command:**
- `fiction-map generate` — Discover files, extract metadata, write structured output

**Delivery:** CLI tool (npm global or npx)

**User:** Developers, CI pipelines, AI agents

### 3. Consumer App Boundary

**What:** The end-user story editor or product built on top of Fiction Map

**Owns:**
- concrete story schemas such as `SceneNode`, `ChoiceEdge`, and domain conditions/effects
- editor UI, ShadCN components, routing, panels, canvas, and forms
- persistence, auth, autosave, and product workflows

**Does not belong inside the Fiction Map package surface**

---

## Success Criteria

### The Workflow

1. **Define app-specific graph schemas** — Consumer app uses `@fiction-map/core`
2. **Run `fiction-map generate`** — Structured metadata produced
3. **Read metadata.json** — Agents understand graph structure
4. **Validate** — Invalid connections flagged in CI
5. **Simulate** — `GraphRuntime.walk()` or `.enumeratePaths()` in tests
6. **Commit** — Pre-commit hook re-generates metadata
7. **PR checks** — CI validates graph integrity

### The "Aha" Moment

Developer thinks: *"My app defined its graph model, and Fiction Map extracted it, validated it, and an AI assistant can reason about it."*

Like Encore's: *"I defined my backend in code, and Encore understood my infrastructure."*

---

## Delivery Milestones

### Milestone 1: Core Types ✅ COMPLETE

- [x] Design metadata schema
- [x] Implement `defineNodeType`, `defineEdgeType`
- [x] Implement `defineCondition`, `defineEffect`
- [x] Implement `defineGraph`
- [x] Basic validation

**Deliverable:** `@fiction-map/core` package

---

### Milestone 2: Generator ✅ COMPLETE

- [x] File discovery (`*.node.ts`, `*.edge.ts`, etc.)
- [x] Metadata extraction
- [x] `metadata.json` generation
- [x] Graph extraction
- [x] SEMANTICS.md generation

**Deliverable:** `fiction-map generate` command

---

### Milestone 3: Runtime Foundation ✅ COMPLETE

- [x] State management
- [x] Condition evaluation
- [x] Effect application
- [x] Transition engine
- [x] Graph validation (static + dynamic)
- [x] Built-in evaluators and handlers
- [x] `GraphRuntime` class with walk + path enumeration
- [x] Adapter for loading graphs from plain JSON

**Deliverable:** `@fiction-map/runtime` package

---

### Milestone 3.5: Entity-Aware Runtime ✅ FOUNDATION COMPLETE

- [x] Generic runtime entity state
- [x] Derived state from `@fiction-map/entities` world definitions and runtime state
- [x] Generic entity-aware built-in conditions
- [x] Generic entity-aware built-in effects
- [x] Story transition bridge for entity-aware requirements and consequences
- [x] Cross-graph validation and explanation data for editor feedback
- [x] Literature-RPG-style example and end-to-end tests

**Deliverable:** credible headless foundation for literature-RPG-style consumer apps

---

### Milestone 3.6: Consumer-App Readiness ✅ COMPLETE

- [x] Public API audit ([docs/public-api-audit.md](public-api-audit.md))
- [x] Consumer usage guide ([docs/consumer-usage-guide.md](consumer-usage-guide.md))
- [x] Example placement decision ([docs/decisions/2026-05-18-example-placement-policy.md](decisions/2026-05-18-example-placement-policy.md))
- [x] Derived unlock semantics decision ([docs/decisions/2026-05-18-derived-unlock-semantics.md](decisions/2026-05-18-derived-unlock-semantics.md))
- [x] Replace global singletons with `ProjectRegistry` and `EntityRegistry`
- [x] Seamless derived-state evaluation via `{ derivedState }` evaluation context
- [x] Prune internal adapter exports from the public surface
- [x] Self-documentation via TypeDoc generation ([docs/api/](api/))

**Deliverable:** stable, documented package contract a separate Story Editor can consume

The completed plan is:

- [Literature RPG Consumer-App Readiness Plan](plans/literature-rpg/05-consumer-app-readiness-plan.md)

---

### Milestone 3.7: Real Consumer Proof + API Hardening 🚧 REQUIRED BEFORE ANY FURTHER WORK

**This milestone is a hard gate. No work on Milestone 4 or 5 begins until every box below is checked.** The framework has 105 passing tests but no real consumer. Every architectural claim past this point is speculative until a separate app exercises the public API. Two independent reviews (Gemini CLI + opencode, see [docs/2026-05-20-progress-vs-canonical-docs.md](2026-05-20-progress-vs-canonical-docs.md)) converged on the same gaps; they are listed here as the entry criteria for the rest of the roadmap.

**3.7.a Reference consumer app exists outside the framework's own tests**

- [x] Create a sibling consumer app at [apps/literature-rpg/](../apps/literature-rpg/) using only the published package surface
- [x] Layout follows the "What the Consumer App Writes" snippet at the top of this document: `project.ts`, `nodes/*.node.ts`, `edges/*.edge.ts`, `graphs/*.graph.ts`
- [x] One runnable graph + `fiction-map generate` + runtime traversal via the public `GraphRuntime` API (no UI)
- [x] Friction captured in [apps/literature-rpg/NOTES.md](../apps/literature-rpg/NOTES.md) as Milestone 5 polish items

**3.7.b Close the three coupling/leak issues both reviewers caught**

- [x] `GraphRuntime` constructor no longer leaks `GraphBlueprint` from the adapter — `GraphBlueprint`, `NodeBlueprint`, `EdgeBlueprint` re-exported from `@fiction-map/runtime`'s public surface
- [x] `packages/runtime/src/conditions/builtin.ts` and `effects/builtin.ts` no longer import from `../core/state`; entity-aware evaluators/handlers moved to `entities/condition-evaluators.ts` and `entities/effect-handlers.ts`; default-bindings composition lives in [packages/runtime/src/default-bindings.ts](../packages/runtime/src/default-bindings.ts)
- [x] Legacy `GraphState` / `TraversalResult` already removed from [packages/core/src/types.ts](../packages/core/src/types.ts) (the public-api-audit reference was stale; verified via repo-wide search returning zero matches)

**3.7.c Persistence contract decided and documented**

- [x] `SerializableState` / `SerializableEntityState` shape pinned with new `schemaVersion: 1` field; emitted by `serializeState`; rejected with a descriptive error by `deserializeState` on unknown versions
- [x] State-migration story documented as consumer-owned (framework provides version constant + types + recipe). See [docs/decisions/2026-05-20-persistence-contract.md](decisions/2026-05-20-persistence-contract.md)
- [x] `SERIALIZATION_SCHEMA_VERSION` exported from `@fiction-map/runtime` for consumer use

**3.7.d Documentation reflects reality**

- [x] Milestone 4 status updated below — `validate.ts` and `hooks.ts` boxes checked; remaining items honestly listed
- [x] Every milestone status reverified against `packages/` (M1–M3.6 confirmed complete; M4 is ~50%; M5 is 0%)
- [x] 2026-05-20 progress doc findings reconciled: leaky `GraphRuntime`, `builtin.ts` coupling, legacy types, and persistence contract resolved in 3.7.a–3.7.c; registry minimalism, performance, and tooling-monoculture concerns explicitly deferred (see "What We're NOT Building (Yet)")

**Deliverable:** the framework's public API has been pulled on by a real consumer, the known leaks are closed, and the docs no longer lie about the source tree. Only then does Milestone 4 begin.

---

### Milestone 4: Agent & CI Integration ✅ COMPLETE

Status verified against source tree on 2026-05-26.

- [x] Git hooks (pre-commit metadata generation) — [packages/cli/src/commands/hooks.ts](../packages/cli/src/commands/hooks.ts)
- [x] `fiction-map validate` standalone command — [packages/cli/src/commands/validate.ts](../packages/cli/src/commands/validate.ts)
- [x] CI validation action / template — [.github/workflows/fiction-map-validate.yml](../.github/workflows/fiction-map-validate.yml)
- [x] Read-oriented query subcommands (`fiction-map query nodes|edges|paths`, `fiction-map graph show`, `fiction-map explain`) over `metadata.json` — [packages/cli/src/commands/query.ts](../packages/cli/src/commands/query.ts)
- [x] Predefined `using-fiction-map` agent skill shipped with the CLI, pointing agents at the query commands and SEMANTICS.md — [packages/cli/skills/using-fiction-map/SKILL.md](../packages/cli/skills/using-fiction-map/SKILL.md)
- [x] Better SEMANTICS.md format for LLM consumption — graph topology now includes readable condition/effect summaries, and the evaluation pass is recorded in [docs/tasks/2026-05-26-semantics-llm-eval.md](tasks/2026-05-26-semantics-llm-eval.md)

**Deliverable:** production-grade metadata pipeline. No MCP server — see [docs/decisions/2026-05-20-no-mcp-server.md](decisions/2026-05-20-no-mcp-server.md).

---

### Milestone 5: Polish ✅ COMPLETE

- [x] Error messages (`RegistryError`, `RuntimeError` classes added, CLI output refined)
- [x] Documentation (`consumer-usage-guide.md` and codebase TSDocs updated)
- [x] Examples (story, workflow, game provided via `packages/runtime/src/examples/` and `apps/literature-rpg`)
- [x] Testing (Full suite passing, including end-to-end traversal scenarios)
- [x] Performance (Derived-state `walkWithContext` loop optimization added)

**Deliverable:** v1.0.0 release

---

## What We're NOT Building (Yet)

- A built-in Story Editor UI inside the Fiction Map packages
- ShadCN components or product-specific editor shells in the package surface
- Cloud hosting
- Collaboration features
- Product-specific drag-and-drop graph editing
- MCP server — superseded by CLI query subcommands + a predefined `using-fiction-map` agent skill. Revisit only if a real consumer hits a wall the CLI cannot solve. See [docs/decisions/2026-05-20-no-mcp-server.md](decisions/2026-05-20-no-mcp-server.md).
- Registry duplicate detection and lifecycle events — current `ProjectRegistry` / `EntityRegistry` are intentionally minimal `Map` wrappers. Revisit only if a real consumer collides on type IDs in practice.
- Performance work on `enumeratePaths` and `walk` — current implementations are correct but not cycle-pruned. Revisit when a consumer demonstrates a graph the runtime cannot handle.
- Tooling alternatives (non-Bun, non-Vitest) — all framework tooling assumes Bun + tsup + Vitest. Consumers may use whatever they like; the framework will not document Webpack/Jest/plain Node paths until a real consumer needs them.

---

## The One-Liner

**Fiction Map lets you define graph-based systems in code, extracts structured metadata, and validates them automatically.**

---

## How We'll Know We Succeeded

1. **A story editor app** defines SceneNode and ChoiceEdge, runs a pre-commit hook, and CI catches a broken path before it reaches staging.

2. **An AI assistant** reads `SEMANTICS.md` and correctly suggests graph edits without being told the schema.

3. **A CI pipeline** loads `metadata.json` into `GraphRuntime`, enumerates all paths, and fails the build if any path is unsolvable.

---

## The Commitment

**Graph is the primary artifact.**

Everything flows from this:
- File conventions discover graph primitives
- Metadata describes graph structure
- Runtime validates and traverses the graph
- Traces explain graph execution
- Agents consume metadata directly

The consumer app sits on top of this engine. It should not be conflated with the engine itself.

Not: "Add graphs to your app"
But: "Your app IS a graph"
