# Dashboard Understanding Model

## Why This Exists

The current dashboard can now render trustworthy orientation packs from live project state. That was the right first slice, but it is not yet the same kind of “system understanding” that Encore builds.

Encore does not treat its dashboard as a thin UI over raw parsed output. It builds a canonical internal model of the application and then drives multiple synchronized surfaces from that model:

- architecture understanding
- catalogs
- runtime state
- debugging/tracing
- generated artifacts

Fiction Map needs the same shape for graphs.

The next dashboard phase should therefore start with a canonical graph-system understanding model, not with individual visual panels.

## Problem Statement

Right now our dashboard flow is effectively:

`metadata snapshot -> derived facts -> orientation packs`

That is enough for project-level and dev-runtime legibility, but it is too shallow to support:

- graph canvas selection
- graph catalog and filtering
- node-type and edge-type relationship browsing
- validation issue navigation
- selection-aware context packs
- consistent provenance across all of those views

If we add graph panels directly on top of raw metadata without an explicit intermediate model, each panel will derive relationships independently and the dashboard will drift.

## Goal

Define one canonical dashboard understanding model that represents:

- project-level graph structure
- definition catalogs
- cross-references and usage
- validation state
- source provenance
- selection-aware views

Every future dashboard surface should consume this model rather than invent its own interpretation of metadata.

## Design Principle

The dashboard should work like this:

`metadata snapshot -> canonical understanding model -> visual and textual surfaces`

The model is the system of record for dashboard understanding.

That means:

- graph view reads from it
- catalog view reads from it
- validation view reads from it
- detail panels read from it
- context packs read from it

This is the equivalent of the “canonical application model” layer Encore builds after parsing.

## Model Scope

The canonical understanding model should be project-wide, but selection-friendly.

It should cover six concern areas:

### 1. Project facts

Top-level information about the current snapshot:

- root-level counts
- metadata availability
- refresh status
- validation totals
- high-level graph-system summaries

### 2. Catalog entities

Canonical records for:

- graphs
- node types
- edge types
- conditions
- effects

Each record should be normalized, stable, and independently addressable by id.

### 3. Relationships and usage

Cross-reference information that raw metadata exposes but the UI should not recompute ad hoc:

- which node types a graph uses
- which edge types a graph uses
- which conditions and effects a graph uses
- which graphs reference a given node type
- which graphs reference a given edge type
- which edges connect which node types
- incoming/outgoing relationships between type definitions

This is the part that makes the dashboard feel like it “understands” the graph system.

### 4. Validation mapping

Validation should not remain a flat error/warning list only.

The model should support:

- project-wide validation totals
- graph-level validation summaries
- issue-to-graph mapping
- issue-to-node / issue-to-edge mapping where available
- “affected definitions” views for selected entities

### 5. Provenance

Every entity and every major derived relationship should preserve source evidence.

That means:

- source locations for definitions
- graph file locations
- metadata-backed evidence where appropriate
- curated repo references where architectural interpretation is needed

This keeps both visual and textual surfaces grounded.

### 6. Selection-aware derived views

The model should make it easy to ask:

- what does the selected graph contain?
- what definitions does it use?
- what validation issues affect it?
- what other entities relate to the selected node type?
- what context pack should be generated for the current selection?

This should be a first-class concern, not a UI afterthought.

## Proposed Layering

### Layer 1: Wire snapshot

Input from the dev server:

- `MetadataSnapshot`

This is transport-facing and should remain close to the protocol.

### Layer 2: Canonical project model

New dashboard-owned normalized model, for example:

```ts
interface DashboardProjectModel {
  snapshot: DashboardSnapshotState
  project: DashboardProjectFacts
  catalogs: DashboardCatalogs
  relationships: DashboardRelationships
  validation: DashboardValidationModel
}
```

This layer should be deterministic and pure.

### Layer 3: Surface view-models

Derived from the canonical model:

- project summary surface
- dev runtime surface
- graph catalog surface
- graph canvas surface
- validation surface
- selection details surface
- context packs

This is where presentation-specific shaping belongs.

## Proposed Entity Shapes

Exact TypeScript shapes can be finalized during implementation, but the model needs records like:

