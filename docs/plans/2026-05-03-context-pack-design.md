# Context Pack Design

> Planning artifact for the post-Task-4 dashboard direction. This document defines the context-pack model before dashboard implementation begins.

## Why This Exists

Fiction Map's next dashboard slice is not primarily a code-navigation tool. Its job is to make the platform legible to:

- humans trying to understand how the system works
- LLMs trying to reason about the codebase and propose or execute changes

That means the dashboard should not default to giant prompt dumps or raw repository export. It should produce high-signal context packs that:

- summarize the system at the right abstraction level
- identify the most important files and docs to inspect next
- preserve provenance so claims are grounded in real metadata and canonical documentation
- remain small enough to be useful as LLM input

## Product Goal

Enable a user to open `fiction-map dev`, inspect the project as a system, and copy a context pack that gives another human or model a strong starting point for understanding or modifying the platform.

The core output is not "the entire repo in one prompt". The core output is a set of guided, copyable context bundles with clear next-look instructions.

## Non-Goals

- Replace repository search, file reading, or deeper retrieval
- Inline the entire codebase into one architecture summary
- Solve general-purpose prompt engineering for every downstream model
- Depend on editor integration or click-to-code
- Hide uncertainty when metadata is incomplete or stale

## Design Principles

### 1. Layered, not monolithic

Whole-project summary is allowed, but it must stay top-level and directional. Detailed reasoning should move into smaller context packs rather than bloating one mega-pack.

### 2. Metadata-first, docs-assisted

Use live metadata as the primary structured source for graph system facts. Use curated repo docs and selected file references to explain architecture and mechanics that are not present in generated metadata.

### 3. Provenance matters

Every strong claim should be traceable to one of:

- live metadata
- canonical docs
- explicit file references

Context packs should tell the reader what to inspect next, not just what to believe.

### 4. High-signal token budget

Context packs must optimize for usefulness, not completeness. They should summarize structure and point outward to the next relevant evidence.

### 5. Pure derivation

Context-pack generation should be deterministic application logic, not UI-only prose assembled ad hoc in components. The UI renders packs; generation logic owns their content.

## Intended User Workflows

### Workflow A: Human orientation

1. Open dashboard
2. Read whole-project architecture summary
3. Inspect graph, catalog, validation, or runtime surface
4. Copy a context pack
5. Continue investigation in the referenced files/docs

### Workflow B: LLM bootstrap

1. Open dashboard
2. Choose the relevant pack type
3. Copy a context pack into an LLM
4. Use the pack's suggested prompt to guide the model toward the next files/docs
5. Let the model load more detail as needed

### Workflow C: Change planning

1. Open dashboard
2. Identify the relevant subsystem
3. Copy a subsystem-focused pack
4. Ask an LLM for design review, implementation plan, or code change guidance using the pack as starting context

## Default Intent

The default dashboard copy action should optimize for `orientation`.

Why:

- the immediate product goal is architecture legibility
- orientation keeps context packs smaller and less speculative
- planning and implementation prompts become more useful only after the reader or model has the right architectural map

The generation layer should still support other intents later, but the first implementation should treat `orientation` as the default pack mode.

## Pack Types

The first slice should support a small fixed set of pack types.

Implementation priority for the first slice:

1. Project Summary Pack
2. Dev Runtime Pack
3. Graph System Pack
4. Validation Pack

Only the first two should be required for the initial implementation slice. Graph System and Validation packs should be added after the dashboard surfaces they depend on are real and stable.

### 1. Project Summary Pack

Purpose:
- explain what Fiction Map is
- explain the main packages and runtime flow
- identify the canonical docs and entrypoints

Best for:
- "What is this repo?"
- "How is the platform organized?"
- "Where should I start reading?"

### 2. Graph System Pack

Purpose:
- explain node types, edge types, conditions, effects, graphs, and generated metadata
- explain how definitions become structured metadata

Best for:
- "How do graph definitions work?"
- "Where does graph data come from?"
- "What is generated versus handwritten?"

