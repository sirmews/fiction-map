# Fiction Map Vision — Encore for Graphs

> A multi-purpose framework for building node-based systems: stories, workflows, game engines, decision systems.

---

## The Vision

**Encore** lets you define backend infrastructure (services, APIs, databases) in code.

**Fiction Map** lets you define graph structures (nodes, edges, conditions, effects) in code.

Both provide:
- Declarative definitions in code
- Static analysis to extract metadata
- A dashboard to visualize the system
- A runtime to execute it

---

## Core Primitives

```
┌─────────────────────────────────────────────────────────────┐
│                       Graph Definition                       │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Node Types │  │  Edge Types │  │  Graph Instance     │  │
│  │             │  │             │  │                     │  │
│  │  • Scene    │  │  • Choice   │  │  • nodes: Node[]    │  │
│  │  • Action   │  │  • Trigger  │  │  • edges: Edge[]    │  │
│  │  • Decision │  │  • Flow     │  │  • conditions       │  │
│  │  • Task     │  │  • Next     │  │  • effects          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Behavior Layer                     │    │
│  │                                                      │    │
│  │  • Conditions — When can this edge be traversed?    │    │
│  │  • Effects    — What happens when traversed?        │    │
│  │  • Validators — Is this graph valid?                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## File Conventions

Like Encore discovers services from code, Fiction Map discovers graph primitives:

```
my-app/
├── app.graph.ts              # Graph instance definition
├── nodes/
│   ├── scene.node.ts         # Scene node type
│   ├── action.node.ts        # Action node type
│   ├── decision.node.ts      # Decision node type
│   └── task.node.ts          # Task node type
├── edges/
│   ├── choice.edge.ts        # Choice edge type
│   ├── trigger.edge.ts       # Trigger edge type
│   └── flow.edge.ts          # Flow edge type
├── conditions/
│   ├── has-item.condition.ts # Condition: does player have item?
│   ├── stat-gte.condition.ts # Condition: is stat >= value?
│   └── flag-set.condition.ts # Condition: is flag set?
└── effects/
    ├── give-item.effect.ts   # Effect: give item to player
    ├── modify-stat.effect.ts # Effect: modify a stat
    └── set-flag.effect.ts    # Effect: set a flag
```

---

## Example: Story Graph

```typescript
// nodes/scene.node.ts
import { defineNodeType } from "@fiction-map/core"

/**
 * @description A scene in the story
 * @ai-rule Scenes must have content or be marked as endings
 */
export const SceneNode = defineNodeType({
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext", required: false },
    isEnding: { type: "boolean", default: false },
  },
  // Which edge types can leave this node
  outgoingEdges: ["choice", "trigger"],
  // Which edge types can enter this node
  incomingEdges: ["choice", "trigger"],
})
```

```typescript
// edges/choice.edge.ts
import { defineEdgeType } from "@fiction-map/core"

/**
 * @description A choice the player can make
 * @ai-rule Choices must have display text
 */
export const ChoiceEdge = defineEdgeType({
  id: "choice",
  properties: {
    text: { type: "string", required: true },
    conditions: { type: "condition[]", required: false },
    effects: { type: "effect[]", required: false },
  },
  // Which node types can this edge connect?
  sourceTypes: ["scene"],
  targetTypes: ["scene", "action"],
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
  evaluate: (state, params) => {
    return state.inventory.has(params.itemId)
  },
})
```

```typescript
// app.graph.ts
import { defineGraph } from "@fiction-map/core"
import { SceneNode } from "./nodes/scene.node"
import { ChoiceEdge } from "./edges/choice.edge"

export const myStory = defineGraph({
  id: "my-story",
  nodeTypes: [SceneNode],
  edgeTypes: [ChoiceEdge],
  nodes: [
    { id: "start", type: "scene", title: "The Beginning", content: "..." },
    { id: "forest", type: "scene", title: "The Forest", content: "..." },
    { id: "ending", type: "scene", title: "The End", isEnding: true },
  ],
  edges: [
    { 
      id: "choice-1", 
      type: "choice", 
      source: "start", 
      target: "forest",
      text: "Enter the forest",
      conditions: [{ type: "has-item", itemId: "sword" }],
    },
    { 
      id: "choice-2", 
      type: "choice", 
      source: "forest", 
      target: "ending",
      text: "Continue",
    },
  ],
})
```

---

## Example: Workflow Graph

```typescript
// nodes/task.node.ts
export const TaskNode = defineNodeType({
  id: "task",
  properties: {
    name: { type: "string", required: true },
    assignee: { type: "string", required: false },
    status: { type: "enum", values: ["pending", "in-progress", "done"] },
  },
  outgoingEdges: ["flow"],
  incomingEdges: ["flow"],
})

// edges/flow.edge.ts
export const FlowEdge = defineEdgeType({
  id: "flow",
  properties: {
    label: { type: "string", required: false },
    conditions: { type: "condition[]", required: false },
  },
  sourceTypes: ["task", "decision"],
  targetTypes: ["task", "decision"],
})

