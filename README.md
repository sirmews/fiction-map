# Fiction Map

**A framework for building node-based systems.**

Define graphs in code. Get structured metadata, validation, and execution automatically.

---

## What It Does

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
| [`@fiction-map/runtime`](packages/story-runtime) | Execute graphs, manage state, validate traversals |
| [`fiction-map`](packages/cli) | CLI — discover files, extract metadata, generate output |

---

## Quick Start

```bash
# Install
npm install @fiction-map/core @fiction-map/runtime

# Define types
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
bun build
```

---

## License

MIT
