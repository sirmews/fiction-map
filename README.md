# Fiction Map

**A framework for building graph-based engines, not end-user apps.**

Fiction Map provides the headless packages and tooling that consumer apps use to define,
validate, and execute graph-based systems.

---

## What It Does

Fiction Map focuses on the engine layer:

- `@fiction-map/core` provides the abstractions for defining node types, edge types,
  conditions, effects, and graph shapes.
- `@fiction-map/entities` optionally provides a generic world/entity meta-model for
  consumer-defined concepts like species, stats, traits, items, and locations.
- `@fiction-map/runtime` provides traversal, simulation, and runtime validation.
- `fiction-map` CLI provides metadata and semantics generation for tooling, CI, and AI use.

Consumer apps own their own schemas and UI:

- app-specific node and edge definitions
- editor UX, forms, canvas, panels, and routing
- persistence, auth, autosave, and product behavior

```typescript
// You write this:
export const SceneNode = defineNodeType({
  id: "scene",
  properties: { title: "string", content: "richtext" },
})

export const ChoiceEdge = defineEdgeType({
  id: "choice",
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})

export const story = defineGraph({
  nodes: [...],
  edges: [...],
})
```

```bash
# Run this:
$ fiction-map generate

# Get this:
✓ .fiction-map/metadata.json  — structured graph data
✓ SEMANTICS.md                — LLM-friendly semantic summary
```

---

## Packages

| Package | Purpose |
|---------|---------|
| [`@fiction-map/core`](packages/core) | Define node types, edge types, conditions, effects |
| [`@fiction-map/entities`](packages/entities) | Define generic entity types, instances, typed references, and declarative world rules |
| [`@fiction-map/runtime`](packages/story-runtime) | Execute graphs, manage state, validate traversals |
| [`fiction-map`](packages/cli) | CLI — discover files, extract metadata, generate output |

---

## Boundary

Fiction Map is the engine/framework.

A consumer app, whether it lives in a separate repo or in the same monorepo, is responsible
for defining its own concrete schemas and building its own UI on top of these packages.

That means:

- `@fiction-map/core` does not hardcode story-specific schemas like `SceneNode` or `ChoiceEdge`
- `@fiction-map/entities` does not hardcode world-specific schemas like `Species`, `Stat`, or `Item`
- the consumer app defines those schemas using the abstractions from `core`
- the consumer app defines world concepts using the abstractions from `entities`
- the consumer app can use any UI stack, including ShadCN, Vite, React, or another frontend
- the runtime and CLI remain UI-agnostic

---

## Quick Start

```bash
# Install
npm install @fiction-map/core @fiction-map/entities @fiction-map/runtime

# Define app-specific types in your consumer app
import { defineNodeType, defineEdgeType, defineGraph } from "@fiction-map/core"

const SceneNode = defineNodeType({
  id: "scene",
  properties: { title: { type: "string", required: true } },
  outgoingEdges: ["choice"],
})

const ChoiceEdge = defineEdgeType({
  id: "choice",
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})

const story = defineGraph({
  id: "my-story",
  nodes: [
    { id: "start", type: "scene", title: "Beginning" },
    { id: "end", type: "scene", title: "Ending" },
  ],
  edges: [
    { id: "c1", type: "choice", source: "start", target: "end" },
  ],
})
```

---

## Documentation

- [North Star](docs/NORTH_STAR.md) — The vision and delivery plan
- [Headless Engine Decision](docs/decisions/2026-05-16-headless-engine-direction.md) — The
  accepted boundary between Fiction Map and consumer apps
- [Literature RPG Gap Analysis](docs/plans/2026-05-16-literature-rpg-gap-analysis.md) — What a
  literature-RPG-style consumer app can already do, what is awkward, and what the engine still
  needs
- [Block Editor Research](docs/design/block-editor-research.md) — Research notes on how
  consumer apps should sit on top of a headless engine

---

## Inspiration

Fiction Map applies [Encore's](https://encore.dev) "infrastructure from code" approach to graphs:

- Encore: Define backend in code → Get dashboard, deployment, tracing
- Fiction Map: Define graphs in code → Get structured metadata, validation, execution

---

## Status

| Milestone | Status | Description |
|-----------|--------|-------------|
| **Core Types** | ✅ Complete | `@fiction-map/core` package |
| **Entity Meta-Model** | 🚧 Initial Slice | `@fiction-map/entities` — entity types, instances, references, validation |
| **Generator** | ✅ Complete | `fiction-map` CLI — file discovery, metadata extraction |
| **Runtime** | ✅ Complete | `@fiction-map/runtime` — state, transitions, validation, path enumeration |

---

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bun typecheck

# Build all packages
bun run build
```

---

## License

MIT
