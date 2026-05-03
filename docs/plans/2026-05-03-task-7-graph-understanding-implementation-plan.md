# Task 7 Graph Understanding Implementation Plan

## Goal

Build the first canonical dashboard understanding model for Fiction Map graphs, then use that model to drive the first visual graph-and-catalog surfaces.

Task 7 is not “add more UI.” It is the phase where the dashboard graduates from orientation packs over raw metadata into a shared graph-system model that multiple surfaces can trust.

## Why This Is The Next Step

Task 6 proved three important things:

- live metadata transport is real
- context-pack generation can be deterministic and reviewable
- the dashboard can render trustworthy project state from the dev server

What it does not yet provide is Encore-level understanding. The dashboard still lacks a canonical internal model of:

- graph entities
- relationships and usage
- validation mappings
- selection-aware views

Without that layer, graph canvas, catalog, validation, and future selection packs will drift into separate interpretations of metadata.

## Scope

### In scope

- build a canonical dashboard graph-understanding model
- normalize graphs, node types, edge types, conditions, and effects
- derive cross-reference and usage data once
- derive validation mappings once
- introduce shared dashboard selection state
- render the first graph catalog and graph canvas surfaces from the shared model
- keep context packs as one consumer of the same model

### Out of scope

- playtest view
- trace viewer
- click-to-code
- visual graph editing
- broad prompt customization
- end-to-end `fiction-map dev` CLI wiring

## Architectural Decisions

### 1. Raw metadata is not the dashboard’s source of truth

The dashboard should consume `MetadataSnapshot`, but it should not let every surface read raw metadata directly.

The dashboard’s actual source of truth should become a canonical project model, for example:

```ts
interface DashboardProjectModel {
  snapshot: DashboardSnapshotState
  project: DashboardProjectFacts
  catalogs: DashboardCatalogs
  relationships: DashboardRelationships
  validation: DashboardValidationModel
}
```

That exact type name is flexible. The layer is not.

### 2. Relationships must be derived once

The following should be computed centrally:

- graph-to-node-type usage
- graph-to-edge-type usage
- graph-to-condition/effect usage
- node-type inbound/outbound edge relationships
- “used by graph” references for all definition types
- validation issue mappings

No panel should recompute these ad hoc.

### 3. Selection must become explicit state

Task 7 should introduce a shared selection model such as:

```ts
type DashboardSelection =
  | { kind: "project" }
  | { kind: "graph"; id: string }
  | { kind: "node-type"; id: string }
  | { kind: "edge-type"; id: string }
  | { kind: "condition"; id: string }
  | { kind: "effect"; id: string }
  | { kind: "validation-issue"; id: string }
```

The graph canvas, catalog, validation surfaces, and future selection-aware context packs should all read and update this state.

### 4. Graph rendering gets its own view-model boundary

`@fiction-map/visualize` should not receive raw graph metadata directly.

Task 7 should derive a graph-canvas-specific model that decides:

- node labels
- edge labels
- validation badges
- ending-state overlays
- stable selection ids

That keeps visualization concerns separate from canonical project understanding.

### 5. Validation is a first-class model concern

Validation must not remain a flat appendage to metadata.

Task 7 should explicitly support:

- project-wide validation totals
- graph-level validation summaries
- issue-to-graph mapping
- issue-to-node / issue-to-edge mapping when identifiers are available
- “issues affecting current selection” views

## File Plan

### New files

- `packages/dashboard/src/lib/project-model.ts`
  Responsibility: canonical normalized dashboard model derived from `MetadataSnapshot`
- `packages/dashboard/src/lib/project-model.test.ts`
  Responsibility: tests for normalization, cross-linking, and validation mapping
- `packages/dashboard/src/lib/selection.ts`
  Responsibility: shared selection types and reducer/helpers
- `packages/dashboard/src/lib/graph-canvas-model.ts`
  Responsibility: derive `@fiction-map/visualize`-friendly graph view-models from the project model
- `packages/dashboard/src/lib/graph-canvas-model.test.ts`
  Responsibility: tests for graph canvas projection
- `packages/dashboard/src/lib/catalog-model.ts`
  Responsibility: derive stable catalog lists and summaries from the project model
- `packages/dashboard/src/lib/catalog-model.test.ts`
  Responsibility: tests for catalog ordering and relationship views
- `packages/dashboard/src/components/GraphPanel.tsx`
  Responsibility: render selected graph canvas from the graph canvas model
- `packages/dashboard/src/components/CatalogPanel.tsx`
  Responsibility: render project graph/definition catalogs and drive selection
