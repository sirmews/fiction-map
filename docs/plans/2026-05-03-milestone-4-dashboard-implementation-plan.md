# Milestone 4 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `fiction-map dev` as a real development toolchain: file watching, metadata refresh, JSON-RPC over WebSocket, and a React dashboard that renders the existing graph metadata and can grow into playtest, traces, and click-to-code.

**Architecture:** Keep `packages/cli` as the user-facing entrypoint, but do not let it absorb all Milestone 4 responsibilities. Add a dedicated dev server package for runtime state, file watching, and RPC transport, plus a dedicated dashboard app package for the browser UI. Share only the protocol and metadata-to-view-model boundary that both sides actually need. Start with one honest vertical slice: `fiction-map dev` boots, serves current metadata, pushes change notifications, and renders the graph and catalog from live data.

**Tech Stack:** Bun, TypeScript, workspace packages, WebSocket + JSON-RPC, React, Vite, `@xyflow/react`

---

## File Structure

**Existing files to modify**
- `package.json`
  Responsibility: add root scripts for dashboard/dev-server workflows if needed.
- `README.md`
  Responsibility: document `fiction-map dev` once the first vertical slice is real.
- `docs/NORTH_STAR.md`
  Responsibility: keep Milestone 4 progress and deliverable language aligned with actual implementation.
- `packages/cli/package.json`
  Responsibility: add `dev` command build/runtime dependencies.
- `packages/cli/src/cli.ts`
  Responsibility: register the `dev` command and its arguments.
- `packages/cli/src/index.ts`
  Responsibility: export the new dev entrypoints that are intended to be public.
- `packages/cli/src/generator/index.ts`
  Responsibility: expose reusable metadata generation APIs without side effects needed only by the CLI command.

**New packages**
- `packages/dev-server/package.json`
  Responsibility: daemon/dev-server runtime package for file watching, metadata cache, WebSocket server, and dashboard asset serving.
- `packages/dev-server/src/index.ts`
  Responsibility: public package exports.
- `packages/dev-server/src/config.ts`
  Responsibility: normalize CLI options, ports, root directory, editor command, and debounce timing.
- `packages/dev-server/src/state.ts`
  Responsibility: own current metadata snapshot, refresh lifecycle, and refresh status/errors.
- `packages/dev-server/src/watcher.ts`
  Responsibility: watch Fiction Map source conventions and trigger debounced refresh.
- `packages/dev-server/src/protocol.ts`
  Responsibility: JSON-RPC method names, request/response payload types, and notification contracts.
- `packages/dev-server/src/rpc.ts`
  Responsibility: method dispatch for `metadata/get`, `metadata/refresh`, `graph/list`, and `graph/get`.
- `packages/dev-server/src/server.ts`
  Responsibility: Bun HTTP/WebSocket server, health endpoint, RPC wireup, and client broadcast.
- `packages/dev-server/src/open-editor.ts`
  Responsibility: click-to-code command construction for supported local editors.
- `packages/dev-server/src/server.test.ts`
  Responsibility: protocol and refresh behavior coverage.

**New dashboard app**
- `packages/dashboard/package.json`
  Responsibility: browser app workspace package.
- `packages/dashboard/index.html`
  Responsibility: Vite entry HTML.
- `packages/dashboard/src/main.tsx`
  Responsibility: app bootstrap.
- `packages/dashboard/src/App.tsx`
  Responsibility: top-level layout and data loading shell.
- `packages/dashboard/src/lib/rpc-client.ts`
  Responsibility: browser JSON-RPC client and reconnect logic.
- `packages/dashboard/src/lib/metadata.ts`
  Responsibility: adapt generator metadata into graph/canonical UI models.
- `packages/dashboard/src/hooks/useMetadata.ts`
  Responsibility: initial fetch, refresh state, notification subscription, reconnect handling.
- `packages/dashboard/src/components/GraphPanel.tsx`
  Responsibility: render the current graph with `@fiction-map/visualize`.
- `packages/dashboard/src/components/CatalogPanel.tsx`
  Responsibility: render node types, edge types, conditions, and effects.
- `packages/dashboard/src/components/ValidationPanel.tsx`
  Responsibility: render graph validation errors and warnings.
- `packages/dashboard/src/components/DefinitionDetails.tsx`
  Responsibility: show source locations and invoke click-to-code.
- `packages/dashboard/src/components/__tests__/...`
  Responsibility: UI coverage for loading, refresh, and selection states.

## Constraints And Decisions

