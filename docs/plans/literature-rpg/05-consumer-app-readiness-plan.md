# Literature RPG Consumer-App Readiness Plan

Date: 2026-05-18

## Source Of Truth

This document is the active source of truth for the next work after completing the entity-aware
runtime foundation.

The completed foundation record is:

- [04-continued-work-plan.md](04-continued-work-plan.md)

Earlier literature-RPG documents are background only. Do not treat them as competing task order.

## Current State

The headless engine foundation is complete enough to prove the package boundary:

- `@fiction-map/entities` defines consumer-owned world/entity concepts.
- `@fiction-map/runtime` stores entity-aware runtime state.
- `deriveEntityState(world, state)` combines authored world definitions with runtime state.
- Built-in runtime conditions and effects can read and update generic entity-aware state.
- Transition availability and transition results expose machine-readable failure details.
- `validateEntityTransitionReferences(transitions, world)` catches story/world reference drift.
- A literature-RPG-style package-level example proves those pieces work together.

This does not mean Fiction Map is a Story Editor product. It means the engine now has a credible
headless foundation for a consumer Story Editor to import.

## Direction

The next phase is **consumer-app readiness**, not more RPG mechanics.

The goal is to make the current package contract understandable, stable, and easy for a separate
Story Editor app to consume.

Do not add:

- built-in species, stats, items, spells, quests, shops, equipment, combat, or leveling
- editor UI
- persistence
- collaboration
- visual graph tooling

## Ordered Tasks

### Task 1: Public API Audit

Purpose:

Make the actual package surface explicit before building more features.

Actions:

- Audit exports from `@fiction-map/core`, `@fiction-map/entities`, and `@fiction-map/runtime`.
- Identify which exports are stable consumer-facing API and which are implementation details.
- Document the result in a repo doc.

Acceptance criteria:

- One doc lists the current public package surfaces.
- The doc calls out any questionable exports or missing exports.
- No production behavior changes.

Verification:

- `bun typecheck`
- `bun run build`

### Task 2: Consumer Usage Guide

Purpose:

Show exactly how a future Story Editor app should consume the packages.

Actions:

- Write a guide that walks from consumer-defined schemas to world definitions, transitions,
  validation, runtime execution, failed-condition explanations, and derived state.
- Use the literature-RPG example as the grounding scenario.
- Make the framework/editor boundary explicit.

Acceptance criteria:

- The guide has one complete flow a consumer app can follow.
- It does not imply Fiction Map owns app-specific schemas or UI.
- It links to the package-level example test as executable evidence.

Verification:

- `bun test`
- `bun typecheck`

### Task 3: Example Placement Decision

Purpose:

Decide whether the literature-RPG example should remain only as a test or become a documented
example fixture.

Actions:

- Review `packages/story-runtime/src/examples/literature-rpg.test.ts`.
- Decide whether to keep it as an executable test, extract shared example data, or create a
  separate example package later.
- Document the decision.

Acceptance criteria:

- The repo has a clear policy for examples.
- Future agents know whether to add examples as tests, docs, fixtures, or packages.
- No app scaffold is created unless a later plan explicitly chooses that.

Verification:

- `bun test`

### Task 4: Derived Unlock Semantics Decision

Purpose:

Resolve the main ergonomic question exposed by the example: derived unlocks are read-only, while
runtime unlock state must be explicitly recorded.

Actions:

- Document the current behavior.
- Decide whether to keep derived unlocks read-only or add an explicit helper later.
- If a helper is justified, write a small follow-up task before implementing it.

Acceptance criteria:

- The decision is explicit.
- The decision does not silently mutate runtime state from derived state.
- The Story Editor implication is clear.

Verification:

- `bun test`
- `bun typecheck`

### Task 5: Runtime Explanation Ergonomics Review

Purpose:

Check whether `failedConditions` is sufficient for a Story Editor to show useful author-facing
feedback.

Actions:

- Review the current `FailedCondition` structure.
- Compare it against the literature-RPG example and validation errors.
- Decide whether additional fields are needed now or should wait for the consumer app.

Acceptance criteria:

- The review states whether the current structure is enough.
- Any proposed additions are generic and not RPG-specific.
- No UI language or rendering assumptions are added to runtime.

Verification:

- `bun run --filter @fiction-map/runtime test`
- `bun run --filter @fiction-map/runtime typecheck`

### Task 6: Next Implementation Decision

Purpose:

Choose the next coding slice only after the consumer contract is documented.

Likely options:

- add a small derived-unlock materialization helper
- add richer validation payload locations
- start a separate Story Editor consumer app scaffold
- stop engine work and use the packages from a consumer app

Acceptance criteria:

- The next slice is selected in writing.
- It has explicit scope and non-goals.
- It is independently committable.

Verification:

- The active plan is updated before implementation starts.

## Current Next Task

Start with **Task 1: Public API Audit**.
