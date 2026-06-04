# Encore Daemon Architecture

> Retrieved 2026-05-01 from source code analysis
>
> Historical exploration only. This file compares possible directions and is not the
> canonical Fiction Map package boundary. For the current direction, see `README.md`
> and `docs/NORTH_STAR.md`.

---

## How Encore's Daemon Works

### Not "Always-On" — On-Demand

The daemon is **not** a system service. It's started on-demand when you run any `encore` command.

```
$ encore run
    │
    ├─► Check if daemon is running (Unix socket: ~/.cache/encore/encored.sock)
    │       │
    │       ├─► Running? Connect to it
    │       │
    │       └─► Not running? Start it in background:
    │               $ encore daemon -f   (forked, detached)
    │
    └─► Send gRPC request: Run(app_root, watch=true)
            │
            └─► Daemon:
                    • Parse app
                    • Start Docker containers (Postgres, NSQ)
                    • Build app
                    • Run app
                    • Open browser to localhost:9400 (dashboard)
```

### Daemon Ports

```go
d.Dash = d.listenTCPRetry("dashboard", ..., 9400)      // Web UI
d.DBProxy = d.listenTCPRetry("dbproxy", ..., 9500)     // Postgres proxy
d.Runtime = d.listenTCPRetry("runtime", ..., 9600)     // App runtime
d.Debug = d.listenTCPRetry("debug", ..., 9700)         // Debugging
d.ObjectStorage = d.listenTCPRetry("objects", ..., 9800) // S3/GCS emulation
d.MCP = d.listenTCPRetry("mcp", ..., 9900)             // AI integration
```

### Daemon Responsibilities

```go
type Daemon struct {
    Apps          *apps.Manager        // Track known apps
    Secret        *secret.Manager      // Manage secrets
    RunMgr        *run.Manager         // Run apps
    NS            *namespace.Manager   // Isolate environments
    ClusterMgr    *sqldb.ClusterManager // Docker Postgres
    ObjectsMgr    *objects.ClusterManager // Local object storage
    Trace         trace2.Store         // Distributed tracing
    Server        *daemon.Server       // gRPC server
}
```

### Communication

- **CLI → Daemon:** gRPC over Unix socket (`~/.cache/encore/encored.sock`)
- **Dashboard → Daemon:** JSON-RPC over WebSocket (`ws://localhost:9400`)
- **Dashboard Frontend:** External React app at `https://devdash.encore.dev`

---

## What This Means for Fiction Map

### Question: What is Fiction Map's "Development Experience"?

Encore is a **backend framework** — you run it to develop APIs.

Fiction Map is... what?

| Option | Description | Development Experience |
|--------|-------------|------------------------|
| **A. Story Editor SDK** | Libraries for building story editors | No daemon needed. Just npm packages. |
| **B. Story Runtime** | Engine for running interactive stories | Maybe a playtest mode? |
| **C. Full Story Platform** | Editor + Runtime + Dashboard | Like Encore, need a daemon |
| **D. Something else** | ? | ? |

### Option A: SDK Only (Simplest)

```
packages/runtime/      # Runtime engine
consumer-app/                # App-owned UI and editor shell

# Usage:
import { StoryRuntime } from "@your-org/story-runtime"
import { StoryCanvas } from "consumer-app"

// User builds their own app
```

**No daemon needed.** Users import packages and build their own UI.

### Option B: SDK + Playtest Server

```
packages/runtime/
consumer-app/

# CLI for playtesting:
$ fiction-map play my-story.json

# Starts local server:
# - localhost:3000: Story player
# - localhost:3001: Inspector (traces, state)
```

**Lightweight daemon.** Just for development/playtest.

### Option C: Full Platform (Like Encore)

```
$ fiction-map run

# Starts:
# - localhost:9400: Dashboard (graph view, traces, API catalog)
# - localhost:9600: Story runtime
# - File watcher: Hot reload on story changes
# - Local storage: SQLite for story data
```

**Full daemon.** Similar complexity to Encore.

---

## Recommendation: Start with Option A + B Hybrid

### Phase 1: SDK (No Daemon)

- `@your-org/story-runtime` — Pure runtime engine
- Consumer app owns UI components
- Users build their own apps

### Phase 2: Dev Tools (Lightweight Daemon)

```bash
$ fiction-map dev

# Starts:
# - localhost:9400: Dev dashboard
#   - Graph visualization
#   - Trace viewer
#   - State inspector
# - File watcher
# - Hot reload
```

But keep it **optional**. You can use the SDK without the dev tools.

### Phase 3: Platform (If Needed)

- Add deployment
- Add cloud hosting
- Add collaboration

---

## Daemon Architecture for Fiction Map (Phase 2)

If we build dev tools, here's what it would look like:

```
┌─────────────────────────────────────────────────────────────┐
│                    fiction-map daemon                        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Parser    │  │   Runner    │  │   Trace Store       │  │
│  │             │  │             │  │   (SQLite)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Dashboard Server                  │    │
│  │                  (JSON-RPC over WS)                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ localhost:9400
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Frontend                        │
│                 (React app, could be external)              │
│                                                              │
│  • Graph View (React Flow)                                  │
│  • Trace Viewer                                              │
│  • State Inspector                                           │
│  • Node Type Catalog                                         │
└─────────────────────────────────────────────────────────────┘
```

### What Would the Dashboard Show?

1. **Graph View** — Visualize story graph structure
   - Nodes, edges, conditions, effects
   - Click → jump to code

2. **Trace Viewer** — See how a playthrough executed
   - Which nodes were visited
   - Which conditions evaluated
   - Which effects applied
   - State changes over time

3. **State Inspector** — Current runtime state
   - Variables, flags, history
   - Character sheet (if applicable)

4. **Node Type Catalog** — All defined node types
   - Where they're defined
   - What properties they have
   - Usage in the story

---

## Implementation Path

### 1. Define the Metadata Schema

```typescript
// fiction-map-metadata.ts
interface FictionMapMetadata {
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  conditions: ConditionDefinition[];
  effects: EffectDefinition[];
  stories: StoryDefinition[];
}

interface NodeDefinition {
  id: string;
  type: string;
  location: SourceLocation;
  properties: Record<string, PropertySchema>;
  outgoingEdges: EdgeReference[];
  conditions: ConditionReference[];
  effects: EffectReference[];
}
```

### 2. Build the Parser

```typescript
// Parse story definitions from code
// Extract metadata
// Track relationships
```

### 3. Build the Daemon (Optional, Phase 2)

```bash
fiction-map dev
```

- Start WebSocket server
- Parse story on startup
- Watch for file changes
- Serve dashboard

### 4. Build the Dashboard (Optional, Phase 2)

- React app
- Uses `@your-org/story-graph-flow` for visualization
- Communicates with daemon via JSON-RPC

---

## Key Differences from Encore

| Aspect | Encore | Fiction Map |
|--------|--------|-------------|
| **Purpose** | Backend framework | Story engine SDK |
| **Primary artifact** | Services, APIs, databases | Stories, nodes, edges |
| **Infrastructure** | Postgres, NSQ, Redis, S3 | SQLite (maybe) |
| **Daemon complexity** | High (manages Docker, etc.) | Low (just file watching + WebSocket) |
| **Dashboard** | External React app | Could be embedded or external |

---

## Next Steps

1. **Decide:** Do we want dev tools (daemon + dashboard)?
2. **If yes:**
   - Design metadata schema
   - Build parser
   - Build lightweight daemon
   - Build dashboard
3. **If no:**
   - Focus on SDK packages
   - Users build their own tooling
