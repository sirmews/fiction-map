# @fiction-map/core

Define graph-based systems in code.

## Installation

```bash
npm install @fiction-map/core
```

## Quick Start

```typescript
import {
  ProjectRegistry,
  defineNodeType,
  defineEdgeType,
  defineGraph,
} from "@fiction-map/core"

// Create a registry. One registry per project / workspace / namespace.
const registry = new ProjectRegistry()

// Define a node type
const SceneNode = defineNodeType(registry, {
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
  },
  outgoingEdges: ["choice"],
  incomingEdges: ["choice"],
})

// Define an edge type
const ChoiceEdge = defineEdgeType(registry, {
  id: "choice",
  properties: {
    text: { type: "string", required: true },
  },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})

// Define a graph
const story = defineGraph(registry, {
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

## API

### `new ProjectRegistry()`

Holds all node types, edge types, conditions, effects, and graphs for a single project/workspace.

```typescript
const registry = new ProjectRegistry()
registry.clear() // optional — reset for hot-reload / test isolation
```

### `defineNodeType(registry, config)`

Define a reusable node type.

```typescript
defineNodeType(registry, {
  id: string                   // Unique identifier within the registry
  properties?: { ... }         // Property schema
  outgoingEdges?: string[]     // Allowed outgoing edge types
  incomingEdges?: string[]     // Allowed incoming edge types
})
```

### `defineEdgeType(registry, config)`

Define a reusable edge type.

```typescript
defineEdgeType(registry, {
  id: string                   // Unique identifier within the registry
  properties?: { ... }         // Property schema
  sourceTypes: string[]        // Allowed source node types
  targetTypes: string[]        // Allowed target node types
})
```

### `defineCondition(registry, config)`

Define a condition that gates edge traversal.

```typescript
defineCondition(registry, {
  id: string                   // Unique identifier within the registry
  parameters?: { ... }         // Parameter schema
})
```

### `defineEffect(registry, config)`

Define an effect that applies on traversal.

```typescript
defineEffect(registry, {
  id: string                   // Unique identifier within the registry
  parameters?: { ... }         // Parameter schema
})
```

### `defineGraph(registry, config)`

Define a graph instance. The graph is validated against the node/edge/condition/effect types already registered on the same registry.

```typescript
defineGraph(registry, {
  id: string                   // Unique identifier within the registry
  nodes: NodeInstance[]        // Array of nodes
  edges: EdgeInstance[]        // Array of edges
})
```

Metadata extraction for tooling/CI is provided by the `fiction-map` CLI (see [`@fiction-map/cli`](../cli)). The core package no longer exposes a top-level `generateMetadata` function — drive generation through the CLI or, for advanced cases, iterate `registry.nodeTypes`, `registry.edgeTypes`, etc. directly.

## Validation

The `defineGraph` function validates:

- ✅ Node types exist on the registry
- ✅ Edge types exist on the registry
- ✅ Source nodes exist
- ✅ Target nodes exist
- ✅ Edge type constraints (sourceTypes, targetTypes)
- ✅ Conditions and effects referenced on edges exist on the registry
- ⚠️ Unreachable nodes
- ⚠️ Missing endings

## License

MIT
