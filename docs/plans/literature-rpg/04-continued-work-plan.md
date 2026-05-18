# Literature RPG Continued Work Plan

Date: 2026-05-17

## Status

This document is the completed foundation record for the literature-RPG engine work.

The active next-phase plan is:

- [05-consumer-app-readiness-plan.md](05-consumer-app-readiness-plan.md)

Other literature-RPG documents are background analysis:

- [01-engine-capability-audit.md](01-engine-capability-audit.md)
- [02-gap-catalog.md](02-gap-catalog.md)
- [03-minimal-entity-meta-model.md](03-minimal-entity-meta-model.md)

Do not treat those files as competing task order, current status, or a second roadmap.

## Purpose

This plan gets Fiction Map from generic graph packages to a credible headless foundation for a
literature-RPG-style consumer app.

The target consumer app may define concepts such as species, stats, traits, items, spells,
locations, quests, or resources. Fiction Map must not hardcode those concepts. It should provide
the generic contracts that let the app define, validate, derive, and execute them.

## Current Package Boundary

Fiction Map currently has four relevant package surfaces:

- `@fiction-map/core`: graph schema definitions and graph validation
- `@fiction-map/entities`: generic world/entity definitions and validation
- `@fiction-map/runtime`: traversal, runtime state, derived entity state, and transition execution
- `fiction-map` CLI: metadata and semantics generation

The framework owns:

- generic graph abstractions
- generic entity/world abstractions
- generic runtime state contracts
- generic derivation and validation mechanics

The consumer app owns:

- concrete world concepts
- concrete story schemas
- editor UI
- persistence, auth, autosave, and collaboration
- RPG-specific formulas and product workflows

## Current Capability Checkpoint

Implemented:

- `@fiction-map/entities` defines entity types, entity instances, typed references, modifiers,
  prerequisites, unlocks, and structural validation.
- `GraphRuntimeState.entityState` records owned, active, unlocked, and numeric resource state.
- Runtime state helpers can grant, revoke, activate, deactivate, unlock, lock, add resources, and
  spend resources.
- Runtime serialization and deserialization preserve entity-aware state.
- `deriveEntityState(world, state)` combines a world definition with runtime state.
- Derived state reports owned, active, unlocked, effective, missing, active modifiers, and generic
  entity `has` prerequisite status.
- Transition availability and transition results report machine-readable failed conditions for
  blocked or hidden choices.
- Entity-aware transition validation reports story graph references to unknown world entities.
- A literature-RPG-style example proves consumer-defined entities, derived state, transition
  gating, effects, failure details, and cross-validation work together.

Not implemented yet:

- computed stat formulas, modifier math, inventory rules, shops, equipment, combat, or leveling
- Story Editor UI

## Target Shape

The ideal target is a set of related graph-shaped layers, not one universal graph:

- **Story graph**: scenes, choices, transitions, traversal
- **World entity graph**: entities, references, modifiers, prerequisites, unlocks
- **Runtime state**: what a player currently owns, has active, has unlocked, or has spent
- **Derived state**: what follows from combining authored world definitions with runtime state

The runtime should eventually answer:

- is this story choice visible?
- is this story choice allowed?
- what entity or state requirement failed?
- what entities, resources, or unlocks changed after this transition?

It should answer those questions without hardcoding concepts like species, stats, traits, items,
spells, factions, quests, combat, or inventory.

## Ordered Work

### Stage 1: Entity-Aware Runtime State

Status: implemented.

Delivered:

- `GraphRuntimeState.entityState`
- owned entity ids
- active entity ids
- unlocked entity ids
- numeric resources
- immutable helper functions
- serialization and deserialization support
- focused runtime state tests

### Stage 2: Derived State Computation

Status: implemented.

Delivered:

- `deriveEntityState(world, state)` in `@fiction-map/runtime`
- derived owned, active, unlocked, and effective entity id sets
- unlock propagation from effective entities
- active modifier collection from active entities
- prerequisite status reporting for generic entity `has` prerequisites
- missing runtime entity reference reporting
- focused derived-state tests

### Stage 3: Generic Entity-Aware Conditions And Effects

Status: implemented.

Delivered:

- built-in `hasEntity`, `entityActive`, `entityUnlocked`, and `resourceAtLeast` conditions
- built-in `grantEntity`, `revokeEntity`, `activateEntity`, `deactivateEntity`, `unlockEntity`,
  and `lockEntity` effects
- built-in `addResource` and `spendResource` effects
- blocked resource spending is explicit and tested
- focused tests for condition evaluation, effect application, successful transitions, and blocked
  transitions using entity-aware conditions and effects

### Stage 4: Story Graph Bridge

Status: implemented.

Delivered:

- transition availability exposes which generic condition failed
- transition results expose which generic condition failed
- failed condition details distinguish `visibility` failures from `requirements` failures
- failed condition details identify the condition group: `all`, `any`, or `none`
- focused tests cover a blocked entity-aware transition with machine-readable failure detail

### Stage 5: Validation And Explanation Improvements

Status: implemented.

Delivered:

- `validateEntityTransitionReferences(transitions, world)` in `@fiction-map/runtime`
- validator accepts runtime transitions plus an `@fiction-map/entities` world definition
- entity-aware conditions that reference unknown entities are reported as validation errors
- entity-aware effects and failure effects that reference unknown entities are reported as validation errors
- resource references stay generic and do not require a built-in RPG resource ontology
- focused tests cover unknown entity references in conditions and effects

### Stage 6: Example Project And End-To-End Tests

Status: implemented.

Delivered:

- a literature-RPG-style package-level example test
- consumer-defined `species`, `stat`, `trait`, `item`, and `location` entity types
- a valid world definition with typed references, modifiers, prerequisites, and unlocks
- an authored unlock chain proven through derived state
- a story transition gated by entity-aware runtime state
- transition effects that spend resources and grant entities
- failed visibility details before runtime unlock state is recorded
- cross-validation that catches invalid story/world entity references

## Explicit Non-Goals

Do not add these while completing the plan above:

- built-in species, stats, items, spells, or quests
- inventory stack rules
- equipment slot rules
- combat rules
- leveling rules
- shop semantics
- editor UI
- persistence backend
- collaboration
- visual graph tooling

These may belong in a consumer app, but they do not belong in the framework contract yet.

## Clean Stopping Points

Each stage should be independently committable.

Good stopping points:

- runtime state types plus tests
- derived state function plus tests
- generic conditions/effects plus tests
- story bridge plus tests
- validation and explanations plus tests
- example project plus end-to-end tests

Do not bundle all of this into one change set.