```ts
interface DashboardGraphRecord {
  id: string
  name: string
  description?: string
  location: DashboardSourceRef
  nodeIds: string[]
  edgeIds: string[]
  nodeTypeIds: string[]
  edgeTypeIds: string[]
  conditionIds: string[]
  effectIds: string[]
  stats: {
    nodeCount: number
    edgeCount: number
    maxDepth: number
    endingCount: number
    errorCount: number
    warningCount: number
  }
}

interface DashboardNodeTypeRecord {
  id: string
  name: string
  description?: string
  location: DashboardSourceRef
  outgoingEdgeTypeIds: string[]
  incomingEdgeTypeIds: string[]
  usedByGraphIds: string[]
}

interface DashboardEdgeTypeRecord {
  id: string
  name: string
  description?: string
  location: DashboardSourceRef
  sourceTypeIds: string[]
  targetTypeIds: string[]
  usedByGraphIds: string[]
}
```

The same pattern should apply to conditions and effects.

The point is not the exact naming. The point is normalization plus cross-linking.

## Graph Canvas Model

The graph canvas should not render directly from raw graph metadata.

It should receive a graph-specific view-model, for example:

```ts
interface GraphCanvasModel {
  graphId: string
  title: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  overlays: {
    errorCount: number
    warningCount: number
    endingNodeIds: string[]
  }
}
```

This layer should:

- choose canvas labels
- attach validation badges
- attach selection ids
- attach provenance hooks

That keeps `@fiction-map/visualize` integration separate from project understanding.

## Catalog Model

The catalog should be another derived view, not another source of truth.

It should support:

- all graphs
- all node types
- all edge types
- all conditions
- all effects
- stable sorting
- future filtering
- selection by id

The important point is that catalog membership and counts must match the same canonical model that powers context packs and graph rendering.

## Validation Model

Validation needs its own explicit model because it will end up driving several surfaces:

- summary counts
- graph badges
- issue list
- selection impact
- future trace/debug context

Suggested shape:

```ts
interface DashboardValidationModel {
  totals: {
    errors: number
    warnings: number
  }
  issuesByGraphId: Record<string, DashboardValidationIssueRef[]>
  issuesByNodeId: Record<string, DashboardValidationIssueRef[]>
  issuesByEdgeId: Record<string, DashboardValidationIssueRef[]>
  unscopedIssues: DashboardValidationIssueRef[]
}
```

Again, the exact type names are flexible. The explicit mapping is the important part.

## Context Packs In This Model

Context packs should become one consumer of the canonical model, not the main model itself.

That means:

- `Project Summary Pack` reads `project`
- `Dev Runtime Pack` reads `project` plus curated architecture sources
- future `Graph System Pack` reads `catalogs` plus `relationships`
- future selection packs read the selected record plus related records and validation

This keeps packs synchronized with visual surfaces instead of becoming a parallel interpretation layer.

## Selection Model

The next dashboard phase should introduce explicit selection state.

Suggested shape:

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

This matters because:

- graph canvas needs selection
- detail panels need selection
- context packs will eventually be selection-aware

Without this, the dashboard remains a static readout rather than a real inspection tool.

## What This Means For Task 7

Task 7 should not be described as “add some graph panels.”

It should be described as:

1. Build the canonical dashboard understanding model
2. Derive graph catalog and graph canvas view-models from it
3. Add selection state
4. Render the first visual graph-and-catalog surfaces
5. Add graph-system and validation context packs on top of the same model

That is the right sequence if we want Encore-level understanding rather than just more UI.

## Non-Goals For This Phase

This model phase should not try to do everything at once.

Still out of scope:

- playtest view
- trace viewer
- click-to-code
- visual graph editing
- generalized prompt customization
- arbitrary file/document ingestion

The point is to build the internal understanding layer first.

## Acceptance Criteria

We should consider this understanding-model phase successful when:

- the dashboard has one canonical graph-system model
- graph canvas, catalog, validation, and context packs all read from that model
- selection state is explicit and shared
- relationships are derived once, not per panel
- provenance remains visible and trustworthy

## Immediate Next Step

Before implementation, write a Task 7 plan that:

- names the canonical model files
- defines the first normalized entity shapes
- defines selection state
- defines graph canvas and catalog view-model boundaries
- states which surfaces land first and which stay deferred

That keeps the next phase aligned with the “proper understanding” goal instead of slipping into ad hoc visualization work.
