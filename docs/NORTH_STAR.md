# Fiction Map — North Star

---

## What We're Building

**Fiction Map is a framework for building node-based systems.**

It applies Encore's "infrastructure from code" approach to graphs:
- Define graph primitives in code
- Static analysis extracts structure
- Dashboard visualizes the graph
- Runtime executes traversals

---

## The Problem

TaleWeaver retrofitted graph concepts onto a story engine. It was confusing.

## The Solution

Start with graphs as the primary artifact. Stories, workflows, games, decision trees — they're all graphs.

---

## The Delivery

### What the Developer Writes

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

### What the Developer Gets

```bash
$ fiction-map dev

✓ Discovered 1 node type, 1 edge type
✓ Parsed 1 graph with 2 nodes, 1 edge
✓ No validation errors

→ Dashboard running at http://localhost:9400
```

**Dashboard shows:**
- Graph visualization
- Node/edge catalog
- Validation status
- Playtest mode
- Traces

**Developer clicks a node:**
- Opens their editor at the exact line

---

## The Three Products

### 1. Core Framework

**What:** TypeScript packages for defining graphs

**Packages:**
- `@fiction-map/core` — defineNodeType, defineEdgeType, defineCondition, defineEffect
- `@fiction-map/runtime` — GraphRuntime, traversal, state management, traces

**Delivery:** npm packages

**User:** Developer building a graph-based system

---

### 2. Development Tools

**What:** CLI + daemon + dashboard

**Commands:**
- `fiction-map generate` — Extract metadata from code
- `fiction-map dev` — Start dashboard with hot reload
- `fiction-map build` — Bundle for production
- `fiction-map validate` — Check for errors

**Delivery:** CLI tool (npm global or npx)

**User:** Developer during development

---

### 3. Visualization Components

**What:** React components for graph visualization

**Packages:**
- `@fiction-map/graph-canvas` — Interactive graph view
- `@fiction-map/trace-viewer` — Execution trace visualization
- `@fiction-map/playtest` — Interactive playtest UI

**Delivery:** npm packages

**User:** Developer building a custom editor

---

## Success Criteria

### The Developer Experience

1. **Write code** — Define types and graphs in TypeScript
2. **Run `fiction-map dev`** — Dashboard opens
3. **See the graph** — Visual representation of structure
4. **Find errors** — Invalid connections highlighted
5. **Click to code** — Opens editor at definition
6. **Playtest** — Traverse the graph interactively
7. **See traces** — Understand what happened
8. **Build** — Produce standalone bundle

### The "Aha" Moment

Developer thinks: *"I defined my graph in code, and Fiction Map understood it, visualized it, and runs it."*

Like Encore's: *"I defined my backend in code, and Encore provisioned everything."*

---

## Delivery Milestones

### Milestone 1: Core Types (Week 1-2) ✅ COMPLETE

- [x] Design metadata schema
- [x] Implement `defineNodeType`
- [x] Implement `defineEdgeType`
- [x] Implement `defineCondition`
- [x] Implement `defineEffect`
- [x] Implement `defineGraph`
- [x] Basic validation

**Deliverable:** `@fiction-map/core` package

---

### Milestone 2: Generator (Week 3-4) ✅ COMPLETE

- [x] File discovery (`*.node.ts`, `*.edge.ts`, etc.)
- [x] Metadata extraction
- [x] `metadata.json` generation
- [x] Graph extraction
- [x] SEMANTICS.md generation

**Deliverable:** `@fiction-map/cli` package with `generate` command

---

### Milestone 3: Runtime (Week 5-6) ✅ COMPLETE

- [x] State management
- [x] Condition evaluation
- [x] Effect application
- [x] Transition engine
- [x] Graph validation
- [x] Built-in evaluators and handlers

**Deliverable:** `@fiction-map/runtime` package

---

### Milestone 3.5: Visualization (Week 6) ✅ COMPLETE

- [x] React Flow components
- [x] Auto-layout algorithm
- [x] Node/edge primitives
- [x] Validation hooks

**Deliverable:** `@fiction-map/visualize` package

---

### Milestone 4: Dashboard (Week 7-10)

- [ ] Daemon architecture
- [ ] WebSocket server
- [ ] React dashboard
- [ ] Graph visualization (React Flow)
- [ ] Catalog view
- [ ] Validation view
- [ ] Playtest view
- [ ] Trace viewer
- [ ] Click-to-code

**Deliverable:** `fiction-map dev` command

---

### Milestone 5: Polish (Week 11-12)

- [ ] Error messages
- [ ] Documentation
- [ ] Examples (story, workflow, game)
- [ ] Testing
- [ ] Performance

**Deliverable:** v1.0.0 release

---

## What We're NOT Building (Yet)

- Visual graph editor (drag-and-drop)
- Cloud hosting
- Collaboration features
- Mobile support
- Custom themes

---

## The One-Liner

**Fiction Map lets you define graph-based systems in code, then visualizes and runs them automatically.**

---

## How We'll Know We Succeeded

1. **A story author** defines SceneNode and ChoiceEdge, runs `fiction-map dev`, sees their story visualized, playtests it, finds a broken path, fixes it.

2. **A workflow designer** defines TaskNode and FlowEdge, runs `fiction-map dev`, sees their workflow, validates it, builds it into a standalone runner.

3. **A game developer** defines StateNode and TransitionEdge, runs `fiction-map dev`, sees their state machine, playtests it, integrates runtime into their game.

---

## The Commitment

**Graph is the primary artifact.**

Everything flows from this:
- File conventions discover graph primitives
- Metadata describes graph structure
- Dashboard visualizes the graph
- Runtime traverses the graph
- Traces explain graph execution

Not: "Add graphs to your app"
But: "Your app IS a graph"
