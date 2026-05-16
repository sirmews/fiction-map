# Dev Server Architecture Review

## Context

After building the initial dev server for `fiction-map dev`, we reviewed its design against Encore's architecture to identify where complexity is warranted vs where it might be over-engineering.

---

## Our Current Architecture

The `@fiction-map/dev-server` package (~1370 lines across 10 files):

| File | Lines | Purpose |
|------|-------|---------|
| `protocol.ts` | 319 | Type definitions, error codes, conversion helpers |
| `server.ts` | 295 | Bun HTTP + WebSocket server, static asset serving |
| `rpc.ts` | 238 | JSON-RPC 2.0 method dispatch |
| `state.ts` | 233 | Refresh cycle state machine (active/queued cycles, deferreds, deep cloning) |
| `watcher.ts` | 108 | `fs.watch` wrapper with debounce |
| `config.ts` | 83 | Port/config normalization |
| `index.ts` | 93 | Re-exports |

Plus `dev.ts` (~205 lines) in the CLI package that wires it together.

The server:
- Serves a built React dashboard from `packages/dashboard/dist` as static files
- Opens a WebSocket for JSON-RPC communication with the dashboard
- Watches the project directory for file changes, re-generates metadata
- Broadcasts metadata-changed notifications to WebSocket clients
- Serves a health endpoint
- Optionally opens a browser on startup

---

## Encore's Architecture (Reference)

Encore's `encore run` works through a **daemon** (`encored`):

- The CLI is a thin client; the daemon handles all orchestration
- CLI communicates with daemon via **gRPC over Unix socket**
- The daemon manages a range of services on allocated ports:

| Port | Service |
|------|---------|
| 9400 | Dashboard UI (web interface) |
| 9500+ | Database proxy connections |
| 9600+ | Application runtime proxy |
| 9700+ | Debug/pprof |

The daemon:
- **Provisions real infrastructure**: starts local Postgres, applies migrations, runs Pub/Sub queues
- **Compiles and runs the user's app**: starts actual Go/TS backend services
- **Hot-reloads**: recompiles and restarts services on file change
- **Serves the dashboard**: web UI for tracing, API explorer, service catalog
- **Proxies DB connections**: port forwarding, connection pooling
- **Manages process lifecycle**: service startup/shutdown, port allocation

The dashboard itself communicates with the daemon via JSON-RPC (same pattern as us), but the CLI ↔ daemon channel uses gRPC streaming for long-running operations.

---

## Comparison

| Aspect | Encore | Fiction Map |
|--------|--------|-------------|
| CLI ↔ backend | gRPC over Unix socket (daemon) | Direct function call (no daemon) |
| Dashboard API | JSON-RPC | JSON-RPC over WebSocket |
| Infra provisioning | Postgres, Pub/Sub, services | None |
| Process management | Compiles & runs user code | None |
| Port allocation | Dynamic range (9400-9700+) | Single port (9400) |
| File watching | Triggers recompile + restart | Triggers metadata refresh |
| Bundled dashboard | Yes (served from daemon) | Yes (served from dev server) |

---

## Complexity Analysis

### 1. `BunLike` abstraction (`server.ts`)

~30 lines of interface types wrapping `Bun.serve()`, plus `getBun()` runtime check and a fake Bun in tests. Exists for testability. If the project is committed to Bun, this indirection adds no value for the eventual infra pipeline — real process management will need different abstractions.

### 2. Manual static asset serving (`server.ts:246-274`)

~30 lines reimplementing:
- Path sanitization (`isWithinRoot`)
- MIME type mapping (`getContentType`)
- SPA fallback (serves `index.html` for unknown routes)

Bun's `Bun.file()` handles MIME types natively. The path traversal protection is valid but could be tighter.

### 3. JSON-RPC protocol (`protocol.ts` + `rpc.ts`)

~557 lines for 5 RPC methods:
- Full JSON-RPC 2.0 spec (error codes, versioning, structured responses)
- Request parameter validation per method
- Notification format for broadcasts
- Error code constants + message templates

For a dashboard ↔ server channel with 5 methods, this is heavy. A simple `switch` on message type in the WebSocket handler would be ~100 lines. However, if the dashboard API grows significantly (tracing, playtest, click-to-code), a structured protocol becomes more justified.

### 4. `DevServerState` refresh cycles (`state.ts`)

~230 lines implementing:
- Active/queued refresh cycle management
- Deferred promise chaining
- Deep cloning on every read (to prevent mutation from consumers)
- Error capture with structured error objects

This manages the semantics of: "don't re-refresh while a refresh is in progress, but queue one more for when it finishes." The complexity is real — it prevents thundering-herd issues from rapid file changes — but the deep cloning and deferred infrastructure add ceremony.

### 5. Testability abstractions (`watcher.ts`, `server.ts`)

Every dependency is injectable:
- `watchFactory` — to swap `fs.watch` implementation
- `createWatcher` — to supply a manual test watcher
- `bunRuntime` — to mock `Bun.serve()`
- `openDefinition` — injected handler for click-to-code

This makes the code harder to follow at first read. Each factory/interface exists so tests can inject fakes without side effects.

---

## Key Question

Will the dev server eventually manage real infrastructure (running user processes, allocating ports, proxying connections)?

**If yes**: The current investment in abstraction layers is in the wrong places. The complexity is in mocking Bun and protocol validation, not in process orchestration. Future work will need:
- Process lifecycle management (spawn, monitor, kill user code)
- Port allocation and proxy routing
- Service discovery mechanisms
- A proper IPC channel (not WebSocket JSON-RPC)

These will require new abstractions that make `BunLike` and the current JSON-RPC dispatch look like the wrong foundation.

**If no**: The current server can be dramatically simpler — ~150 lines of Bun-native code serving the dashboard and relaying metadata over a simple WebSocket protocol.

---

## Open Questions for Validation

1. Does Fiction Map need to run user code (compile, execute, hot-reload), or just analyze and visualize it?
2. Will `fiction-map dev` eventually start and manage child processes (like Encore runs user services)?
3. Is JSON-RPC over WebSocket the right long-term IPC mechanism, or should we plan for gRPC/Unix socket?
4. Is Bun a permanent dependency or should the dev server be runtime-agnostic?
5. Should the dashboard be a bundled static app or a proxied dev server (Vite)?
