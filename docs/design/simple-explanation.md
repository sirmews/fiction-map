# Fiction Map — A Simple Explanation

---

## The Big Idea in One Sentence

**Fiction Map is to graphs what Encore is to backend services.**

---

## What Does That Mean?

### Encore's Magic

When you write Encore code:

```typescript
// You write this:
export const userService = service("user")

export const getUser = api(
  { method: "GET", path: "/user/:id" },
  async ({ id }) => { ... }
)

export const userDB = new SQLDatabase("users")
```

Encore automatically:
1. **Understands** your architecture (services, APIs, databases)
2. **Visualizes** it in a dashboard
3. **Generates** clients and documentation
4. **Runs** it locally with hot reload
5. **Deploys** it to cloud

You don't manually:
- Write API documentation
- Create architecture diagrams
- Configure databases
- Set up service discovery

**Encore does it all from your code.**

---

### Fiction Map's Magic

When you write Fiction Map code:

```typescript
// You write this:
export const SceneNode = defineNodeType({
  id: "scene",
  properties: { title: "string", content: "richtext" },
})

export const ChoiceEdge = defineEdgeType({
  id: "choice",
  properties: { text: "string" },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})

export const myStory = defineGraph({
  nodes: [
    { id: "start", type: "scene", title: "Beginning" },
    { id: "end", type: "scene", title: "Ending" },
  ],
  edges: [
    { id: "c1", type: "choice", source: "start", target: "end", text: "Continue" },
  ],
})
```

Fiction Map automatically:
1. **Understands** your graph (node types, edge types, connections)
2. **Visualizes** it in a dashboard
3. **Generates** metadata and documentation
4. **Runs** it locally with hot reload
5. **Validates** it catches errors

You don't manually:
- Draw graph diagrams
- Write graph validation
- Build graph editors
- Create graph runtimes

**Fiction Map does it all from your code.**

---

## Why "Graph-First" Matters

### The TaleWeaver Problem

```
TaleWeaver started here:
┌─────────────────────────┐
│ "A story engine"        │
│                         │
│ • Scenes                │
│ • Choices               │
│ • Characters            │
│ • Items                 │
└─────────────────────────┘
         │
         │ Later: "Wait, this is a graph!"
         ▼
┌─────────────────────────┐
│ "Let's add graphs..."   │
│                         │
│ • Scenes → Nodes?       │
│ • Choices → Edges?      │
│ • But characters?       │
│ • Items aren't nodes... │
└─────────────────────────┘

Result: Confusion. Graphs are "bolted on."
```

### The Fiction Map Solution

```
Fiction Map starts here:
┌─────────────────────────┐
│ "A graph engine"        │
│                         │
│ • Node Types            │
│ • Edge Types            │
│ • Conditions            │
│ • Effects               │
└─────────────────────────┘
         │
         │ "Stories are just graphs"
         ▼
┌─────────────────────────┐
│ "A story is a graph"    │
│                         │
│ • SceneNode             │
│ • ChoiceEdge            │
│ • HasItemCondition      │
│ • GiveItemEffect        │
└─────────────────────────┘

Result: Clarity. Graphs are the foundation.
```

---

## The Four Layers, Simply Explained

### Layer 1: Runtime (The Engine)

**What it is:** The code that runs graphs.

**Analogy:** Like a game engine that runs levels.

```typescript
const runtime = new GraphRuntime(myStory)
runtime.start("start")              // Start at node "start"
runtime.traverse("choice-1")        // Take edge "choice-1"
console.log(runtime.state)          // Where am I now?
```

**What it does:**
- Keeps track of "current position" in the graph
- Evaluates conditions ("Can I go this way?")
- Applies effects ("What happens when I do?")
- Records history ("Where have I been?")

---

### Layer 2: Conditions & Effects (The Rules)

**What they are:** The behavior logic.

**Analogy:** Like game rules ("If you have a key, you can open the door").

**Conditions** answer: "Can I traverse this edge?"

```typescript
// "Can the player take this choice?"
const HasKeyCondition = {
  id: "has-key",
  evaluate: (state) => state.inventory.has("key"),
}

// Usage:
// edge: { type: "choice", conditions: [{ type: "has-key" }] }
// Result: Player can only take this choice if they have a key
```

**Effects** answer: "What happens when I traverse?"

