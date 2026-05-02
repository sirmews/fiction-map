# Fiction Map — Quick Reference

---

## Core Concepts

| Concept | What It Is | Encore Equivalent |
|---------|-----------|-------------------|
| **Node Type** | Kind of node (Scene, Task, State) | Service |
| **Edge Type** | Kind of connection (Choice, Flow) | API Call |
| **Condition** | Can we traverse? | Middleware (guard) |
| **Effect** | What happens on traverse | Middleware (transform) |
| **Graph** | A concrete instance | Application |
| **State** | Runtime data | Database |
| **Trace** | Execution history | Request trace |

---

## File Conventions

```
nodes/*.node.ts        → Node types
edges/*.edge.ts        → Edge types
conditions/*.condition.ts → Conditions
effects/*.effect.ts    → Effects
graphs/*.graph.ts      → Graph instances
state/*.state.ts       → State schemas
```

---

## API Reference

### defineNodeType

```typescript
defineNodeType({
  id: string,                    // Unique identifier
  properties: {                  // Property schema
    [name: string]: {
      type: string,              // "string" | "number" | "boolean" | etc.
      required?: boolean,
      default?: any,
    }
  },
  outgoingEdges: string[],       // Allowed outgoing edge types
  incomingEdges: string[],       // Allowed incoming edge types
})
```

### defineEdgeType

```typescript
defineEdgeType({
  id: string,                    // Unique identifier
  properties: { ... },           // Property schema
  sourceTypes: string[],         // Allowed source node types
  targetTypes: string[],         // Allowed target node types
})
```

### defineCondition

```typescript
defineCondition({
  id: string,                    // Unique identifier
  parameters: { ... },           // Parameter schema
  evaluate: (state, params) => boolean,  // Evaluation function
})
```

### defineEffect

```typescript
defineEffect({
  id: string,                    // Unique identifier
  parameters: { ... },           // Parameter schema
  apply: (state, params) => state,  // State transformer
})
```

### defineGraph

```typescript
defineGraph({
  id: string,                    // Unique identifier
  nodes: Node[],                 // Array of nodes
  edges: Edge[],                 // Array of edges
})
```

---

## CLI Commands

```bash
# Generate metadata
fiction-map generate

# Start dev mode
fiction-map dev

# Build for production
fiction-map build

# Run graph
fiction-map run <graph-id>
```

---

## Dashboard Tabs

| Tab | Purpose |
|-----|---------|
| **Graph** | Visualize graph structure |
| **Catalog** | Browse types (nodes, edges, conditions, effects) |
| **Validate** | See errors and warnings |
| **Playtest** | Interactively traverse graph |
| **Traces** | View traversal history |

---

## Metadata Schema

```typescript
interface GraphMetadata {
  nodeTypes: NodeTypeDefinition[]
  edgeTypes: EdgeTypeDefinition[]
  conditions: ConditionDefinition[]
  effects: EffectDefinition[]
  graphs: GraphDefinition[]
  validation: ValidationResult[]
}

interface NodeTypeDefinition {
  id: string
  location: SourceLocation
  properties: PropertySchema
  outgoingEdges: string[]
  incomingEdges: string[]
  usageCount: number
}

interface EdgeTypeDefinition {
  id: string
  location: SourceLocation
  properties: PropertySchema
  sourceTypes: string[]
  targetTypes: string[]
  usageCount: number
}
```

---

## Runtime API

```typescript
// Create runtime
const runtime = new GraphRuntime(graph)

// Start at node
runtime.start(nodeId)

// Get available edges
const edges = runtime.getAvailableEdges()

// Traverse an edge
runtime.traverse(edgeId)

// Get current state
console.log(runtime.state)

// Get trace
console.log(runtime.trace)
```

---

## Example: Complete Story

```typescript
// nodes/scene.node.ts
import { defineNodeType } from "@fiction-map/core"

export const SceneNode = defineNodeType({
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
    isEnding: { type: "boolean", default: false },
  },
  outgoingEdges: ["choice"],
  incomingEdges: ["choice"],
})
```

```typescript
// edges/choice.edge.ts
import { defineEdgeType } from "@fiction-map/core"

export const ChoiceEdge = defineEdgeType({
  id: "choice",
  properties: {
    text: { type: "string", required: true },
    conditions: { type: "condition[]" },
    effects: { type: "effect[]" },
  },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})
```

```typescript
// conditions/has-item.condition.ts
import { defineCondition } from "@fiction-map/core"

export const HasItemCondition = defineCondition({
  id: "has-item",
  parameters: {
    itemId: { type: "string", required: true },
  },
  evaluate: (state, params) => state.inventory.has(params.itemId),
})
```

```typescript
// effects/give-item.effect.ts
import { defineEffect } from "@fiction-map/core"

export const GiveItemEffect = defineEffect({
  id: "give-item",
  parameters: {
    itemId: { type: "string", required: true },
    quantity: { type: "number", default: 1 },
  },
  apply: (state, params) => {
    state.inventory.add(params.itemId, params.quantity)
    return state
  },
})
```

```typescript
// graphs/my-story.graph.ts
import { defineGraph } from "@fiction-map/core"

export const myStory = defineGraph({
  id: "my-story",
  nodes: [
    { id: "start", type: "scene", title: "The Beginning", content: "..." },
    { id: "forest", type: "scene", title: "The Forest", content: "..." },
    { id: "ending", type: "scene", title: "The End", isEnding: true },
  ],
  edges: [
    { 
      id: "c1", 
      type: "choice", 
      source: "start", 
      target: "forest",
      text: "Enter the forest",
      conditions: [{ type: "has-item", itemId: "sword" }],
    },
    { 
      id: "c2", 
      type: "choice", 
      source: "forest", 
      target: "ending",
      text: "Continue",
      effects: [{ type: "give-item", itemId: "gold", quantity: 10 }],
    },
  ],
})
```

---

## Use Cases

| Use Case | Node Types | Edge Types | State |
|----------|------------|------------|-------|
| **Stories** | Scene | Choice | inventory, stats, flags |
| **Workflows** | Task, Decision | Flow | assignees, status |
| **Dialogue** | Dialogue | Response | relationship, mood |
| **State Machines** | State | Transition | current, history |
| **Decision Trees** | Question, Outcome | Answer | answers |

---

## Comparison: TaleWeaver vs Fiction Map

| Aspect | TaleWeaver | Fiction Map |
|--------|------------|-------------|
| **Domain** | Stories only | Multiple (stories, workflows, etc.) |
| **Node Types** | Hard-coded (Scene) | User-defined |
| **Edge Types** | Hard-coded (Choice) | User-defined |
| **Conditions** | Hard-coded | User-defined |
| **Effects** | Hard-coded | User-defined |
| **Visualization** | Custom editor | Dashboard + file conventions |
| **Development** | Manual wiring | Generate from code |
