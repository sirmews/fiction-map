# Fiction Map

**A framework for building node-based systems.**

Define graphs in code. Get visualization, validation, and execution automatically.

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
$ fiction-map dev

# Get this:
✓ Dashboard at http://localhost:9400
✓ Graph visualization
✓ Validation
✓ Playtest mode
✓ Click-to-code
```

---

## Packages

| Package | Purpose |
|---------|---------|
| [`@fiction-map/core`](packages/core) | Define node types, edge types, conditions, effects |
| [`@fiction-map/runtime`](packages/story-runtime) | Execute graphs, manage state, collect traces |
| [`@fiction-map/visualize`](packages/visualize) | React Flow components for graph visualization |

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
- [Conceptual Guide](docs/design/conceptual-guide.md) — Deep dive into concepts
- [Simple Explanation](docs/design/simple-explanation.md) — Plain-English overview
- [Side-by-Side Examples](docs/design/side-by-side-examples.md) — Encore vs Fiction Map

---

## Inspiration

Fiction Map applies [Encore's](https://encore.dev) "infrastructure from code" approach to graphs:

- Encore: Define backend in code → Get dashboard, deployment, tracing
- Fiction Map: Define graphs in code → Get dashboard, validation, execution

---

## Status

| Milestone | Status | Description |
|-----------|--------|-------------|
| **Core Types** | ✅ Complete | `@fiction-map/core` package |
| **Generator** | ✅ Complete | `@fiction-map/cli` — file discovery, metadata extraction |
| **Runtime** | ✅ Complete | `@fiction-map/runtime` — state, transitions, validation |
| **Visualize** | ✅ Complete | `@fiction-map/visualize` — React Flow components |
| **Dashboard** | 🚧 Next | Daemon, WebSocket, playtest, click-to-code |
| **Editor** | 📋 Planned | Visual graph editor |

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
