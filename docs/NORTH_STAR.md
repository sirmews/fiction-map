# Fiction Map — North Star

---

## What We're Building

**Fiction Map is a framework for building node-based systems.**

It applies Encore's "infrastructure from code" approach to graphs:
- Define graph primitives in code
- Static analysis extracts structure
- Metadata feeds agents, CI, and runtimes
- Runtime executes traversals with full traceability

The key boundary is:

- Fiction Map owns the engine/framework layer
- Consumer apps own concrete schemas and end-user UI

Consumer apps may live in a separate repo or in the same monorepo, but they are not part of
the package contract of Fiction Map itself.

The accepted decision record for this boundary is:

- [Headless Engine Direction](decisions/2026-05-16-headless-engine-direction.md)
- [Literature RPG Active Plan](plans/literature-rpg/04-continued-work-plan.md)
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
// nodes/scene.node.ts
export const SceneNode = defineNodeType({
  id: "scene",
  properties: { title: "string", content: "richtext" },
  outgoingEdges: ["choice"],
})

// edges/choice.edge.ts
export const ChoiceEdge = defineEdgeType({
  id: "choice",
  properties: { text: "string" },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})

// graphs/story.graph.ts
export const story = defineGraph({
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

### Milestone 3.5: Entity-Aware Runtime 🚧 IN PROGRESS

- [x] Generic runtime entity state
- [x] Derived state from `@fiction-map/entities` world definitions and runtime state
- [ ] Generic entity-aware built-in conditions
- [ ] Generic entity-aware built-in effects
- [ ] Story transition bridge for entity-aware requirements and consequences
- [ ] Cross-graph validation and explanation data for editor feedback

**Deliverable:** credible headless foundation for literature-RPG-style consumer apps

The source of truth for the active work sequence is:

- [Literature RPG Continued Work Plan](plans/literature-rpg/04-continued-work-plan.md)

---

### Milestone 4: Agent & CI Integration

- [ ] Git hooks (pre-commit metadata generation)
- [ ] CI validation action
- [ ] Better SEMANTICS.md format for LLM consumption
- [ ] `fiction-map validate` standalone command
- [ ] MCP server (optional, for assisted coding)

**Deliverable:** production-grade metadata pipeline

---

### Milestone 5: Polish

- [ ] Error messages
- [ ] Documentation
- [ ] Examples (story, workflow, game)
- [ ] Testing
- [ ] Performance

**Deliverable:** v1.0.0 release

---

## What We're NOT Building (Yet)

- A built-in Story Editor UI inside the Fiction Map packages
- ShadCN components or product-specific editor shells in the package surface
- Cloud hosting
- Collaboration features
- Product-specific drag-and-drop graph editing

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
