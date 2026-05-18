# Literature RPG Gap Analysis

Date: 2026-05-16

## What this is

This is the entry document for a self-contained analysis of whether Fiction Map can support a
consumer app for a literature RPG.

This is **not** the active implementation plan. The single source of truth for current next-phase
work is:

- [Literature RPG Consumer-App Readiness Plan](literature-rpg/05-consumer-app-readiness-plan.md)

This document assumes no prior context. It starts from first principles:

- what Fiction Map is
- what the target use case is
- what the current packages already support
- what the engine is still missing

## What Fiction Map is

Fiction Map is a headless package and tooling layer for graph-based systems.

It is not the Story Editor product itself.

That means:

- `@fiction-map/core` provides abstractions for defining graph structures
- `@fiction-map/entities` provides generic world/entity definitions
- `@fiction-map/runtime` provides traversal and execution behavior
- consumer apps define their own concrete story schemas and own their own UI

The accepted architectural decision for that boundary is:

- [Headless Engine Direction](../decisions/2026-05-16-headless-engine-direction.md)

## What a literature RPG means here

For this analysis, "literature RPG" means a story system that combines branching narrative with
stateful progression and player/world logic.

Representative examples:

- a choice requires a specific item
- a choice costs money or another resource
- a choice buys, consumes, equips, or selects an item
- a choice depends on quest progress, faction state, or a previous decision
- a choice is visible but currently unavailable
- failure applies penalties or redirects the story elsewhere

## Document roles

The literature-RPG docs have one active plan and several background snapshots.

The active next-phase plan is:

- [05-consumer-app-readiness-plan.md](literature-rpg/05-consumer-app-readiness-plan.md)

The other documents are reference material. They explain earlier analysis, requirements, and
design rationale. They must not be treated as competing task order, current status, or a second
roadmap.

## Documents

### 1. Current capability audit

- [01-engine-capability-audit.md](literature-rpg/01-engine-capability-audit.md)

Reference snapshot. This document explains, in detail:

- the current package boundary
- the relevant `core` and `runtime` contracts
- what a literature-RPG consumer app can already express
- where current support depends on convention or workaround

### 2. Detailed gap catalog

- [02-gap-catalog.md](literature-rpg/02-gap-catalog.md)

Reference snapshot. This document explains, in detail:

- each important missing engine capability
- why it matters
- how the current repo behaves instead
- what a minimal addition would need to accomplish
- what should still remain outside the engine

### 3. Minimal entity meta-model

- [03-minimal-entity-meta-model.md](literature-rpg/03-minimal-entity-meta-model.md)

Reference snapshot. This document explains, in detail:

- what a generic entity/meta-model layer would need to include
- what it should explicitly exclude
- where it belongs in relation to the story graph and runtime state
- what the next implementation decision should be

### 4. Completed foundation plan

- [04-continued-work-plan.md](literature-rpg/04-continued-work-plan.md)

Completed foundation record. This document explains, in detail:

- the current completed stage
- the ideal target state
- the ordered work needed to connect `@fiction-map/entities` to runtime and story traversal
- what should remain out of scope while the engine contract stabilizes

### 5. Active consumer-app readiness plan

- [05-consumer-app-readiness-plan.md](literature-rpg/05-consumer-app-readiness-plan.md)

Active plan. This document explains, in detail:

- the current headless foundation
- the next ordered tasks before consumer app work
- the documentation, examples, and API-readiness work still needed

## Short conclusion

Fiction Map now has a credible headless foundation for literature-RPG-style logic: generic entity
definitions, runtime entity state, derived entity state, entity-aware transition primitives,
failure details, cross-validation, and an executable example.

What it lacks is not a UI platform. What it still needs next is consumer-app readiness work:

- public API audit
- consumer usage guide
- example placement decision
- derived unlock semantics decision
- runtime explanation ergonomics review

That is the core of the current gap.