### 3. Dev Runtime Pack

Purpose:
- explain CLI, generator, dev-server, watcher, state, RPC, and dashboard flow
- explain refresh lifecycle and live-update mechanics

Best for:
- "How does `fiction-map dev` work?"
- "What refreshes what?"
- "Where is the boundary between CLI and long-lived runtime?"

### 4. Validation Pack

Purpose:
- explain what validation exists
- explain how issues surface in metadata and UI
- point to relevant runtime/generator logic

Best for:
- "How should I reason about errors and warnings?"
- "Where are validation results produced?"

### 5. Surface-Specific Packs

These are secondary packs tied to the active dashboard surface or selection.

Examples:
- selected graph pack
- selected node type pack
- selected edge type pack
- selected validation issue pack

These should come after the first four pack types are stable.

## Pack Schema

Every pack should follow the same high-level structure so both humans and LLMs learn a stable interface.

```ts
interface ContextPack {
  id: string
  title: string
  audience: "human" | "llm" | "both"
  intent: "orientation" | "explanation" | "planning" | "implementation"
  scope: "project" | "subsystem" | "selection"
  kind:
    | "project-summary"
    | "graph-system"
    | "dev-runtime"
    | "validation"
    | "graph-detail"
    | "node-type-detail"
    | "edge-type-detail"
    | "validation-issue-detail"
  summary: string
  purpose: string
  systemView: string[]
  keyConcepts: Array<{
    name: string
    explanation: string
  }>
  evidence: Array<{
    kind: "doc" | "code" | "metadata"
    label: string
    path: string
    reason: string
    priority: number
  }>
  nextLook: Array<{
    kind: "doc" | "code" | "metadata"
    label: string
    path: string
    reason: string
    focus: string
    priority: number
  }>
  implementationStatus?: string[]
  contextBlock: string
  promptSeed: string
  cautions?: string[]
}
```

## Schema Semantics

The schema should answer three different questions clearly:

- what this pack is for
- why the pack is saying these things
- where the reader or model should go next

### `audience`

Who this pack is optimized for.

- `human`: optimized for direct reading in the dashboard
- `llm`: optimized for copying into another model
- `both`: should work reasonably for both cases

For the first slice, most packs should be `both`.

### `intent`

What kind of downstream task the pack is meant to support.

- `orientation`: understand the repo or subsystem
- `explanation`: explain how something works
- `planning`: propose or review a change approach
- `implementation`: begin a concrete code change task

This matters because prompt framing should differ by intent.

### `scope`

How broad the pack is.

- `project`: whole-repo or top-level architecture
- `subsystem`: graph system, dev runtime, validation
- `selection`: selected graph, type, or issue

This keeps whole-project packs from pretending to answer selection-level questions.

## Required Pack Fields

### `summary`

One short paragraph. It should explain what this pack is about and why it matters.

### `purpose`

A one-line statement of when to use the pack.

### `systemView`

A short list of structural statements. These should describe boundaries, flows, or relationships.

Good:
- "`packages/cli` is the user-facing entrypoint, while `packages/dev-server` owns long-lived state and transport."

Bad:
- "The repo is cool and has many parts."

### `keyConcepts`

A small list of named concepts with plain explanations.

Examples:
- generated metadata
- refresh cycle
- graph definition
- validation issue
- context pack provenance

### `evidence`

Files or docs that justify the pack's claims. These are not necessarily the next things to read in depth; they are the sources behind the summary.

This section answers:
- why is this pack making these claims?

It should justify the pack, not prescribe the reading order.

### `nextLook`

The most important part of the pack for downstream LLM use. These are the files/docs someone should inspect next to get real grounding.

This section keeps the pack from pretending to be complete.

This section answers:
- what should I inspect next?
- what specifically should I pay attention to there?

### `implementationStatus`

Optional, but recommended for milestone-stage packs.

This section distinguishes:
- stable architectural facts
- what is currently implemented
- what is still planned or pending

Without this distinction, packs will drift into mixing enduring architecture with temporary milestone state.

