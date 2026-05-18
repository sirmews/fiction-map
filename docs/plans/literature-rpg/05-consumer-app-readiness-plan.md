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

### Task 5: Fix Global Singletons (Registry Context)

Purpose:

Remove global mutable state (`defineEntityType`, `defineCondition`, etc.) from `@fiction-map/core` and `@fiction-map/entities` so multiple projects/worlds can be loaded simultaneously without collision or memory leaks.

Actions:

- Introduce a `Registry` or `ProjectContext` class to hold node types, edge types, entity types, conditions, and effects.
- Update all definition functions to require or bind to a registry instance.
- Ensure the runtime evaluators and handlers can access this registry context.

### Task 6: Solve the Unlock Trap (Seamless Evaluation)

Purpose:

Ensure that `derivedState.effectiveEntityIds` (cascading unlocks via schemas) are respected by runtime transition evaluation without forcing the consumer app to write tedious boilerplate to sync derived state back into `EntityRuntimeState`.

Actions:

- Create an ergonomic solution for `checkTransitionAvailability` to optionally or inherently respect derived state.
- Ensure this solution does not violate pure evaluation performance or silently mutate the serializable explicit state.
- Write tests proving that an entity like "Lantern" unlocking "Dark Cave" allows a player to traverse to "Dark Cave" effortlessly.

### Task 7: Clean Up Noisy Public API

Purpose:

Ensure `@fiction-map/runtime`, `@fiction-map/core`, and `@fiction-map/entities` export only what a consumer app actually needs, hiding internal execution loops and adapters.

Actions:

- Obscure/unexport `parseGraph`, `GraphBlueprint`, and other internal parsing layers.
- Provide a clear, unified `GraphRuntime` or engine entry point.
- Consolidate built-in evaluators and handlers behind a simple initialization pattern (e.g., `registerBuiltins(registry)`).

### Task 8: Implement Self-Documentation Mechanism

Purpose:

Replace the reliance on `*.test.ts` files for consumer education by building a mechanism that surfaces documentation, usage patterns, or generated schemas automatically, making the framework self-documenting for the consuming engineer.

Actions:

- Determine the right format (e.g., JSDoc generation, interactive CLI scaffold generator, or automated Markdown docs).
- Implement the documentation generator so the API boundaries and usage examples are natively accessible without digging into the framework's test folder.

## Current Next Task

Start with **Task 5: Fix Global Singletons (Registry Context)**.