- `fiction-map dev` remains optional. The existing packages must stay usable without the daemon/dashboard.
- Milestone 4 starts from generated metadata, not from direct runtime execution. Playtest and traces stay behind a stable protocol boundary until the metadata-backed dashboard is solid.
- Avoid a fake monolith in `packages/cli`. CLI orchestration belongs there; long-lived server state does not.
- Avoid a separate always-on background daemon. Follow the repo research direction: on-demand dev process started by `fiction-map dev`, local-only by default.
- Use push notifications for file changes. Polling would be a regression against the stated hot-reload experience.
- Treat click-to-code as a first-class API with graceful failure; do not hardwire one editor or assume a shell-specific `open` flow.
- Treat `metadata/refresh` as a request-surface operation that joins the current refresh or starts one if idle. Do not let the RPC layer implicitly queue extra refresh cycles; watcher-driven invalidation should call a distinct queued-refresh path in state.
- Treat `graph/get` missing ids as JSON-RPC errors, not nullable success envelopes. `graph/list` is the discovery surface; `graph/get` is a strict lookup.
- Expose one dashboard protocol surface for Milestone 4: JSON-RPC over WebSocket, plus a minimal HTTP health endpoint for readiness/debugging. Do not add a parallel HTTP JSON API in the first slice.

## Task 1: Refactor Generator Reuse For Dev-Server Consumption

**Files:**
- Modify: `packages/cli/src/generator/index.ts`
- Modify: `packages/cli/src/commands/generate.ts`
- Test: `packages/cli/src/generator/index.test.ts`

- [ ] Split pure metadata generation from CLI logging so the dev server can refresh metadata in-process without reusing command-side console behavior.
- [ ] Add or update tests that cover the reusable API contract: successful metadata generation, output file writing where intended, and failure propagation.
- [ ] Run `bun test packages/cli/src/generator/index.test.ts` or the package-level equivalent and verify the refactor does not break `generate`.

## Task 2: Add A Dedicated Dev-Server Package

**Files:**
- Create: `packages/dev-server/package.json`
- Create: `packages/dev-server/tsconfig.json`
- Create: `packages/dev-server/src/index.ts`
- Create: `packages/dev-server/src/config.ts`
- Create: `packages/dev-server/src/state.ts`

- [ ] Create the workspace package for the long-lived dev runtime instead of embedding watcher/server/state logic directly into CLI files.
- [ ] Define a `DevServerState` abstraction that owns current metadata, last refresh timestamp, refresh-in-flight state, and refresh errors.
- [ ] Wire the package to depend only on what it actually needs: the reusable generator API, Bun/Node standard library primitives, and any lightweight helpers.
- [ ] Run package typecheck to confirm the new boundary is valid before transport and watcher code are added.

## Task 3: Define The RPC Contract Before Implementing Transport

**Files:**
- Create: `packages/dev-server/src/protocol.ts`
- Create: `packages/dev-server/src/rpc.ts`
- Test: `packages/dev-server/src/server.test.ts`

- [ ] Define the initial JSON-RPC surface explicitly: `metadata/get`, `metadata/refresh`, `graph/list`, `graph/get`, `definition/open`, and `notify/metadata-changed`.
- [ ] Keep response payloads metadata-backed and concrete; do not invent playtest or trace payloads yet beyond documented placeholders.
- [ ] Add tests for method dispatch, invalid method handling, and notification payload shape so the browser client is coding against something stable.
- [ ] Review the protocol against `docs/NORTH_STAR.md` and the previous transcript to make sure graph view, catalog view, validation, and click-to-code are all supported by the first contract.

## Task 4: Implement The Dev Server, Watcher, And Broadcast Path

**Files:**
- Create: `packages/dev-server/src/server.ts`
- Create: `packages/dev-server/src/watcher.ts`
- Modify: `packages/dev-server/src/state.ts`
- Test: `packages/dev-server/src/server.test.ts`

- [ ] Implement a local Bun server that serves a health endpoint plus a WebSocket endpoint for JSON-RPC.
- [ ] Implement debounced file watching for `*.node.ts`, `*.edge.ts`, `*.condition.ts`, `*.effect.ts`, and `*.graph.ts`, excluding `node_modules`, generated output, and build directories.
- [ ] On refresh success, update the metadata snapshot and broadcast `notify/metadata-changed`; on refresh failure, preserve the prior good snapshot and expose the error state.
- [ ] Add tests that prove a refresh notification is broadcast after a watched change and that bad refreshes do not crash the process or erase the last valid metadata.

## Task 5: Add Click-To-Code As A Supported Server Capability

**Files:**
- Create: `packages/dev-server/src/open-editor.ts`
- Modify: `packages/dev-server/src/protocol.ts`
- Modify: `packages/dev-server/src/rpc.ts`
- Test: `packages/dev-server/src/server.test.ts`