### `contextBlock`

A richer, copyable block that contains the structured pack content in plain text form. This is the main export for downstream LLM use.

### `promptSeed`

A shorter instruction block that:

- states the user's likely goal
- tells the model what files/docs to inspect first
- asks for a bounded outcome such as summary, plan, or implementation guidance

### `cautions`

Optional warnings about limitations, stale assumptions, partial implementation, or areas where docs and code may drift.

## Pack Size Limits

Whole-project packs must have hard limits or they will drift into low-signal dumps.

Default limits for the first slice:

- `summary`: 80 words max
- `systemView`: 5 items max
- `keyConcepts`: 6 items max
- `evidence`: 6 items max
- `nextLook`: 6 items max
- `implementationStatus`: 5 items max
- `promptSeed`: 220 words max
- `contextBlock`: target 400 to 900 words depending on pack scope

Selection-level packs should usually be shorter than project-level packs.

## Source Inputs

Context packs should be generated from two input classes.

### A. Live metadata inputs

Use generated metadata for:

- node types
- edge types
- conditions
- effects
- graphs
- validation summary
- source locations contained in metadata

These are the most reliable inputs for current graph-system structure.

### B. Curated repo references

Use curated docs and selected code files for:

- package responsibilities
- runtime flow
- milestone intent
- architecture decisions
- implementation boundaries not carried in metadata

Initial curated sources should be explicit and small:

- `README.md`
- `docs/NORTH_STAR.md`
- `docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md`
- `packages/cli/src/cli.ts`
- `packages/cli/src/generator/index.ts`
- `packages/dev-server/src/config.ts`
- `packages/dev-server/src/state.ts`
- `packages/dev-server/src/protocol.ts`
- `packages/dev-server/src/rpc.ts`
- `packages/dev-server/src/server.ts`
- `packages/dev-server/src/watcher.ts`

This list should be owned in code as curated references, not discovered implicitly by broad filesystem scans.

## Curated Source Sets By Pack Type

The first slice should not use one flat source pool for every pack. Each pack type should have an explicit curated source set.

### Project Summary Pack

- `README.md`
- `docs/NORTH_STAR.md`
- `docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md`
- `packages/cli/src/cli.ts`
- `packages/dev-server/src/server.ts`

### Graph System Pack

- live metadata snapshot
- `packages/cli/src/generator/index.ts`
- `README.md`
- `docs/design/conceptual-guide.md`

### Dev Runtime Pack

- `packages/cli/src/cli.ts`
- `packages/cli/src/generator/index.ts`
- `packages/dev-server/src/config.ts`
- `packages/dev-server/src/state.ts`
- `packages/dev-server/src/protocol.ts`
- `packages/dev-server/src/rpc.ts`
- `packages/dev-server/src/server.ts`
- `packages/dev-server/src/watcher.ts`
- `docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md`

### Validation Pack

- live metadata snapshot
- validation-related generator/runtime sources once identified explicitly in implementation
- `docs/NORTH_STAR.md`

These source sets should be represented in code as pack-type-specific configuration, not inferred dynamically.

## Generation Model

Context-pack generation should be a pure derived layer:

1. collect live metadata snapshot
2. collect curated repo references
3. build typed intermediate view-models
4. derive pack content from those view-models
5. render packs in the UI

The generator should not:

- read arbitrary repository files at render time
- depend on component-local prose assembly
- infer broad architectural meaning from a single selected graph

## Whole-Project Architecture Summary

Yes, this is possible, but it must stay bounded.

The whole-project pack should include:

- what the platform does
- the main packages and their responsibilities
- the dev-time flow from definitions to metadata to server to dashboard
- current milestone status
- the canonical docs/files to inspect next

It should not:

- include giant file excerpts
- enumerate every source file
- try to explain every subsystem equally deeply

The whole-project pack is a map, not a dump.

## Suggested Prompt Design

Suggested prompts should be instruction-shaped, not just descriptive text.

They should:

