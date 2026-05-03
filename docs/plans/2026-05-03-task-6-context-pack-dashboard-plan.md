# Task 6 Context-Pack Dashboard Plan

## Goal

Turn the current minimal dashboard shell into the first genuinely useful architecture-reading surface.

Task 6 should not try to finish the whole dashboard. It should make `packages/dashboard` useful for:

- human orientation
- LLM bootstrap
- validating the context-pack model against the live repo and metadata

The first implementation target is narrow:

- `Project Summary Pack`
- `Dev Runtime Pack`
- `orientation` intent only

## Why This Is The Next Step

Tasks 1 through 5 gave us:

- reusable metadata generation
- a long-lived dev server with watcher and RPC transport
- a browser client and `useMetadata`
- a visible dashboard shell that proves connectivity and refresh behavior

What is still missing is the product value of the dashboard itself. Right now the shell proves transport, but it does not yet help a human or an LLM understand the platform.

Task 6 closes that gap without jumping ahead into graph rendering or broader context-pack coverage.

## Scope

### In scope

- replace the two placeholder cards in `packages/dashboard/src/App.tsx`
- add a typed dashboard derivation layer
- generate `Project Summary Pack` and `Dev Runtime Pack`
- render both packs with copyable `promptSeed` and `contextBlock`
- keep outputs deterministic and bounded
- keep all pack content grounded in live metadata plus curated references

### Out of scope

- graph visualization
- catalog and validation panels
- selection-level packs
- user-custom pack intent switching
- arbitrary repository file reading in the browser
- server-side document ingestion
- editor integration

## Architectural Decisions

### 1. Treat pack generation as pure application logic

Pack generation should live in `packages/dashboard/src/lib`, not inside React components.

Recommended modules:

- `packages/dashboard/src/lib/metadata.ts`
  Responsibility: derive stable dashboard facts from `MetadataSnapshot`
- `packages/dashboard/src/lib/curated-sources.ts`
  Responsibility: own the small explicit set of curated references and authored architecture facts used by first-slice packs
- `packages/dashboard/src/lib/context-packs.ts`
  Responsibility: combine metadata facts and curated references into deterministic `ContextPack` objects

### 2. Do not add runtime repo file reading in Task 6

The browser does not have direct repository access, and adding ad hoc file loading now would blur responsibilities and expand scope. The first slice should use:

- live metadata from the existing RPC snapshot
- a code-owned curated reference registry
- authored implementation-status facts derived from the actual current milestone state

This keeps Task 6 honest and testable.

### 3. Use live metadata where it is genuinely informative

The first two packs are architecture-oriented, not graph-detail packs, so they should use metadata selectively:

- counts for graphs, node types, edge types, conditions, and effects
- current refresh timestamp and refresh error state
- metadata availability as evidence of the dev-runtime path

Do not pad the packs with metadata trivia just because it is available.

### 4. Keep the default UI optimized for orientation

The first copy actions should be:

- `Copy Prompt Seed`
- `Copy Full Context Pack`

Both should export orientation-first content. Planning and implementation variants can come later if the orientation baseline proves useful.

## File Plan

### New files

- `packages/dashboard/src/lib/metadata.ts`
- `packages/dashboard/src/lib/curated-sources.ts`
- `packages/dashboard/src/lib/context-packs.ts`
- `packages/dashboard/src/lib/context-packs.test.ts`
- `packages/dashboard/src/components/ContextPackPanel.tsx`
- `packages/dashboard/src/components/ContextPackCard.tsx`

### Files to modify

- `packages/dashboard/src/App.tsx`

### Optional test additions

- `packages/dashboard/src/components/__tests__/...`

Use component tests only where they prove visible behavior that unit tests on the derived layer cannot.

## Implementation Sequence

### Step 1: Derive dashboard metadata facts

Create a typed dashboard-facing metadata adapter that turns the raw snapshot into facts the UI and packs can share.

Expected outputs:

- metadata availability
- definition counts
- last refresh state
- current refresh error summary
- a small set of readable dashboard facts derived from snapshot state

This layer should not yet know about copy UI.

### Step 2: Define the curated reference registry

Create a small explicit registry for first-slice curated references.

Each reference should include:

- label
- path
- kind
- reason
- optional focus text
- pack membership

This registry should match the source-set rules already documented in `docs/plans/2026-05-03-context-pack-design.md`.

### Step 3: Implement pack generation

Build deterministic pack-generation functions for:

- `buildProjectSummaryPack(...)`
- `buildDevRuntimePack(...)`

These builders should:

- accept typed metadata facts
- pull only the curated references relevant to their pack type
- enforce the first-slice size limits from the design doc
- emit complete `ContextPack` objects

### Step 4: Test the derived layer first

Before touching the UI much, add package-local tests that prove:

- pack kind, intent, and scope are correct
- live metadata counts appear where appropriate
- curated references and next-look items are stable
- implementation-status facts reflect the current milestone state
- outputs stay bounded and deterministic

This is the main anti-drift protection for Task 6.

### Step 5: Replace shell placeholders with real pack surfaces

Render the two packs in the dashboard using dedicated components.

The UI should:

- show title and purpose
- show summary
- show system view
- show key concepts
- distinguish evidence from inspect-next references
- show implementation status and cautions when present
- expose copy actions for prompt seed and full context block

The UI should still look like a first slice, not a fake complete product.

### Step 6: Add targeted UI tests

Add only the tests needed to prove:

- packs render from loaded metadata
- loading and unavailable-metadata states stay honest
- copy actions use the generated `promptSeed` and `contextBlock`

Do not over-invest in snapshot-style visual testing yet.

## Acceptance Criteria

Task 6 is done when:

- the placeholder cards are gone
- `Project Summary Pack` and `Dev Runtime Pack` render from real app state
- each pack can copy both `promptSeed` and `contextBlock`
- pack generation is covered by package-local tests
- the dashboard remains honest about missing metadata or refresh errors
- no new server capability was required just to ship the first pack slice

## Verification Plan

Minimum verification:

- `bun run --filter @fiction-map/dashboard typecheck`
- `bun run --filter @fiction-map/dashboard test`
- `bun run --filter @fiction-map/dashboard build`

Manual check after implementation:

- run the dev server against a real example project
- open the dashboard
- confirm both packs render sensible current-state information
- confirm copied output includes useful inspect-next guidance rather than a repo dump

## Risks

- If pack generation is mixed into components, UI churn will change content unpredictably.
- If curated references are too loose, the first slice will drift into vague summaries.
- If implementation-status facts are not maintained, the packs will quickly become misleading.
- If live metadata is overused, the packs will become noisy rather than architectural.

## After Task 6

Only after this slice is validated should we move to:

- graph-system and validation packs
- graph/catalog/validation surfaces
- `fiction-map dev` CLI wiring
- example-project end-to-end verification

That keeps the first context-pack slice small enough to evaluate honestly.