- [ ] Implement `definition/open` so the dashboard can request a source location jump using metadata file, line, and column.
- [ ] Support an explicit `--editor` option or environment-based editor detection before falling back to platform defaults.
- [ ] Return structured success and failure responses so the UI can show when a location cannot be opened instead of silently failing.
- [ ] Test command construction and failure paths without launching a real editor process.

## Task 6: Add The Dashboard App Package And Live Data Client

**Files:**
- Create: `packages/dashboard/package.json`
- Create: `packages/dashboard/tsconfig.json`
- Create: `packages/dashboard/vite.config.ts`
- Create: `packages/dashboard/index.html`
- Create: `packages/dashboard/src/main.tsx`
- Create: `packages/dashboard/src/App.tsx`
- Create: `packages/dashboard/src/lib/rpc-client.ts`
- Create: `packages/dashboard/src/hooks/useMetadata.ts`

- [ ] Create a dedicated dashboard app package rather than hiding the UI inside generated server strings or a CLI-owned HTML blob.
- [ ] Implement a minimal browser RPC client that can fetch metadata, issue refresh requests, and subscribe to metadata-changed notifications with reconnect support.
- [ ] Build `useMetadata` around the protocol contract: initial load, loading state, refresh state, reconnect state, and server error state.
- [ ] Run the dashboard package typecheck and any package-local tests before moving on to graph rendering.

## Task 7: Build The First Honest Dashboard Slice

**Files:**
- Create: `packages/dashboard/src/lib/metadata.ts`
- Create: `packages/dashboard/src/components/GraphPanel.tsx`
- Create: `packages/dashboard/src/components/CatalogPanel.tsx`
- Create: `packages/dashboard/src/components/ValidationPanel.tsx`
- Create: `packages/dashboard/src/components/DefinitionDetails.tsx`
- Test: `packages/dashboard/src/components/__tests__/...`

- [ ] Adapt `GraphMetadata` into `@xyflow/react` node and edge models instead of bypassing the metadata layer with example-only code.
- [ ] Render graph visualization using `@fiction-map/visualize`, plus catalog and validation panels from the same live metadata source.
- [ ] Add selection details that show source location and can invoke `definition/open`.
- [ ] Cover loading, empty metadata, refresh, and validation-error states with UI tests so the first dashboard slice is resilient rather than demo-only.

## Task 8: Wire `fiction-map dev` End To End

**Files:**
- Modify: `packages/cli/src/cli.ts`
- Create: `packages/cli/src/commands/dev.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/package.json`
- Modify: `package.json`

- [ ] Add `fiction-map dev` to the CLI with options for `--root-dir`, `--port`, `--open`, and `--editor`.
- [ ] Have the command start the dev server against the requested root, then either serve the built dashboard assets or proxy to a dashboard dev server, depending on mode.
- [ ] Make startup behavior explicit: print dashboard URL, show refresh status, and fail loudly on port conflicts or invalid root directories.
- [ ] Add at least one CLI-level smoke test or scripted verification path that proves the command boots and exposes the expected endpoint.

## Task 9: Verify The Vertical Slice Against The Example Project

**Files:**
- Modify: `examples/story/...` only if needed for realistic validation coverage
- Test: integration scripts or package tests added during Milestone 4

- [ ] Run `fiction-map dev` against `examples/story` and verify that the dashboard loads current metadata, renders the graph, shows catalog entries, and exposes validation state.
- [ ] Edit a watched example file and verify the dashboard updates through `notify/metadata-changed` rather than requiring a page reload.
- [ ] Trigger click-to-code from the dashboard and verify a source location opens or a structured error is surfaced.
- [ ] Capture any gaps found during this manual integration pass as follow-up issues before claiming Milestone 4’s first slice is done.

## Task 10: Close The Slice With Docs And Guardrails

**Files:**
- Modify: `README.md`
- Modify: `docs/NORTH_STAR.md`
- Create or modify: package READMEs for any new packages

- [ ] Document the real `fiction-map dev` workflow, what it currently supports, and what is still intentionally out of scope for Milestone 4.
- [ ] Update milestone wording so graph view, catalog, validation, notifications, and click-to-code are marked according to the implemented slice, while playtest and traces remain pending if they were not built.
- [ ] Add troubleshooting notes for root directory scanning, port conflicts, and editor integration failures.
- [ ] Run the full workspace verification pass: `bun test`, `bun typecheck`, and the agreed manual dashboard smoke test before closing the milestone slice.

## Risks To Watch

- Generator metadata and dashboard UI can drift if the view-model layer is not explicit.
- File watching can become noisy if generated files or build outputs are included in the watch set.
- Click-to-code becomes brittle if file paths are not normalized relative to the scanned root.
- Trying to add playtest/traces in the same slice will likely overload the first Milestone 4 delivery and blur verification.

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9
10. Task 10