- name the user's likely task
- define the first files/docs to inspect
- request a bounded output

Example shape:

```text
You are reviewing Fiction Map's dev-time architecture.

Start by reading:
- docs/NORTH_STAR.md
- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md
- packages/dev-server/src/state.ts
- packages/dev-server/src/server.ts

Then explain:
1. how metadata flows from source definitions to the dashboard
2. where long-lived state lives
3. what would need to change to add a new dashboard surface

Do not summarize the whole repository. Focus only on the dev runtime and dashboard boundary.
```

## Context Block Design

`contextBlock` should be the fuller copyable export.

Recommended shape:

```text
Title: <pack title>
Purpose: <when to use this pack>
Intent: <orientation | explanation | planning | implementation>

Summary:
<short paragraph>

System View:
- ...
- ...

Key Concepts:
- Concept: explanation
- Concept: explanation

Current Implementation Status:
- ...
- ...

Evidence:
- path — why it matters

Inspect Next:
- path — what to focus on there

Cautions:
- ...
```

This keeps the export structured without pretending it is a complete repository snapshot.

## Good Pack vs Bad Pack

### Good Pack

- concise summary
- explicit subsystem boundary
- references canonical files/docs
- points to the next three to six places to inspect
- ends with a usable prompt seed

### Bad Pack

- giant wall of text
- vague claims with no references
- too much raw implementation detail
- no guidance on what to inspect next
- no distinction between stable architecture and pending milestone work

## UI Requirements

The dashboard should present packs as copyable artifacts, not hidden implementation detail.

Minimum UI behavior:

- show pack title and purpose
- render summary, system view, concepts, evidence, and next-look sections
- provide a "copy prompt seed" action
- provide a "copy full context pack" action
- clearly distinguish source evidence from suggested next reading

The UI should not imply that a copied pack is complete context. It should visually reinforce that the pack is a starting point.

## Validation Criteria

Before implementation is considered good, packs should be checked against these questions:

1. Can a human understand the pack without opening code immediately?
2. Can an LLM use the pack to identify the correct next files/docs to inspect?
3. Does the pack avoid pretending to cover the whole repo exhaustively?
4. Are the key claims grounded in live metadata or curated references?
5. Is the pack still useful when the repo grows?

## Initial Implementation Boundary

The first implementation slice should stop at:

- dashboard app package
- live metadata client
- human-readable dashboard surfaces
- deterministic context-pack generation for Project Summary and Dev Runtime packs
- copyable context pack and prompt seed UI

It should not include:

- editor launching
- broad prompt customization
- user-authored pack templates
- pack export to external services
- first-slice support for every possible pack type

## Canonical Example: Project Summary Pack

This example is intentionally concrete. It should be used to validate whether the schema is actually useful before implementation begins.

