# Fiction Map — Side-by-Side Examples

> Comparing Encore and Fiction Map to make the pattern crystal clear.

---

## Example 1: Defining a Primitive

### Encore: Define a Service

```typescript
// services/user/service.ts
import { api, service } from "encore.dev/api"

export const userService = service("user")

export const getUser = api(
  { method: "GET", path: "/user/:id" },
  async ({ id }: { id: string }) => {
    return { id, name: "John" }
  }
)
```

**What Encore does:**
- Detects `service("user")` → Creates a service
- Detects `api(...)` → Creates an endpoint
- Adds to `meta.Data.services` and `meta.Data.rpcs`
- Shows in dashboard under "Services"

---

### Fiction Map: Define a Node Type

```typescript
// nodes/scene.node.ts
import { defineNodeType } from "@fiction-map/core"

export const SceneNode = defineNodeType({
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
  },
  outgoingEdges: ["choice"],
  incomingEdges: ["choice"],
})
```

**What Fiction Map does:**
- Detects `*.node.ts` → Creates a node type
- Extracts properties schema
- Adds to `metadata.nodeTypes`
- Shows in dashboard under "Node Types"

---

## Example 2: Connecting Things

### Encore: Service A calls Service B

```typescript
// services/order/service.ts
import { api } from "encore.dev/api"
import { getUser } from "~encore/clients/user"  // Auto-generated client

export const createOrder = api(
  { method: "POST", path: "/order" },
  async () => {
    const user = await getUser({ id: "123" })  // Calls user service
    return { orderId: "456", user }
  }
)
```

**What Encore does:**
- Detects `import from "~encore/clients/user"`
- Detects `getUser(...)` call
- Adds to `meta.Data.Package.rpc_calls`
- Shows arrow from Order → User in dashboard

---

### Fiction Map: Node A connects to Node B

```typescript
// graphs/my-story.graph.ts
import { defineGraph } from "@fiction-map/core"

export const myStory = defineGraph({
  nodes: [
    { id: "start", type: "scene", title: "Beginning" },
    { id: "end", type: "scene", title: "Ending" },
  ],
  edges: [
    { 
      id: "c1", 
      type: "choice", 
      source: "start",      // Connects from start
      target: "end",        // Connects to end
      text: "Continue" 
    },
  ],
})
```

**What Fiction Map does:**
- Detects `source: "start"`, `target: "end"`
- Validates: Can "choice" connect "scene" to "scene"? Yes.
- Adds to `metadata.graphs[0].edges`
- Shows arrow from start → end in dashboard

---

## Example 3: Adding Behavior

### Encore: Middleware

```typescript
// middleware/auth.ts
import { APIGatewayProxyEvent } from "encore.dev/api"

export const authMiddleware = async (req: APIGatewayProxyEvent) => {
  const token = req.headers.authorization
  if (!token) throw new Error("Unauthorized")
  // Continue to handler
}
```

**What Encore does:**
- Wraps API handlers
- Runs before/after the handler
- Can reject requests

---

### Fiction Map: Conditions & Effects

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
// effects/give-item.effect.ts
import { defineEffect } from "@fiction-map/core"

export const GiveItemEffect = defineEffect({
  id: "give-item",
  parameters: {
    itemId: { type: "string", required: true },
  },
  apply: (state, params) => {
    state.inventory.add(params.itemId)
    return state
  },
})
```

**What Fiction Map does:**
- Condition: Runs before traversal, can reject
- Effect: Runs during traversal, modifies state

---

## Example 4: Using Behavior

### Encore: Apply Middleware

```typescript
// services/user/service.ts
import { api } from "encore.dev/api"
import { authMiddleware } from "../middleware/auth"

export const getUser = api(
  { 
    method: "GET", 
    path: "/user/:id",
    middleware: [authMiddleware],  // Apply middleware
  },
  async ({ id }) => { ... }
)
```

---

### Fiction Map: Apply Conditions & Effects

```typescript
// graphs/my-story.graph.ts
export const myStory = defineGraph({
  nodes: [...],
  edges: [
    { 
      id: "c1", 
      type: "choice", 
      source: "start", 
      target: "cave",
      text: "Enter the cave",
      conditions: [
        { type: "has-item", itemId: "torch" },  // Only if you have torch
      ],
      effects: [
        { type: "give-item", itemId: "gold" },  // Give gold when traversed
      ],
    },
  ],
})
```

---

## Example 5: Infrastructure

### Encore: Define Database

```typescript
// services/user/service.ts
import { SQLDatabase } from "encore.dev/storage/sqldb"

export const userDB = new SQLDatabase("users", {
  migrations: "./migrations",
})
```

**What Encore does:**
- Detects `new SQLDatabase(...)`
- Locally: Starts PostgreSQL in Docker
- Cloud: Provisions RDS/Cloud SQL
- Adds to `meta.Data.sql_databases`

---

### Fiction Map: Define State Schema

```typescript
// state/story-state.ts
import { defineStateSchema } from "@fiction-map/core"

