# Encore User Experience & Graph Representation

> Retrieved 2026-05-01 from DeepWiki and source code analysis

---

## The Problem You Faced with TaleWeaver

> "We just didn't have a good graph sensibility. We injected this graph sensibility late in the project and it was hard to reconcile."

Encore solves this by **starting with the graph as the primary artifact**. The graph isn't retrofitted—it's the foundation.

---

## Encore Dashboard Components

### 1. Encore Flow (Architecture Diagram)

- **Real-time visualization** of microservice architecture
- **Services** = white boxes
- **Pub/Sub topics** = black boxes
- **Auto-updates** when you break a monolith into services
- Shows service dependencies, API calls, data flow

### 2. Service Catalog

- Auto-generated API documentation
- Lists all services and their endpoints
- HTTP methods, paths, parameters, request/response types
- Real-time updates as code changes

### 3. API Explorer

- Test endpoints directly from the dashboard
- No Postman needed

### 4. Distributed Tracing

- Automatic trace ID propagation across services
- Each span contains:
  - Stack traces
  - Structured logging
  - HTTP requests/responses
  - Database queries
  - Pub/Sub messages
  - Cache operations

---

## How Encore Represents the Graph

### meta.Data Protobuf Structure

The `meta.Data` protobuf is the single source of truth for the application graph:

```protobuf
message Data {
  repeated schema.v1.Decl decls = 3;      // Type declarations
  repeated Package pkgs = 4;               // Packages
  repeated Service svcs = 5;               // Services
  optional AuthHandler auth_handler = 6;   // Auth
  repeated CronJob cron_jobs = 7;          // Scheduled jobs
  repeated PubSubTopic pubsub_topics = 9;  // Message queues
  repeated Middleware middleware = 10;      // Middleware
  repeated CacheCluster cache_clusters = 11;
  repeated Metric metrics = 13;
  repeated SQLDatabase sql_databases = 14;
  repeated Gateway gateways = 15;
  repeated Bucket buckets = 17;            // Object storage
}
```

### Service Structure

```protobuf
message Service {
  string name = 1;
  string rel_path = 2;                     // Where it lives
  repeated RPC rpcs = 3;                   // Endpoints
  repeated string databases = 5;           // Dependencies
  repeated BucketUsage buckets = 7;        // Storage usage
}
```

### Package Tracking (Call Graph)

```protobuf
message Package {
  string rel_path = 1;
  string name = 2;
  string service_name = 4;                 // Which service owns this
  repeated QualifiedName rpc_calls = 6;    // Which RPCs it calls (!)
  repeated TraceNode trace_nodes = 7;      // Where things happen
}
```

**Key insight:** `rpc_calls` field tracks which services call which other services.

### TraceNode (The Graph Nodes)

```protobuf
message TraceNode {
  int32 id = 1;
  string filepath = 2;
  int32 start_pos = 4;
  int32 end_pos = 5;
  
  oneof context {
    RPCDefNode rpc_def = 10;              // API endpoint definition
    RPCCallNode rpc_call = 11;            // API endpoint call
    StaticCallNode static_call = 12;      // SQL, Redis, etc.
    AuthHandlerDefNode auth_handler_def = 13;
    PubSubTopicDefNode pubsub_topic_def = 14;
    PubSubPublishNode pubsub_publish = 15;
    PubSubSubscriberNode pubsub_subscriber = 16;
    ServiceInitNode service_init = 17;
    MiddlewareDefNode middleware_def = 18;
    CacheKeyspaceDefNode cache_keyspace = 19;
  }
}
```

### PubSubTopic (Publishers + Subscribers)

```protobuf
message PubSubTopic {
  string name = 1;
  schema.v1.Type message_type = 3;
  repeated Publisher publishers = 6;      // Which services publish
  repeated Subscription subscriptions = 7; // Which services subscribe
  
  message Publisher {
    string service_name = 1;
  }
  
  message Subscription {
    string name = 1;
    string service_name = 2;
    // retry config...
  }
}
```

