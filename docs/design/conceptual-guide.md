# Fiction Map — Complete Conceptual Guide

> A framework for building node-based systems, inspired by Encore's approach to backend development.

---

## Part 1: The Core Insight

### The Problem with TaleWeaver

TaleWeaver started as a story engine. Graphs were added later:

```
TaleWeaver Evolution:
                            
Phase 1: Story Engine        Phase 2: Add Graphs
┌─────────────────┐         ┌─────────────────┐
│ Scenes          │         │ Scenes ─────────│──→ ???
│ Choices         │   ──►   │ Choices         │
│ Characters      │         │ Characters      │
│ Items           │         │ Items           │
└─────────────────┘         └─────────────────┘
                            
                            Graph = retrofitted
                            Hard to reconcile
```

### How Encore Solves This for Backends

Encore starts with the architecture as the primary artifact:

```
Encore Approach:

Code                    Parser                  Dashboard
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ service User {  │     │                 │     │ ┌─────┐ ┌─────┐ │
│   api GET /user │ ──► │  meta.Data      │ ──► │ │User │→│Auth │ │
│   db users      │     │  (graph schema) │     │ └─────┘ └─────┘ │
│ }               │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                            
                        Architecture is
                        the PRIMARY artifact
```

### Fiction Map: Encore's Approach for Graphs

Apply the same principle to node-based systems:

```
Fiction Map Approach:

Code                    Parser                  Dashboard
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Node Scene {    │     │                 │     │ ┌─────┐ ┌─────┐ │
│   title: string │ ──► │  GraphMetadata  │ ──► │ │Start│→│Forest│ │
│ }               │     │  (graph schema) │     │ └─────┘ └─────┘ │
│ Edge Choice {   │     │                 │     │                 │
│   text: string  │     │                 │     │ Node Catalog    │
│ }               │     │                 │     │ Trace Viewer    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                            
                        Graph IS the
                        PRIMARY artifact
```

---

## Part 2: What is a Graph?

### Formal Definition

A graph consists of:
- **Nodes** — Entities with properties
- **Edges** — Connections between nodes
- **Behavior** — What happens when you traverse

```
        Node A
       ╱      ╲
    Edge 1    Edge 2
     ╱          ╲
  Node B       Node C
    │
  Edge 3
    │
  Node D
```

### Real-World Examples

**1. Story Graph**
```
[Scene: "You wake up"]
         │
    ┌────┴────┐
    │         │
[Choice:   [Choice:
 "Go left"] "Go right"]
    │         │
    ▼         ▼
[Scene:   [Scene:
 "Forest"]  "City"]
```

**2. Workflow Graph**
```
[Task: Submit Form]
         │
         ▼
[Task: Review]
         │
    ┌────┴────┐
    │         │
[Approved?] [Rejected?]
    │         │
    ▼         ▼
[Complete] [Revise]
```

**3. Game State Graph**
```
[State: Idle]
         │
    [Input: Press Jump]
         │
         ▼
[State: Jumping]
         │
    [Timer: 0.5s]
         │
         ▼
[State: Falling]
```

---

## Part 3: The Fiction Map Model

### Layers of Abstraction

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Graph Instance                                      │
│                                                              │
│ A specific graph with concrete nodes and edges              │
│ Example: "The Lost Kingdom" story with 50 scenes            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Node Types & Edge Types                             │
│                                                              │
│ Reusable definitions of what nodes and edges can exist      │
│ Example: SceneNode, ChoiceEdge, TriggerEdge                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ evaluated by
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Conditions & Effects                                │
│                                                              │
│ Behavior: When can we traverse? What happens?               │
│ Example: HasItemCondition, ModifyStatEffect                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ executed by
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Runtime                                             │
│                                                              │
│ Engine that traverses graphs, manages state, collects traces│
└─────────────────────────────────────────────────────────────┘
```

### Layer 4: Graph Instance

A concrete graph. Think of it as a "document" or "story file".

```typescript
// Example: A simple story
const myStory = {
  nodes: [
    { id: "start", type: "scene", title: "The Beginning" },
    { id: "forest", type: "scene", title: "The Forest" },
    { id: "ending", type: "scene", title: "The End" },
  ],
  edges: [
    { id: "c1", type: "choice", source: "start", target: "forest", text: "Go to forest" },
    { id: "c2", type: "choice", source: "forest", target: "ending", text: "Continue" },
  ],
}
```

### Layer 3: Node Types & Edge Types

Reusable schemas. Like "classes" for nodes and edges.

```typescript
// Node Type
const SceneNode = {
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
  },
  // What edges can leave this node?
  outgoingEdges: ["choice", "trigger"],
  // What edges can enter this node?
  incomingEdges: ["choice", "trigger"],
}