export const StoryState = defineStateSchema({
  inventory: {
    type: "map<string, number>",  // itemId → quantity
    default: {},
  },
  stats: {
    type: "map<string, number>",  // statName → value
    default: {},
  },
  flags: {
    type: "set<string>",          // Set of flag names
    default: new Set(),
  },
  history: {
    type: "array<string>",        // List of visited node IDs
    default: [],
  },
})
```

**What Fiction Map does:**
- Defines the shape of state
- Runtime creates instances
- Conditions/effects access it
- Dashboard inspects it during playtest

---

## Example 6: Generated Metadata

### Encore: meta.Data

```json
{
  "svcs": [
    {
      "name": "user",
      "rel_path": "services/user",
      "rpcs": [
        {
          "name": "getUser",
          "path": "/user/:id",
          "http_methods": ["GET"]
        }
      ]
    }
  ],
  "sql_databases": [
    { "name": "users" }
  ]
}
```

---

### Fiction Map: GraphMetadata

```json
{
  "nodeTypes": [
    {
      "id": "scene",
      "location": { "file": "nodes/scene.node.ts", "line": 3 },
      "properties": {
        "title": { "type": "string", "required": true },
        "content": { "type": "richtext" }
      },
      "outgoingEdges": ["choice"],
      "incomingEdges": ["choice"],
      "usageCount": 3
    }
  ],
  "edgeTypes": [
    {
      "id": "choice",
      "location": { "file": "edges/choice.edge.ts", "line": 3 },
      "sourceTypes": ["scene"],
      "targetTypes": ["scene"],
      "usageCount": 2
    }
  ],
  "graphs": [
    {
      "id": "my-story",
      "nodeCount": 3,
      "edgeCount": 2,
      "endings": ["end"]
    }
  ]
}
```

---

## Example 7: Dashboard Views

### Encore Dashboard

```
┌─────────────────────────────────────────────┐
│ Encore Flow                                  │
├─────────────────────────────────────────────┤
│                                              │
│   ┌──────┐     ┌──────┐     ┌──────┐       │
│   │ User │────▶│Order │────▶│Email │       │
│   └──────┘     └──────┘     └──────┘       │
│       │                                       │
│       ▼                                       │
│   ┌──────┐                                   │
│   │ users│ (PostgreSQL)                      │
│   │  DB  │                                   │
│   └──────┘                                   │
│                                              │
└─────────────────────────────────────────────┘
```

---

### Fiction Map Dashboard

```
┌─────────────────────────────────────────────┐
│ Graph View                                   │
├─────────────────────────────────────────────┤
│                                              │
│   ┌──────┐     ┌──────┐     ┌──────┐       │
│   │Start │────▶│Cave  │────▶│ End  │       │
│   │Scene │     │Scene │     │Scene │       │
│   └──────┘     └──────┘     └──────┘       │
│       │           │                         │
│       │    has-item: torch                 │
│       │    give-item: gold                 │
│       │                                     │
│   Selected: "Enter cave" edge              │
│   [Open in Editor]                          │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Example 8: Traces

### Encore: Request Trace

```
POST /order
  └─ OrderService.createOrder()
      ├─ UserService.getUser(id="123")  [2ms]
      │   └─ SELECT * FROM users WHERE id = '123'  [1ms]
      ├─ INSERT INTO orders ...  [3ms]
      └─ Response: { orderId: "456" }
```

---

### Fiction Map: Traversal Trace

```
Start at node: "start" (SceneNode)
  ├─ Available edges: [choice:"Enter cave", choice:"Stay"]
  ├─ User chose: "Enter cave"
  ├─ Evaluating conditions:
  │   └─ has-item(torch) → true ✓
  ├─ Traversing edge: "Enter cave"
  ├─ Applying effects:
  │   └─ give-item(gold) → inventory.add("gold")
  └─ Arrived at node: "cave" (SceneNode)
```

---

## Example 9: Multiple Domains

### Encore: Always Backend Services

```typescript
// Encore is always about services, APIs, databases
// The domain is fixed: backend development
```

---

### Fiction Map: Multiple Domains

**Domain 1: Stories**

```typescript
// nodes/scene.node.ts
const SceneNode = defineNodeType({
  id: "scene",
  properties: { title: "string", content: "richtext" },
  outgoingEdges: ["choice"],
})
```

**Domain 2: Workflows**

```typescript
// nodes/task.node.ts
const TaskNode = defineNodeType({
  id: "task",
  properties: { name: "string", assignee: "string" },
  outgoingEdges: ["flow"],
})
```

**Domain 3: Games**

```typescript
// nodes/state.node.ts
const StateNode = defineNodeType({
  id: "state",
  properties: { name: "string", animation: "string" },
  outgoingEdges: ["transition"],
})
```

**Same engine, different types.**

---

## Summary: The Pattern

| Aspect | Encore Pattern | Fiction Map Pattern |
|--------|----------------|---------------------|
| **Define** | `service()`, `api()` | `defineNodeType()`, `defineEdgeType()` |
| **Connect** | Import client, call function | Define edge with source/target |
| **Behavior** | Middleware | Conditions/Effects |
| **State** | Database | State Schema |
| **Metadata** | `meta.Data` protobuf | `GraphMetadata` JSON |
| **Visualize** | Service map | Graph canvas |
| **Trace** | Request trace | Traversal trace |
| **Domain** | Backend services | Graphs (stories, workflows, games, etc.) |

---

## The Key Insight

**Encore's insight:**
> "Backend infrastructure should be defined in code, extracted via static analysis, visualized in a dashboard."

**Fiction Map's insight:**
> "Graph structures should be defined in code, extracted via static analysis, visualized in a dashboard."

**The pattern is the same. The domain is different.**

Encore = Backend services as code
Fiction Map = Graphs as code