```ts
const exampleProjectSummaryPack: ContextPack = {
  id: "project-summary",
  title: "Fiction Map Project Summary",
  audience: "both",
  intent: "orientation",
  scope: "project",
  kind: "project-summary",
  summary:
    "Fiction Map is a framework for defining graph-based systems in code and surfacing their structure through generated metadata, validation, runtime tooling, and a planned dashboard. The current Milestone 4 work has a real generator and dev-server foundation in place, while the dashboard and context-pack surfaces are the next delivery step.",
  purpose:
    "Use this pack when you need a high-level understanding of what the repository does, how the main packages are divided, and where to start reading next.",
  systemView: [
    "`packages/cli` is the user-facing entrypoint for generation today and will eventually own `fiction-map dev` orchestration.",
    "`packages/dev-server` owns long-lived dev-time state, metadata refresh, watcher behavior, RPC contract, and WebSocket transport.",
    "Generated metadata is the bridge between handwritten graph definitions and the future dashboard surfaces.",
    "The dashboard direction is now focused on architecture legibility and LLM-oriented context packs rather than click-to-code.",
    "Milestone 4 is partially implemented: generator reuse, RPC, transport, watcher, and the dashboard shell are real; context-pack content and CLI orchestration are still pending.",
  ],
  keyConcepts: [
    {
      name: "generated metadata",
      explanation:
        "Structured project information derived from graph definitions and used as the main dashboard input.",
    },
    {
      name: "dev server",
      explanation:
        "The long-lived local process that owns metadata refresh, watch invalidation, RPC, and client notifications.",
    },
    {
      name: "dashboard legibility",
      explanation:
        "The goal of making platform mechanics understandable to humans and LLMs without forcing direct code navigation first.",
    },
    {
      name: "context pack",
      explanation:
        "A copyable, provenance-backed context bundle that summarizes a subsystem and tells the reader what to inspect next.",
    },
  ],
  evidence: [
    {
      kind: "doc",
      label: "README product overview",
      path: "README.md",
      reason: "Defines the framework's purpose and the intended `fiction-map dev` experience.",
      priority: 1,
    },
    {
      kind: "doc",
      label: "North Star",
      path: "docs/NORTH_STAR.md",
      reason: "Captures the intended product experience and milestone framing.",
      priority: 2,
    },
    {
      kind: "doc",
      label: "Current Milestone 4 plan",
      path: "docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md",
      reason: "Shows the current implementation order and what remains pending.",
      priority: 3,
    },
    {
      kind: "code",
      label: "Dev server transport",
      path: "packages/dev-server/src/server.ts",
      reason: "Shows the current live runtime boundary between metadata state and dashboard transport.",
      priority: 4,
    },
  ],
  nextLook: [
    {
      kind: "doc",
      label: "Read the product direction",
      path: "docs/NORTH_STAR.md",
      reason: "This explains the intended developer experience and why the dashboard exists.",
      focus: "Look for the Milestone 4 goals and the developer workflow around `fiction-map dev`.",
      priority: 1,
    },
    {
      kind: "doc",
      label: "Read the current execution plan",
      path: "docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md",
      reason: "This shows what is done versus what is still planned.",
      focus: "Look at Tasks 5 through 10, especially the dashboard and context-pack work.",
      priority: 2,
    },
    {
      kind: "code",
      label: "Inspect dev runtime state",
      path: "packages/dev-server/src/state.ts",
      reason: "This is where refresh lifecycle and last-good-metadata behavior are defined.",
      focus: "Look at refresh versus queued refresh semantics.",
      priority: 3,
    },
    {
      kind: "code",
      label: "Inspect transport boundary",
      path: "packages/dev-server/src/server.ts",
      reason: "This shows how the current dashboard will receive live data.",
      focus: "Look at health endpoint, WebSocket JSON-RPC handling, and metadata-changed broadcasts.",
      priority: 4,
    },
  ],
  implementationStatus: [
    "Generator reuse is implemented.",
    "Dev-server config, state, RPC, server, and watcher are implemented.",
    "Dashboard app package and metadata shell are implemented.",
    "Context-pack generation is not implemented yet.",
    "Editor integration is deferred rather than a current milestone requirement.",
  ],
  contextBlock: `Title: Fiction Map Project Summary
Purpose: Use this pack to understand what the repository does, how the main packages are divided, and where to inspect next.
Intent: orientation

Summary:
Fiction Map is a framework for defining graph-based systems in code and surfacing their structure through generated metadata, validation, runtime tooling, and a planned dashboard. The current Milestone 4 work has a real generator and dev-server foundation in place, while the dashboard and context-pack surfaces are the next delivery step.

System View:
- packages/cli is the user-facing entrypoint for generation today and will eventually own fiction-map dev orchestration.
- packages/dev-server owns long-lived dev-time state, metadata refresh, watcher behavior, RPC contract, and WebSocket transport.
- Generated metadata is the bridge between handwritten graph definitions and the future dashboard surfaces.
- The dashboard direction is now focused on architecture legibility and LLM-oriented context packs rather than click-to-code.
- Milestone 4 is partially implemented: generator reuse, RPC, transport, watcher, and the dashboard shell are real; context-pack content and CLI orchestration are still pending.