```typescript
// "Give the player an item"
const GiveItemEffect = {
  id: "give-item",
  parameters: { itemId: "string" },
  apply: (state, params) => {
    state.inventory.add(params.itemId)
    return state
  },
}

// Usage:
// edge: { type: "choice", effects: [{ type: "give-item", itemId: "sword" }] }
// Result: When player takes this choice, they get a sword
```

---

### Layer 3: Node Types & Edge Types (The Building Blocks)

**What they are:** Reusable schemas.

**Analogy:** Like LEGO block types. You define the shape once, use it many times.

**Node Type** = A kind of node that can exist

```typescript
const SceneNode = defineNodeType({
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
  },
  outgoingEdges: ["choice", "trigger"],  // What edges can leave?
  incomingEdges: ["choice", "trigger"],  // What edges can enter?
})
```

This says: "A scene is a node with a title and content. Choices and triggers can go in and out."

**Edge Type** = A kind of connection that can exist

```typescript
const ChoiceEdge = defineEdgeType({
  id: "choice",
  properties: {
    text: { type: "string", required: true },
    conditions: { type: "condition[]" },
    effects: { type: "effect[]" },
  },
  sourceTypes: ["scene"],    // Can start from scenes
  targetTypes: ["scene"],    // Can go to scenes
})
```

This says: "A choice is an edge with text. It connects scenes to scenes. It can have conditions and effects."

---

### Layer 4: Graph Instance (The Actual Thing)

**What it is:** A concrete graph using your types.

**Analogy:** Like a specific LEGO model built from blocks.

```typescript
const myStory = defineGraph({
  nodes: [
    { id: "start", type: "scene", title: "You wake up in a forest" },
    { id: "cave", type: "scene", title: "You find a cave" },
    { id: "ending", type: "scene", title: "The End", isEnding: true },
  ],
  edges: [
    { 
      id: "c1", 
      type: "choice", 
      source: "start", 
      target: "cave", 
      text: "Enter the cave",
      conditions: [{ type: "has-item", itemId: "torch" }],
    },
    { 
      id: "c2", 
      type: "choice", 
      source: "cave", 
      target: "ending", 
      text: "Continue" 
    },
  ],
})
```

This is an actual story. It has 3 scenes and 2 choices. The first choice requires a torch.

---

## The File Convention System

### Why Files Matter

Instead of manually registering everything:

```typescript
// ❌ Old way: Manual registration
import { SceneNode } from "./scene-node"
import { ChoiceEdge } from "./choice-edge"
import { HasItemCondition } from "./has-item-condition"
// ... and 50 more imports

const registry = createRegistry({
  nodes: [SceneNode, ...],
  edges: [ChoiceEdge, ...],
  conditions: [HasItemCondition, ...],
})
```

We use file conventions:

```
my-project/
├── nodes/
│   └── scene.node.ts      ← Automatically discovered
├── edges/
│   └── choice.edge.ts     ← Automatically discovered
└── conditions/
    └── has-item.condition.ts  ← Automatically discovered
```

```typescript
// ✅ New way: Convention-based
// Just run: fiction-map generate
// Generator finds all *.node.ts, *.edge.ts, etc.
```

### What Files Create

```
nodes/scene.node.ts       → Creates SceneNode type
edges/choice.edge.ts      → Creates ChoiceEdge type
conditions/has-item.ts    → Creates HasItemCondition
effects/give-item.ts      → Creates GiveItemEffect
```

The generator:
1. Scans your project for these files
2. Extracts type definitions
3. Creates `metadata.json`
4. Creates `registry.ts`

---

## The Dashboard

### What You See

