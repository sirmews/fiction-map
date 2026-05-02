# @fiction-map/core

Define graph-based systems in code.

## Installation

```bash
npm install @fiction-map/core
```

## Quick Start

```typescript
import { defineNodeType, defineEdgeType, defineGraph } from "@fiction-map/core"

// Define a node type
const SceneNode = defineNodeType({
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
  },
  outgoingEdges: ["choice"],
  incomingEdges: ["choice"],
})

// Define an edge type
const ChoiceEdge = defineEdgeType({
  id: "choice",
  properties: {
    text: { type: "string", required: true },
  },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})

// Define a graph
const story = defineGraph({
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

### `defineNodeType(config)`

Define a reusable node type.

```typescript
defineNodeType({
  id: string                   // Unique identifier
  properties?: { ... }         // Property schema
  outgoingEdges?: string[]     // Allowed outgoing edge types
  incomingEdges?: string[]     // Allowed incoming edge types
})
```

### `defineEdgeType(config)`

Define a reusable edge type.

```typescript
defineEdgeType({
  id: string                   // Unique identifier
  properties?: { ... }         // Property schema
  sourceTypes: string[]        // Allowed source node types
  targetTypes: string[]        // Allowed target node types
})
```

### `defineCondition(config)`

Define a condition that gates edge traversal.

```typescript
defineCondition({
  id: string                   // Unique identifier
  parameters?: { ... }         // Parameter schema
})
```

### `defineEffect(config)`

Define an effect that applies on traversal.

```typescript
defineEffect({
  id: string                   // Unique identifier
  parameters?: { ... }         // Parameter schema
})
```

### `defineGraph(config)`

Define a graph instance.

```typescript
defineGraph({
  id: string                   // Unique identifier
  nodes: NodeInstance[]        // Array of nodes
  edges: EdgeInstance[]        // Array of edges
})
```

### `generateMetadata()`

Generate metadata for all registered types.

```typescript
const metadata = generateMetadata()
// { nodeTypes, edgeTypes, conditions, effects, graphs, validation }
```

## Validation

The `defineGraph` function validates:

- ✅ Node types exist
- ✅ Edge types exist
- ✅ Source nodes exist
- ✅ Target nodes exist
- ✅ Edge type constraints (sourceTypes, targetTypes)
- ⚠️ Unreachable nodes
- ⚠️ Missing endings

## License

MIT