// app.graph.ts
export const approvalWorkflow = defineGraph({
  id: "approval-workflow",
  nodeTypes: [TaskNode, DecisionNode],
  edgeTypes: [FlowEdge],
  nodes: [
    { id: "submit", type: "task", name: "Submit Request" },
    { id: "review", type: "task", name: "Review Request" },
    { id: "approve?", type: "decision", name: "Approved?" },
    { id: "done", type: "task", name: "Complete" },
  ],
  edges: [
    { id: "f1", type: "flow", source: "submit", target: "review" },
    { id: "f2", type: "flow", source: "review", target: "approve?" },
    { 
      id: "f3", 
      type: "flow", 
      source: "approve?", 
      target: "done",
      conditions: [{ type: "status-eq", status: "approved" }],
    },
  ],
})
```

---

## Generated Metadata

Like Encore's `meta.Data`, Fiction Map generates `graph-metadata.json`:

```json
{
  "nodeTypes": [
    {
      "id": "scene",
      "name": "SceneNode",
      "location": { "file": "nodes/scene.node.ts", "line": 7 },
      "properties": {
        "title": { "type": "string", "required": true },
        "content": { "type": "richtext", "required": false }
      },
      "outgoingEdges": ["choice", "trigger"],
      "incomingEdges": ["choice", "trigger"],
      "usageCount": 3
    }
  ],
  "edgeTypes": [
    {
      "id": "choice",
      "name": "ChoiceEdge",
      "location": { "file": "edges/choice.edge.ts", "line": 7 },
      "sourceTypes": ["scene"],
      "targetTypes": ["scene", "action"],
      "usageCount": 2
    }
  ],
  "conditions": [
    {
      "id": "has-item",
      "location": { "file": "conditions/has-item.condition.ts", "line": 3 },
      "usageCount": 1
    }
  ],
  "graphs": [
    {
      "id": "my-story",
      "nodeCount": 3,
      "edgeCount": 2,
      "maxDepth": 2,
      "endings": ["ending"]
    }
  ]
}
```

---

## Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    localhost:9400                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Graph View                        │    │
│  │                                                      │    │
│  │     [Scene] ──choice──▶ [Scene] ──choice──▶ [Scene] │    │
│  │      start             forest            ending     │    │
│  │        │                                            │    │
│  │        └── has-item: sword                          │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Node Catalog    │  │  Trace Viewer    │                │
│  │                  │  │                  │                │
│  │  SceneNode (3)   │  │  ▶ start         │                │
│  │  ActionNode (0)  │  │  ▶ forest        │                │
│  │                  │  │  ▶ ending        │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## Daemon Architecture

```
$ fiction-map dev

# Starts:
# - Daemon (Unix socket)
# - Dashboard (localhost:9400)
# - File watcher
# - Hot reload

# Dashboard features:
# - Graph visualization
# - Node/edge type catalog
# - Trace viewer (see graph traversals)
# - State inspector
# - Validation errors
# - Click node → open in editor
```

---

## Comparison: Encore vs Fiction Map

| Aspect | Encore | Fiction Map |
|--------|--------|-------------|
| **Core Entity** | Service | Node Type |
| **Relationship** | API Call | Edge |
| **Behavior** | Middleware | Condition/Effect |
| **Container** | Application | Graph |
| **Infrastructure** | Database, Pub/Sub, Cache | State Store |
| **Execution** | HTTP Request | Graph Traversal |

---

## Use Cases

### 1. Stories/Narratives
- Nodes = Scenes
- Edges = Choices
- Conditions = Requirements
- Effects = Consequences

### 2. Workflows
- Nodes = Tasks, Decisions
- Edges = Flows
- Conditions = Business rules
- Effects = Side effects

### 3. Game Engines
- Nodes = States, Actions
- Edges = Transitions
- Conditions = Game logic
- Effects = World changes

### 4. Decision Systems
- Nodes = Decisions, Outcomes
- Edges = Rules
- Conditions = Input matching
- Effects = Actions

---

## Implementation Phases

### Phase 1: Core Package
- `@fiction-map/core` — Node, Edge, Condition, Effect definitions
- File conventions
- Generator (discovers types from files)
- Metadata schema

### Phase 2: Runtime
- `@fiction-map/runtime` — Graph execution engine
- State management
- Traversal algorithms
- Trace collection

### Phase 3: Dev Tools
- `fiction-map` CLI
- Daemon
- Dashboard
- File watcher

### Phase 4: Visual Editor
- `@fiction-map/editor` — React components
- Drag-and-drop graph building
- Visual condition/effect editor

---

## Key Insight

Tale Weaver's problem: "We injected graph sensibility late."

Fiction Map's solution: **Graph IS the primary artifact.**

Everything is a graph:
- Stories are graphs
- Workflows are graphs
- Game logic is graphs
- Decision trees are graphs

The framework provides:
1. **Declaration** — Define graph primitives in code
2. **Metadata** — Extract structure via static analysis
3. **Visualization** — Dashboard shows the graph
4. **Execution** — Runtime traverses the graph