```
┌────────────────────────────────────────────────────────────────┐
│ Fiction Map Dashboard                            localhost:9400 │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Start Scene] ──"Enter cave"──▶ [Cave Scene] ──"Continue"──▶ │
│        │               │                                        │
│        │          requires: torch                               │
│        │                                                        │
│   ┌────────────────────────────────────────────┐               │
│   │ Selected: "Enter cave" choice              │               │
│   │                                            │               │
│   │ Conditions:                                │               │
│   │   • has-item: torch                        │               │
│   │                                            │               │
│   │ Effects:                                   │               │
│   │   (none)                                   │               │
│   │                                            │               │
│   │ [Open in Editor]                           │               │
│   └────────────────────────────────────────────┘               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### What You Can Do

1. **See the whole graph** — Visual map of all nodes and edges
2. **Click anything** — See its properties, conditions, effects
3. **Find errors** — Invalid connections shown in red
4. **Playtest** — Actually traverse the graph
5. **See traces** — History of what happened during playtest
6. **Jump to code** — Click → opens your editor

---

## Multiple Use Cases

The same framework supports different "domains":

### Domain 1: Interactive Stories

```
Nodes:  Scene, Action
Edges:  Choice, Trigger
Used for: Branching narratives, gamebooks
```

### Domain 2: Workflows

```
Nodes:  Task, Decision
Edges:  Flow
Used for: Business processes, approval chains
```

### Domain 3: Dialogue Systems

```
Nodes:  Dialogue, Action
Edges:  Response, Trigger
Used for: NPC conversations, game dialogue
```

### Domain 4: Decision Trees

```
Nodes:  Question, Outcome
Edges:  Answer
Used for: Surveys, diagnostics, recommendations
```

### Domain 5: State Machines

```
Nodes:  State
Edges:  Transition
Used for: Game AI, UI states, protocols
```

**Key insight:** They're all graphs. Same engine, different types.

---

## The Development Workflow

### Step 1: Define Your Types

```bash
# Create node types
touch nodes/scene.node.ts
touch nodes/action.node.ts

# Create edge types
touch edges/choice.edge.ts
touch edges/trigger.edge.ts

# Create conditions
touch conditions/has-item.condition.ts

# Create effects
touch effects/give-item.effect.ts
```

### Step 2: Implement Them

```typescript
// nodes/scene.node.ts
export const SceneNode = defineNodeType({
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
  },
  outgoingEdges: ["choice", "trigger"],
  incomingEdges: ["choice", "trigger"],
})
```

### Step 3: Build Your Graph

```typescript
// graphs/my-story.graph.ts
export const myStory = defineGraph({
  nodes: [...],
  edges: [...],
})
```

### Step 4: Run Dev Tools

```bash
fiction-map dev

# Opens localhost:9400
# - See your graph
# - Check for errors
# - Playtest
```

### Step 5: Iterate

- Dashboard shows errors → Fix in code
- Playtest finds issues → Adjust graph
- All changes hot-reload

---

## What Makes This Different from TaleWeaver

| TaleWeaver | Fiction Map |
|------------|-------------|
| "A story engine that happens to have graphs" | "A graph engine that can build stories" |
| One domain (stories) | Multiple domains (stories, workflows, games, etc.) |
| Graph concepts retrofitted | Graph concepts foundational |
| Hard-coded node types | User-defined node types |
| Custom editor | Standard file conventions |

---

## What Makes This Similar to Encore

| Encore | Fiction Map |
|--------|-------------|
| Define services in code | Define node types in code |
| Static analysis extracts metadata | Static analysis extracts metadata |
| Dashboard shows architecture | Dashboard shows graph |
| Hot reload during development | Hot reload during development |
| Click → jump to code | Click → jump to code |
| Traces show execution | Traces show traversal |

---

## Summary

### Fiction Map is:

1. **A framework** for defining graph-based systems
2. **A generator** that extracts metadata from your code
3. **A runtime** that executes graphs
4. **A dashboard** that visualizes graphs
5. **A validator** that catches errors
6. **Multi-purpose** — works for stories, workflows, games, decisions

### The Key Innovation:

**Graph is the primary artifact.**

Not: "Add graphs to your stories"
But: "Stories ARE graphs"

Not: "Stories, workflows, and games are different"
But: "They're all graphs with different node types"

### The Developer Experience:

1. Write code (node types, edge types, graphs)
2. Run `fiction-map dev`
3. See graph in dashboard
4. Fix errors, playtest, iterate
5. Build for production

---

## Questions to Explore

1. **What node types should be "standard library"?**
   - None (all user-defined)?
   - Common ones (Scene, Task, State)?

2. **How does state work across domains?**
   - Stories need: inventory, stats, flags
   - Workflows need: assignees, due dates, status
   - Can we have a generic state model?

3. **How do conditions compose?**
   - AND/OR logic?
   - Nested conditions?

4. **What's the output format?**
   - JSON graph?
   - Bundled HTML?
   - API server?

5. **How does the editor work?**
   - Code-first or visual-first?
   - Can we sync both ways?