---

## Dashboard Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    devdash.encore.dev                        │
│                   (External React App)                       │
│                                                              │
│  • Flow Diagram (service graph)                             │
│  • Service Catalog (API docs)                               │
│  • Tracing Viewer (request flow)                            │
│  • API Explorer (testing)                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ JSON-RPC over WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   encore daemon                              │
│                  (Local Go Server)                           │
│                                                              │
│  • Serves meta.Data to dashboard                            │
│  • Stores traces                                            │
│  • Manages running apps                                     │
│  • Proxies to databases                                     │
└─────────────────────────────────────────────────────────────┘
```

**Dashboard URL:** `http://localhost:9400`

**Communication:** JSON-RPC 2.0 over WebSocket

---

## Key Lessons for Fiction Map

### 1. Graph as Primary Artifact

Don't retrofit the graph. The graph IS the model.

```
Encore:  Code → Parser → meta.Data → Dashboard
TaleWeaver: Code → ??? → Graph (late) → Confusion
```

### 2. TraceNode Pattern

Each node in the graph has:
- **Location** (file, line, column)
- **Type** (RPC def, RPC call, DB query, etc.)
- **Context** (which service, which function)

This enables:
- Click on node → jump to code
- Visualize relationships
- Understand dependencies

### 3. Explicit Relationship Tracking

```protobuf
// Package tracks what it calls
repeated QualifiedName rpc_calls = 6;

// PubSubTopic tracks who publishes/subscribes
repeated Publisher publishers = 6;
repeated Subscription subscriptions = 7;

// Service tracks what it uses
repeated string databases = 5;
```

### 4. Dashboard is Separate

- Dashboard is a **separate frontend app** (`devdash.encore.dev`)
- Communicates via JSON-RPC
- Could be React, Vue, anything
- Keep it decoupled from the core

---

## What Fiction Map Should Do

### Phase 1: Define the Graph Schema

Create a `GraphMetadata` structure similar to `meta.Data`:

```typescript
interface GraphMetadata {
  nodes: NodeTypeDefinition[];
  edges: EdgeTypeDefinition[];
  conditions: ConditionDefinition[];
  effects: EffectDefinition[];
  services: ServiceDefinition[];  // If we have services
}
```

### Phase 2: Track Relationships

```typescript
interface NodeTypeDefinition {
  id: string;
  name: string;
  location: SourceLocation;
  outgoingEdges: EdgeReference[];  // What edges this node creates
  incomingEdges: EdgeReference[];  // What edges target this node
  conditionsUsed: ConditionReference[];
  effectsApplied: EffectReference[];
}
```

### Phase 3: Generate Dashboard Data

```typescript
// From graph metadata, generate:
interface DashboardData {
  services: ServiceNode[];
  connections: Connection[];
  resources: Resource[];
}
```

### Phase 4: Build Visualization

Options:
1. Use React Flow (already in story-graph-flow)
2. Use a dedicated graph viz library (Cytoscape, G6)
3. Build custom

---

## File Locations in Encore

| Component | Location |
|-----------|----------|
| Parser | `tsparser/` (Rust, SWC-based) |
| Metadata Proto | `proto/encore/parser/meta/v1/meta.proto` |
| Dashboard Backend | `cli/daemon/dash/dash.go` |
| Dashboard Frontend | `https://devdash.encore.dev` (external) |
| Code Generation | `tsparser/src/builder/codegen.rs` |
| Templates | `tsparser/src/builder/templates/` |

---

## Next Steps

1. **Define Fiction Map's metadata schema** — What does our graph look like?
2. **Decide on TraceNode equivalents** — What "nodes" exist in story graphs?
3. **Build the generator** — Extract metadata from code
4. **Create visualization** — Use React Flow or similar
5. **Add relationship tracking** — Who calls what, who uses what