- `packages/dashboard/src/components/ValidationPanel.tsx`
  Responsibility: render validation summaries and selection-aware issue lists
- `packages/dashboard/src/components/SelectionDetails.tsx`
  Responsibility: render selection-aware structural details and provenance
- `packages/dashboard/src/components/DashboardWorkspace.tsx`
  Responsibility: compose catalog, graph, validation, and details around shared selection state

### Files to modify

- `packages/dashboard/src/App.tsx`
  Responsibility: upgrade top-level layout from pack-only shell to workspace + context-pack composition
- `packages/dashboard/src/lib/context-packs.ts`
  Responsibility: rebase future graph-system and validation packs on the canonical project model instead of raw metadata facts
- `packages/dashboard/src/lib/metadata.ts`
  Responsibility: either narrow to snapshot facts only or absorb into `project-model.ts` if the split becomes artificial

### Likely tests to add

- `packages/dashboard/src/App.test.tsx`
- `packages/dashboard/src/components/...test.tsx`

## Implementation Sequence

### Step 1: Build the canonical project model

Create `project-model.ts` that converts `MetadataSnapshot` into:

- snapshot state
- project facts
- normalized catalogs
- relationship maps
- validation mappings

Expected outputs include:

- records by id for graphs, node types, edge types, conditions, effects
- stable arrays for ordered iteration
- usage/cross-reference maps
- selection-ready source refs

This layer must stay pure and deterministic.

### Step 2: Test the model before any UI work

Add failing tests first for:

- normalization of graph and definition records
- graph-to-definition usage mapping
- type-to-graph reverse lookup
- validation mapping behavior
- metadata-unavailable behavior

Only after the tests fail for the right reasons should implementation proceed.

### Step 3: Add explicit selection state

Create a selection module and simple reducer/helpers for:

- initial `project` selection
- selecting a graph
- selecting a definition type
- selecting a validation issue
- clearing or replacing selections as needed

Keep this small. The point is stable shared state, not a complex state machine.

### Step 4: Derive graph canvas and catalog models

Add pure derived layers for:

- graph canvas projection
- catalog lists
- selection-aware summaries

The graph canvas model should be selection-friendly and validation-aware.

The catalog model should be stable and sortable, with relationship summaries that help users browse the system rather than merely list ids.

### Step 5: Introduce the first visual workspace layout

Replace the current “packs-only below metadata status” layout with a real workspace shape:

- left: catalog/navigation
- center: graph canvas for the selected graph
- right: selection details and validation summary

The Task 6 packs should remain present, but they should no longer be the only dashboard surface.

They can either:

- stay above the workspace as project-level orientation surfaces, or
- move into the right-side details area when selection is `project`

That exact placement can be chosen during implementation, but the shared model must drive both.

### Step 6: Add targeted UI tests

Add only the tests that prove the high-risk product seams:

- selecting a graph updates the graph panel and details
- catalog counts match project model counts
- validation summaries stay aligned with the selected graph or selection
- unavailable metadata remains honest visually
- graph panel does not invent relationships absent from the model

Avoid broad snapshot testing.

## Acceptance Criteria

Task 7 is done when:

- the dashboard has one canonical graph-understanding model
- graph, catalog, validation, and details surfaces all read from that model
- selection state is explicit and shared
- the first visual graph canvas is rendered for a selected graph
- catalog browsing works across graphs and definition types
- provenance remains visible in the details surface
- context packs still work and remain consistent with the visible model

## Verification Plan

Minimum package verification:

- `bun run --filter @fiction-map/dashboard test`
- `bun run --filter @fiction-map/dashboard typecheck`
- `bun run --filter @fiction-map/dashboard build`

Manual verification after implementation:

- run the local dashboard against `examples/story`
- confirm the graph canvas renders the selected graph
- confirm catalog counts and details match visible graph structure
- confirm validation summaries stay consistent across panels
- confirm selection changes update graph/details surfaces predictably

## Risks

- If the project model is too presentation-shaped, future surfaces will still drift.
- If the graph canvas model is too raw, visualization details will leak into the canonical layer.
- If selection state is embedded inside one panel, shared dashboard understanding will fragment again.
- If context packs remain tied only to snapshot facts, they will diverge from the richer graph surfaces.

## Immediate Follow-Up

Once this plan is approved, execute Task 7 in this order:

1. canonical project model
2. selection state
3. graph/canvas/catalog derived layers
4. workspace UI
5. UI seam tests

That keeps the next phase aligned with “proper understanding” instead of slipping back into ad hoc UI work.
