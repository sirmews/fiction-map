# Literature RPG Continued Work Plan

Date: 2026-05-17

## Purpose

This document is the current forward plan for getting Fiction Map from the first
`@fiction-map/entities` slice to a credible literature-RPG engine foundation.

It assumes no prior context.

## Current completed stage

Fiction Map now has four relevant package surfaces:

- `@fiction-map/core`
- `@fiction-map/entities`
- `@fiction-map/runtime`
- `fiction-map` CLI

The entity package exists as a separate optional package. Its current scope is deliberately small.

It supports:

- entity type definitions
- entity instances grouped into worlds
- typed references between entities
- declarative modifiers
- declarative prerequisites and unlocks
- validation for entity structure and references

It does not yet support:

- runtime state for owned, active, or unlocked entities
- derived state computation
- runtime evaluation of modifiers
- runtime evaluation of prerequisites and unlocks
- graph transition conditions that read entity-derived state

## Ideal target

The ideal target is not one giant universal graph.

The target is a set of related graph-shaped layers:

- **story graph**: scenes, choices, transitions, traversal
- **world entity graph**: entities, references, modifiers, prerequisites, unlocks
- **runtime state**: what a player currently owns, has active, has unlocked, or has spent
- **derived state**: what follows from combining authored world definitions with runtime state

The runtime should eventually answer:

- is this story choice visible?
- is this story choice allowed?
- what entity or state requirement failed?
- what entities, resources, or unlocks changed after this transition?

It should answer those questions without hardcoding concepts like species, stats, traits, items,
spells, factions, quests, combat, or inventory.

## Guiding boundary

The framework owns:

- generic graph abstractions
- generic entity/world abstractions
- generic runtime state contracts
- generic derivation and validation mechanics

The consumer app owns:

- concrete world concepts
- editor UI
- product workflows
- persistence
- RPG-specific semantics
- game-specific formulas

## Work sequence

### Stage 1: Entity-aware runtime state

Status: implemented.

Define a small runtime-facing state shape for entity-aware play.

This should probably live in `@fiction-map/runtime` unless a stronger reason emerges to create a
shared state package.

Minimum state concepts:

- owned entity ids
- active entity ids
- unlocked entity ids
- resources
- app extension data

The goal is not to model inventory rules. The goal is to provide a stable place for runtime state
to record which authored entities matter to the current player/session.

### Stage 2: Derived state computation

Add a derivation layer that combines:

- a world definition from `@fiction-map/entities`
- entity-aware runtime state

and produces derived information such as:

- effective entity ids
- active modifiers
- satisfied prerequisites
- unlocked entities
- unresolved or invalid runtime references

This layer should remain generic. It should not interpret species, stats, items, or spells as
special concepts.

### Stage 3: Generic entity-aware conditions and effects

Add runtime conditions and effects that operate on the derived state.

Likely first conditions:

- has entity
- entity is active
- entity is unlocked
- resource at least
- derived value at least

Likely first effects:

- grant entity
- activate entity
- deactivate entity
- unlock entity
- spend resource
- add resource

These should be generic runtime primitives. Consumer apps can still register custom evaluators and
handlers for domain-specific behavior.

### Stage 4: Story graph bridge

Connect story graph transitions to the entity-aware runtime layer.

The practical target:

- story choices can require entities or unlocks
- story choices can grant, activate, or unlock entities
- blocked/hidden choices can explain which entity-aware requirement failed

This should preserve the distinction between story graph traversal and world entity modeling.

### Stage 5: Validation and explanation improvements

Add validation that spans the story graph and world entity graph.

Useful checks:

- story condition references an entity that does not exist
- transition effect grants an unknown entity
- unlock target exists structurally
- entity prerequisite target exists
- blocked transition explanation identifies the failing entity-aware condition

This is where the engine starts becoming useful for editor feedback and automated tests.

### Stage 6: Example project and end-to-end tests

Add a literature-RPG-style example that proves the model.

The example should include:

- a consumer-defined `species` entity type
- a consumer-defined `stat` entity type
- a consumer-defined `trait` or `item` entity type
- an unlock chain
- a story graph transition gated by entity-aware state
- a transition effect that grants or unlocks an entity

The tests should prove:

- entity validation works
- derived state works
- runtime transition availability reads derived state
- transition effects update entity-aware runtime state

## Explicit non-goals

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

## Clean stopping points

Each stage should be independently committable.

Good stopping points:

- runtime state types plus tests
- derived state function plus tests
- generic conditions/effects plus tests
- story bridge plus tests
- validation and explanations plus tests
- example project plus end-to-end tests

Do not bundle all of this into one change set.

Implemented in this stage:

- `GraphRuntimeState.entityState`
- owned entity ids
- active entity ids
- unlocked entity ids
- numeric resources
- immutable helper functions
- serialization and deserialization support
- focused runtime state tests

## Current next task

Status: Stage 2 implemented.

Implemented in this stage:

- `deriveEntityState(world, state)` in `@fiction-map/runtime`
- derived owned, active, unlocked, and effective entity id sets
- unlock propagation from effective entities
- active modifier collection from active entities
- prerequisite status reporting for generic entity `has` prerequisites
- missing runtime entity reference reporting
- focused derived-state tests

The next task is Stage 3: generic entity-aware conditions and effects.

Acceptance criteria:

- conditions can check whether an entity is owned, active, or unlocked
- conditions can check numeric resources
- effects can grant, revoke, activate, deactivate, unlock, and lock entities
- effects can add and spend resources
- these primitives remain generic and do not hardcode species, stats, traits, items, spells, factions, or quests
- focused tests cover allowed and blocked transitions using entity-aware conditions and effects

Out of scope for this next task:

- RPG-specific inventory or equipment semantics
- applying modifiers into computed stat formulas
- changing the CLI generator
- building the Story Editor UI
- persistence or collaboration
