# Literature RPG Gap Analysis

Date: 2026-05-16

## What this is

This is the entry document for a self-contained analysis of whether Fiction Map can support a
consumer app for a literature RPG.

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

## Why there are multiple documents

The gap question has two different layers:

1. What the current engine can and cannot do right now
2. What missing capabilities matter enough that the engine contract should change

Those are separated below so future readers can distinguish present capability from recommended
next work.

## Documents

### 1. Current capability audit

- [01-engine-capability-audit.md](literature-rpg/01-engine-capability-audit.md)

This document explains, in detail:

- the current package boundary
- the relevant `core` and `runtime` contracts
- what a literature-RPG consumer app can already express
- where current support depends on convention or workaround

### 2. Detailed gap catalog

- [02-gap-catalog.md](literature-rpg/02-gap-catalog.md)

This document explains, in detail:

- each important missing engine capability
- why it matters
- how the current repo behaves instead
- what a minimal addition would need to accomplish
- what should still remain outside the engine

### 3. Minimal entity meta-model

- [03-minimal-entity-meta-model.md](literature-rpg/03-minimal-entity-meta-model.md)

This document explains, in detail:

- what a generic entity/meta-model layer would need to include
- what it should explicitly exclude
- where it belongs in relation to the story graph and runtime state
- what the next implementation decision should be

## Short conclusion

Fiction Map already has enough flexibility to represent literature-RPG-style logic in principle.

What it lacks is not a UI platform. What it lacks is a tighter engine contract around:

- validation of condition and effect payloads
- consistent world-state conventions
- richer authored transition semantics
- safer extension registration
- clearer runtime explanations for blocked, hidden, and failed choices
- a minimal generic entity/meta-model layer

That is the core of the current gap.