Key Concepts:
- generated metadata: structured project information derived from graph definitions and used as the main dashboard input.
- dev server: the long-lived local process that owns metadata refresh, watch invalidation, RPC, and client notifications.
- dashboard legibility: making platform mechanics understandable to humans and LLMs without forcing direct code navigation first.
- context pack: a copyable, provenance-backed context bundle that summarizes a subsystem and tells the reader what to inspect next.

Current Implementation Status:
- Generator reuse is implemented.
- Dev-server config, state, RPC, server, and watcher are implemented.
- Dashboard app package and metadata shell are implemented.
- Context-pack generation is not implemented yet.
- Editor integration is deferred rather than a current milestone requirement.

Evidence:
- README.md — defines the framework's purpose and intended dev experience.
- docs/NORTH_STAR.md — defines the intended product experience and milestone framing.
- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md — shows the current implementation order and pending work.
- packages/dev-server/src/server.ts — shows the current dev runtime transport boundary.

Inspect Next:
- docs/NORTH_STAR.md — review the intended developer workflow and Milestone 4 goals.
- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md — review what is done versus what remains.
- packages/dev-server/src/state.ts — inspect refresh lifecycle and last-good-metadata behavior.
- packages/dev-server/src/server.ts — inspect health endpoint, WebSocket RPC handling, and metadata-changed broadcasts.

Cautions:
- This pack is an orientation artifact, not a full repository summary.
- Context-pack generation and richer dashboard content are still planned work, not current implementation.`,
  promptSeed: `You are reviewing Fiction Map at the architecture level.\n\nStart by reading:\n- docs/NORTH_STAR.md\n- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md\n- packages/dev-server/src/state.ts\n- packages/dev-server/src/server.ts\n\nThen produce a concise architecture summary that explains:\n1. what the main packages are responsible for\n2. how metadata flows toward the future dashboard\n3. what parts of Milestone 4 are already implemented versus still pending\n\nDo not summarize the whole repository exhaustively. Focus on the top-level architecture and the current dev-runtime boundary.`,
  cautions: [
    "This pack is a starting point, not a complete repository export.",
    "Some milestone plan language still refers to click-to-code historically, but current direction prioritizes architecture legibility and context packs.",
  ],
}
```

## Canonical Example: Dev Runtime Pack

This example tests the same schema against a narrower and more implementation-facing subsystem. If the model works here too, it is much safer to let it guide dashboard work.