// Edge Type
const ChoiceEdge = {
  id: "choice",
  properties: {
    text: { type: "string", required: true },
    conditions: { type: "condition[]" },
    effects: { type: "effect[]" },
  },
  // What nodes can this connect?
  sourceTypes: ["scene", "action"],
  targetTypes: ["scene", "action"],
}
```

**Key Insight:** Node and edge types define the "grammar" of valid graphs.

### Layer 2: Conditions & Effects

Conditions: Can we traverse this edge?
Effects: What happens when we do?

```typescript
// Condition
const HasItemCondition = {
  id: "has-item",
  parameters: { itemId: "string" },
  evaluate: (state, params) => state.inventory.has(params.itemId),
}

// Effect
const GiveItemEffect = {
  id: "give-item",
  parameters: { itemId: "string", quantity: "number" },
  apply: (state, params) => {
    state.inventory.add(params.itemId, params.quantity)
    return state
  },
}
```

### Layer 1: Runtime

The engine that executes graphs.

```typescript
// Runtime execution
const runtime = new GraphRuntime(myStory)

// Start at the first node
runtime.start("start")

// Get available choices
const choices = runtime.getAvailableEdges()
// [{ text: "Go to forest", target: "forest" }]

// Make a choice
runtime.traverse("c1")

// What happened?
console.log(runtime.state.currentNode) // "forest"
console.log(runtime.state.history)     // ["start", "forest"]
```

---

## Part 4: The File Convention System

### Why File Conventions?

Like Encore discovers services from code, Fiction Map discovers graph primitives from files.

**Benefits:**
- No manual registration
- Easy to add new types
- Generator can extract metadata
- AST-grep can enforce patterns

### Convention Mapping

```
File Pattern                    → Discovers
───────────────────────────────────────────────
nodes/*.node.ts                 → Node Types
edges/*.edge.ts                 → Edge Types  
conditions/*.condition.ts       → Conditions
effects/*.effect.ts             → Effects
graphs/*.graph.ts               → Graph Instances
```

### Example Project Structure

```
my-story-app/
├── nodes/
│   ├── scene.node.ts          # SceneNode definition
│   ├── action.node.ts         # ActionNode definition
│   └── decision.node.ts       # DecisionNode definition
│
├── edges/
│   ├── choice.edge.ts         # ChoiceEdge definition
│   ├── trigger.edge.ts        # TriggerEdge definition
│   └── flow.edge.ts           # FlowEdge definition
│
├── conditions/
│   ├── has-item.condition.ts  # Check inventory
│   ├── stat-gte.condition.ts  # Check stats
│   └── flag-set.condition.ts  # Check flags
│
├── effects/
│   ├── give-item.effect.ts    # Add to inventory
│   ├── modify-stat.effect.ts  # Change stats
│   └── set-flag.effect.ts     # Set flags
│
├── graphs/
│   └── my-story.graph.ts      # The story graph
│
└── app.ts                      # Entry point
```

### What the Generator Produces

Running `fiction-map generate` produces:

```
.generated/
├── metadata.json              # Full graph metadata
├── registry.ts               # TypeScript registry
└── SEMANTICS.md              # Documentation for LLMs
```

---

## Part 5: The Metadata Schema

### What Gets Extracted?

```typescript
interface GraphMetadata {
  // All discovered node types
  nodeTypes: NodeTypeDefinition[]
  
  // All discovered edge types
  edgeTypes: EdgeTypeDefinition[]
  
  // All discovered conditions
  conditions: ConditionDefinition[]
  
  // All discovered effects
  effects: EffectDefinition[]
  
  // All graph instances
  graphs: GraphDefinition[]
  
  // Validation results
  validation: ValidationResult[]
}
```

### NodeTypeDefinition

```typescript
interface NodeTypeDefinition {
  // Unique identifier
  id: string
  
  // Where it's defined
  location: {
    file: string
    line: number
    column: number
  }
  
  // Description (from JSDoc)
  description?: string
  
  // AI rule (from @ai-rule)
  aiRule?: string
  
  // Property schema
  properties: {
    [name: string]: PropertySchema
  }
  
  // Which edges can leave this node type
  outgoingEdges: string[]
  
  // Which edges can enter this node type
  incomingEdges: string[]
  
  // Usage: How many nodes of this type exist?
  usageCount: number
  
  // Usage: Which graphs use this type?
  usedIn: string[]
}
```

### EdgeTypeDefinition

```typescript
interface EdgeTypeDefinition {
  id: string
  location: SourceLocation
  description?: string
  aiRule?: string
  
  // Property schema
  properties: {
    [name: string]: PropertySchema
  }
  
  // Which node types can be sources
  sourceTypes: string[]
  
  // Which node types can be targets
  targetTypes: string[]
  
  // Usage statistics
  usageCount: number
  usedIn: string[]
}
```

### ConditionDefinition

```typescript
interface ConditionDefinition {
  id: string
  location: SourceLocation
  description?: string
  aiRule?: string
  
  // What parameters does it accept?
  parameters: {
    [name: string]: PropertySchema
  }
  
  // Usage
  usageCount: number
  usedIn: string[]
}
```

### GraphDefinition

```typescript
interface GraphDefinition {
  id: string
  location: SourceLocation
  
  // Structure
  nodeCount: number
  edgeCount: number
  
  // Analysis
  maxDepth: number          // Longest path
  branches: number          // Number of branching points
  endings: string[]         // Nodes with no outgoing edges
  
  // Validation
  errors: ValidationError[]
  warnings: ValidationWarning[]
  
  // Which types are used
  nodeTypesUsed: string[]
  edgeTypesUsed: string[]
  conditionsUsed: string[]
  effectsUsed: string[]
}
```

---

## Part 6: The Developer Experience

### Workflow

```
1. Define Types
   └─► Create node-type.ts, edge-type.ts files

2. Define Behavior
   └─► Create condition.ts, effect.ts files

3. Build Graph
   └─► Create graph.ts with nodes and edges

4. Run Generator
   └─► $ fiction-map generate

5. Check Dashboard
   └─► $ fiction-map dev
       └─► Opens localhost:9400

6. Validate
   └─► See errors in dashboard
   └─► Click node → jump to code

7. Test
   └─► Use Playtest tab in dashboard
   └─► See traces

8. Build
   └─► $ fiction-map build
       └─► Produces standalone bundle
```

### Dashboard Tabs

```
┌─────────────────────────────────────────────────────────────┐
│ [Graph] [Catalog] [Validate] [Playtest] [Traces]            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Tab: Graph                                          │
│                                                              │
│  ┌───────┐      ┌───────┐      ┌───────┐                   │
│  │ Start │─────▶│Forest │─────▶│ Ending│                   │
│  └───────┘      └───────┘      └───────┘                   │
│     │              │                                        │
│     │ conditions:  │ effects:                               │
│     │ has-item     │ give-item                              │
│     │              │                                        │
│  ┌──────────────────────────────────────┐                   │
│  │ Selected: Start (SceneNode)          │                   │
│  │ File: nodes/scene.node.ts:7          │                   │
│  │ [Open in Editor]                     │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Graph Tab** — Visualize the graph structure
**Catalog Tab** — Browse all node types, edge types, conditions, effects
**Validate Tab** — See errors and warnings
**Playtest Tab** — Interactively test the graph
**Traces Tab** — See execution history

---

## Part 7: Use Case Examples

### Use Case 1: Interactive Fiction

```typescript
// nodes/scene.node.ts
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

// edges/choice.edge.ts
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

// Result: A branching story
```

### Use Case 2: Business Workflow

```typescript
// nodes/task.node.ts
export const TaskNode = defineNodeType({
  id: "task",
  properties: {
    name: { type: "string", required: true },
    assignee: { type: "string" },
    dueDate: { type: "date" },
  },
  outgoingEdges: ["flow"],
  incomingEdges: ["flow"],
})

// nodes/decision.node.ts
export const DecisionNode = defineNodeType({
  id: "decision",
  properties: {
    question: { type: "string", required: true },
  },
  outgoingEdges: ["flow"],
  incomingEdges: ["flow"],
})

// edges/flow.edge.ts
export const FlowEdge = defineEdgeType({
  id: "flow",
  properties: {
    label: { type: "string" },
    conditions: { type: "condition[]" },
  },
  sourceTypes: ["task", "decision"],
  targetTypes: ["task", "decision"],
})

// Result: A workflow engine
```

### Use Case 3: Game Dialogue

```typescript
// nodes/dialogue.node.ts
export const DialogueNode = defineNodeType({
  id: "dialogue",
  properties: {
    speaker: { type: "string", required: true },
    text: { type: "string", required: true },
    emotion: { type: "enum", values: ["neutral", "happy", "sad"] },
  },
  outgoingEdges: ["response", "trigger"],
  incomingEdges: ["response", "trigger"],
})

// edges/response.edge.ts
export const ResponseEdge = defineEdgeType({
  id: "response",
  properties: {
    text: { type: "string", required: true },
    conditions: { type: "condition[]" },
    effects: { type: "effect[]" },
  },
  sourceTypes: ["dialogue"],
  targetTypes: ["dialogue", "action"],
})

// Result: A dialogue system
```

### Use Case 4: Decision Tree

```typescript
// nodes/question.node.ts
export const QuestionNode = defineNodeType({
  id: "question",
  properties: {
    text: { type: "string", required: true },
  },
  outgoingEdges: ["answer"],
  incomingEdges: ["answer"],
})

// nodes/outcome.node.ts
export const OutcomeNode = defineNodeType({
  id: "outcome",
  properties: {
    result: { type: "string", required: true },
  },
  outgoingEdges: [],
  incomingEdges: ["answer"],
})

// edges/answer.edge.ts
export const AnswerEdge = defineEdgeType({
  id: "answer",
  properties: {
    value: { type: "string", required: true },
  },
  sourceTypes: ["question"],
  targetTypes: ["question", "outcome"],
})

// Result: A decision support system
```

---

## Part 8: Comparison Table

| Aspect | Encore | Fiction Map |
|--------|--------|-------------|
| **Domain** | Backend systems | Node-based systems |
| **Core Entity** | Service | Node Type |
| **Connection** | API Call | Edge |
| **Behavior** | Middleware | Condition/Effect |
| **Container** | Application | Graph |
| **State** | Request/Response | Graph State |
| **Execution** | HTTP Request | Graph Traversal |
| **Infrastructure** | Database, Pub/Sub | State Store |
| **Visualization** | Service Map | Graph Canvas |
| **Tracing** | Request Tracing | Traversal Tracing |

---

## Part 9: Key Innovations

### 1. Type Safety

```typescript
// TypeScript knows this is invalid:
const edge = {
  type: "choice",
  source: "some-task",  // Error: TaskNode cannot have choice edges
  target: "some-scene",
}
```

### 2. Visual Validation

Dashboard shows:
- Edges that violate type constraints (red)
- Nodes with no way to reach them (orange)
- Endings that are unreachable (red)

### 3. Click-to-Code

Click any node in dashboard → Opens in your editor at the exact line.

### 4. Execution Traces

See exactly how a traversal happened:
```
[start:Scene] 
  → evaluated conditions: []
  → traversed choice:1 "Go left"
  → applied effects: [give-item: "sword"]
  → arrived at [forest:Scene]
```

### 5. Multi-Purpose

Same framework supports:
- Stories
- Workflows
- Dialogue systems
- Decision trees
- State machines
- Behavior trees

---

## Part 10: What's Next?

### Questions to Answer

1. **What node types are core vs. user-defined?**
   - Core: None? All user-defined?
   - Or: Provide standard library (Scene, Task, etc.)

2. **How does state work?**
   - Generic key-value?
   - Domain-specific (inventory, stats)?
   - User-defined?

3. **How do conditions/effects compose?**
   - AND/OR/NOT logic?
   - Sequenced effects?

4. **What's the deployment model?**
   - Bundled HTML like TaleWeaver?
   - Server-side runtime?
   - Both?

### Implementation Order

```
Phase 1: Core Types
├── Define metadata schema
├── Create defineNodeType, defineEdgeType
├── Create defineCondition, defineEffect
└── Basic validation

Phase 2: Generator
├── File discovery
├── Metadata extraction
├── Registry generation
└── AST-grep rules

Phase 3: Runtime
├── Graph traversal
├── State management
├── Condition evaluation
├── Effect application
└── Trace collection

Phase 4: Dev Tools
├── CLI (fiction-map generate, fiction-map dev)
├── Daemon
├── Dashboard
└── File watcher

Phase 5: Editor
├── Visual graph editor
├── Drag-and-drop
└── Property panels
```