```ts
const exampleDevRuntimePack: ContextPack = {
  id: "dev-runtime",
  title: "Fiction Map Dev Runtime",
  audience: "both",
  intent: "orientation",
  scope: "subsystem",
  kind: "dev-runtime",
  summary:
    "Fiction Map's current dev runtime is the local path from generated metadata to a live dashboard transport. The CLI is still incomplete for `fiction-map dev`, but the reusable generator boundary, dev-server state model, watcher, JSON-RPC contract, and WebSocket transport are already implemented.",
  purpose:
    "Use this pack when you need to understand how live metadata refresh, server state, watcher invalidation, and dashboard transport fit together.",
  systemView: [
    "`packages/cli` owns command orchestration, but long-lived runtime state does not live there.",
    "`packages/dev-server/src/state.ts` owns current metadata, refresh lifecycle, queued invalidation, and last-good-state behavior.",
    "`packages/dev-server/src/server.ts` owns HTTP health, WebSocket transport, and metadata-changed broadcasts to clients.",
    "`packages/dev-server/src/watcher.ts` converts filesystem changes into debounced invalidation events for supported graph-definition file types.",
    "The dashboard shell is implemented, but the runtime-facing architecture content and CLI orchestration are still incomplete.",
  ],
  keyConcepts: [
    {
      name: "refresh versus queued refresh",
      explanation:
        "Manual refresh joins or starts the active cycle, while watcher invalidation queues a follow-up cycle when work is already in flight.",
    },
    {
      name: "last good metadata",
      explanation:
        "A failed refresh does not erase the last valid metadata snapshot; the error is surfaced while the previous good state remains available.",
    },
    {
      name: "JSON-RPC contract",
      explanation:
        "The server uses a typed JSON-RPC layer for metadata access, graph lookup, refresh requests, and dashboard notifications.",
    },
    {
      name: "watcher filtering",
      explanation:
        "Only supported graph-definition file types trigger debounced refresh behavior, while excluded build/generated paths are ignored.",
    },
  ],
  evidence: [
    {
      kind: "code",
      label: "Dev server state lifecycle",
      path: "packages/dev-server/src/state.ts",
      reason: "Defines refresh semantics, queued refresh behavior, and error preservation.",
      priority: 1,
    },
    {
      kind: "code",
      label: "RPC protocol contract",
      path: "packages/dev-server/src/protocol.ts",
      reason: "Defines the wire-level request, response, and notification surface.",
      priority: 2,
    },
    {
      kind: "code",
      label: "RPC dispatcher",
      path: "packages/dev-server/src/rpc.ts",
      reason: "Shows how requests are adapted into state reads, refresh behavior, and errors.",
      priority: 3,
    },
    {
      kind: "code",
      label: "Server transport",
      path: "packages/dev-server/src/server.ts",
      reason: "Shows the health endpoint, WebSocket transport, watcher integration, and notification broadcasts.",
      priority: 4,
    },
    {
      kind: "code",
      label: "Watcher boundary",
      path: "packages/dev-server/src/watcher.ts",
      reason: "Shows supported file patterns, exclusions, and debounce handling.",
      priority: 5,
    },
    {
      kind: "doc",
      label: "Milestone 4 execution plan",
      path: "docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md",
      reason: "Explains what has already been built and what remains to complete the dashboard slice.",
      priority: 6,
    },
  ],
  nextLook: [
    {
      kind: "code",
      label: "Inspect state lifecycle",
      path: "packages/dev-server/src/state.ts",
      reason: "This is the core of refresh semantics and snapshot preservation.",
      focus: "Look at `refresh()`, `queueRefresh()`, `refreshTask()`, and `queueRefreshTask()` semantics.",
      priority: 1,
    },
    {
      kind: "code",
      label: "Inspect transport and watcher integration",
      path: "packages/dev-server/src/server.ts",
      reason: "This is where watcher-driven invalidation becomes client-visible runtime behavior.",
      focus: "Look at watcher creation, metadata-changed broadcasting, startup failure handling, and WebSocket request handling.",
      priority: 2,
    },
    {
      kind: "code",
      label: "Inspect the watcher filter",
      path: "packages/dev-server/src/watcher.ts",
      reason: "This explains which filesystem events actually matter to the runtime.",
      focus: "Look at supported suffixes, excluded path segments, and debounce logic.",
      priority: 3,
    },
    {
      kind: "code",
      label: "Inspect protocol and dispatch",
      path: "packages/dev-server/src/protocol.ts",
      reason: "This defines what the dashboard client will be allowed to ask for.",
      focus: "Look at metadata, graph, and notification types plus error taxonomy.",
      priority: 4,
    },
    {
      kind: "doc",
      label: "Inspect remaining milestone tasks",
      path: "docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md",
      reason: "This clarifies what is still missing before `fiction-map dev` is end-to-end.",
      focus: "Look at Tasks 5 through 10, especially the dashboard app and context-pack steps.",
      priority: 5,
    },
  ],
  implementationStatus: [
    "Generator reuse for in-process metadata refresh is implemented.",
    "Dev-server config, state, watcher, RPC, and server transport are implemented.",
    "The dashboard app package and metadata shell are implemented.",
    "The CLI does not yet provide a real `fiction-map dev` command.",
    "Context packs are defined in planning docs only, not in code.",
  ],
  contextBlock: `Title: Fiction Map Dev Runtime
Purpose: Use this pack to understand how live metadata refresh, server state, watcher invalidation, and dashboard transport fit together.
Intent: orientation

Summary:
Fiction Map's current dev runtime is the local path from generated metadata to a live dashboard transport. The CLI is still incomplete for fiction-map dev, but the reusable generator boundary, dev-server state model, watcher, JSON-RPC contract, and WebSocket transport are already implemented.

System View:
- packages/cli owns command orchestration, but long-lived runtime state does not live there.
- packages/dev-server/src/state.ts owns current metadata, refresh lifecycle, queued invalidation, and last-good-state behavior.
- packages/dev-server/src/server.ts owns HTTP health, WebSocket transport, and metadata-changed broadcasts to clients.
- packages/dev-server/src/watcher.ts converts filesystem changes into debounced invalidation events for supported graph-definition file types.
- The dashboard shell is implemented, but the runtime-facing architecture content and CLI orchestration are still incomplete.

Key Concepts:
- refresh versus queued refresh: manual refresh joins or starts the active cycle, while watcher invalidation queues a follow-up cycle when work is already in flight.
- last good metadata: a failed refresh does not erase the last valid metadata snapshot; the error is surfaced while the previous good state remains available.
- JSON-RPC contract: the server uses a typed JSON-RPC layer for metadata access, graph lookup, refresh requests, and dashboard notifications.
- watcher filtering: only supported graph-definition file types trigger debounced refresh behavior, while excluded build/generated paths are ignored.

Current Implementation Status:
- Generator reuse for in-process metadata refresh is implemented.
- Dev-server config, state, watcher, RPC, and server transport are implemented.
- The dashboard app package and metadata shell are implemented.
- The CLI does not yet provide a real fiction-map dev command.
- Context packs are defined in planning docs only, not in code.

Evidence:
- packages/dev-server/src/state.ts — defines refresh semantics, queued refresh behavior, and error preservation.
- packages/dev-server/src/protocol.ts — defines the wire-level request, response, and notification surface.
- packages/dev-server/src/rpc.ts — shows how requests are adapted into state reads, refresh behavior, and errors.
- packages/dev-server/src/server.ts — shows the health endpoint, WebSocket transport, watcher integration, and notification broadcasts.
- packages/dev-server/src/watcher.ts — shows supported file patterns, exclusions, and debounce handling.
- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md — explains what has been built and what remains.

Inspect Next:
- packages/dev-server/src/state.ts — inspect refresh, queued refresh, and last-good-metadata behavior.
- packages/dev-server/src/server.ts — inspect watcher integration, broadcast behavior, startup failure handling, and WebSocket request handling.
- packages/dev-server/src/watcher.ts — inspect supported file patterns and excluded path logic.
- packages/dev-server/src/protocol.ts — inspect request, response, notification, and error types.
- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md — inspect what remains to complete the dashboard slice.

Cautions:
- This pack explains the runtime boundary, not the future dashboard UI.
- The CLI orchestration step for fiction-map dev is still pending, so the end-to-end user command is not real yet.`,
  promptSeed: `You are reviewing Fiction Map's dev runtime.\n\nStart by reading:\n- packages/dev-server/src/state.ts\n- packages/dev-server/src/server.ts\n- packages/dev-server/src/watcher.ts\n- packages/dev-server/src/protocol.ts\n- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md\n\nThen explain:\n1. how refresh lifecycle works\n2. how watcher invalidation reaches clients\n3. what remains to make fiction-map dev a complete end-to-end workflow\n\nDo not summarize the whole repository. Focus on the dev runtime boundary and the missing dashboard/CLI pieces.`,
  cautions: [
    "This pack describes current dev-runtime implementation, not the final user-facing dashboard workflow.",
    "The runtime is real through transport, notifications, and the basic dashboard shell, but richer architecture content and CLI orchestration are still pending.",
  ],
}
```

## Follow-Up Questions For Review

- Is the first pack set correct, or should project summary and dev runtime be merged initially?
- Do we want one whole-project pack only, or one pack plus surface-scoped packs in the same first slice?
- Should the suggested prompt emphasize explanation, planning, or implementation by default?
