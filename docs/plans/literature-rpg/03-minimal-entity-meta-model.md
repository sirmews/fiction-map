# Minimal Entity Meta-Model

Date: 2026-05-16

> Reference snapshot, not the active implementation plan.
>
> Use [05-consumer-app-readiness-plan.md](05-consumer-app-readiness-plan.md) as the single source
> of truth for current next-phase tasks. This document records the entity meta-model rationale
> that led to `@fiction-map/entities`.

## Purpose

This document defines the smallest plausible generic entity/meta-model layer that Fiction Map
could provide without turning into a built-in RPG ontology.

It assumes no prior context.

The question it answers is:

If Fiction Map is meant to support literature-RPG-style consumer apps, what should the framework
provide so the app can define concepts like `species`, `stat`, `trait`, `item`, `spell`, or
`location` without the framework hardcoding those concepts itself?

## Problem statement

There are two failure modes.

### Too little

If Fiction Map only provides:

- story graph primitives
- conditions and effects
- generic runtime variables

then every consumer app must invent its own world model from scratch.

That is too little for a credible literature-RPG target because:

- entity modeling becomes ad hoc
- modifiers and unlock chains become inconsistent
- story flow and world state drift apart
- the framework becomes little more than a branching runtime

### Too much

If Fiction Map provides built-in world concepts like:

- species
- stats
- traits
- items
- spells
- factions
- quests

then the framework is no longer a generic engine. It becomes a specific RPG ontology.

That is too much because:

- it bakes genre assumptions into the framework
- it reduces reuse across different narrative worlds
- it pushes product/domain decisions down into the package layer
- it becomes much harder to keep the framework small

## Correct target

The correct target is a **generic entity meta-model**, not a built-in entity ontology.

That means:

- Fiction Map provides the tools to define world/entity systems
- the consumer app defines the actual world concepts

In short:

- framework owns the **meta-model**
- consumer app owns the **world model**

## What the framework should include

The smallest useful entity meta-model probably needs six capabilities.

### 1. Entity type definitions

The framework should let a consumer app define an entity type.

Examples a consumer app might define:

- `species`
- `stat`
- `trait`
- `item`
- `spell`
- `location`
- `resource`

The framework should not ship those names. It should only provide the mechanism for defining
typed entities and their property schemas.

This is similar in spirit to how `@fiction-map/core` already lets consumer apps define node types,
edge types, conditions, and effects.

### 2. Entity instances

The framework should let a consumer app define actual instances of those types.

Examples:

- `elf` as an instance of `species`
- `strength` as an instance of `stat`
- `fire-attuned` as an instance of `trait`
- `lantern` as an instance of `item`

This separates:

- the shape of a thing
- a concrete thing in the authored world

That distinction matters if the editor is going to support multiple different worlds and
environments.

### 3. Typed references between entities

The framework should let entity instances refer to other entities.

Examples:

- an item may grant a trait
- a species may reference base stats
- a location may require a quest stage
- a spell may require another ability

This should be generic, not domain-specific.

The framework does not need to know what a species or spell is. It does need to know that one
entity can reference another in a typed and validatable way.

### 4. Generic modifier definitions

The framework should support modifiers as a generic concept.

Examples:

- add `+2` to a stat
- add a tag
- grant an ability
- reduce a resource by `5`

The key point is that modifiers should remain abstract.

The framework should not ship assumptions like:

- every modifier targets a combat stat
- every item has equipment slots
- every trait is passive

It should only provide a structured way for consumer apps to declare and evaluate changes.

### 5. Generic prerequisite and unlock rules

The framework should support rules like:

- requires another entity
- requires a tag
- requires a state threshold
- unlocks another entity
- unlocks a location or choice

This is central to literature RPGs because story progression often depends on:

- what you are
- what you know
- what you possess
- what you have already unlocked

These should be expressed as generic rules, not as hardcoded RPG mechanics.

### 6. Separation between authored world definitions and runtime state

The framework should clearly separate:

- **world definitions**: what exists in the world
- **runtime state**: what the player currently has, is, knows, or has unlocked
- **story graph**: scenes, choices, and transitions

This is one of the most important boundaries in the whole design.

If these are not separated, the model becomes confused very quickly.

## What the framework should explicitly exclude

The framework should exclude all built-in domain ontology.

That means it should not ship first-class built-in concepts like:

- species
- stats
- traits
- items
- spells
- skill trees
- equipment slots
- factions
- quests
- classes
- leveling
- combat systems

Those are all valid things for a consumer app to define, but they are not framework-level truths.

The framework should also exclude:

- product-specific authoring workflows
- editor forms and UI
- save systems
- balancing tools
- progression dashboards

## What the framework should be careful not to over-model

Even a generic meta-model can become too large if it tries to do too much.

The risk areas are:

### Inheritance semantics

It is reasonable to support generic composition or inheritance-like relationships.

It is not reasonable, at this stage, to hardcode one canonical inheritance system for all worlds.

The framework should allow:

- one entity grants or includes other entities
- one entity contributes modifiers or references

It should avoid shipping a deeply opinionated class/species/perk inheritance engine.

### Modifier math

It is reasonable to support the existence of modifiers.

It is risky to embed a fully opinionated numerical rules engine too early.

The framework should support:

- declarative modifier structures
- pluggable evaluation behavior

It should avoid shipping assumptions about combat formulas, stacking rules, or character-sheet
math unless that becomes unavoidable later.

### Inventory semantics

It is reasonable to support the idea that runtime state can own entities and resources.

It is too much to hardcode:

- stack rules
- equipment slot systems
- shop rules
- encumbrance systems

Those should stay in the consumer app unless a later pattern proves generic enough to lift.

## Relationship to the story graph

The entity meta-model should not replace the story graph.

The likely separation is:

- **story graph** handles scenes, choices, and traversal
- **entity meta-model** handles world/entity definitions and relationships
- **runtime state** records which entities and unlocks are currently active for a player

Then conditions and effects bridge the two.

Examples:

- a story choice can require an entity or tag
- a story choice can grant an entity or unlock
- a location can become reachable because runtime state now satisfies an entity-based rule

This keeps the graph model focused while still allowing world logic to matter.

## Recommended minimal contract

If this were reduced to the smallest serious framework addition, it would include:

1. `EntityTypeDefinition`
2. `EntityInstance`
3. typed entity references
4. generic modifier structures
5. generic prerequisite/unlock structures
6. runtime-state conventions for owned/active/unlocked entities

Nothing more should be assumed at first.

The first implementation slice in this repo covered:

- entity type definitions
- entity instances
- typed references
- declarative modifiers
- declarative prerequisites and unlocks
- validation only

Later work added runtime entity state, derived state, entity-aware transition primitives,
failure details, cross-validation, and an executable literature-RPG example. Use
[05-consumer-app-readiness-plan.md](05-consumer-app-readiness-plan.md) for current next-phase work.

## Package decision

The package decision has been made.

Fiction Map now has a separate optional package:

- `@fiction-map/entities`

This package is the home for the generic entity meta-model.

The `@fiction-map/entities` implementation includes:

- entity type definitions
- entity instances grouped into worlds
- typed references
- declarative modifiers
- declarative prerequisites and unlocks
- validation for entity structure and reference integrity

Runtime entity state, derived state, built-in entity-aware transition conditions/effects, failure
details, and cross-validation now live in `@fiction-map/runtime`. It still does not include
RPG-specific evaluation semantics.

## Recommendation

The continuing recommendation is:

- adopt the minimal entity meta-model concept
- do **not** adopt a built-in RPG ontology
- keep `@fiction-map/entities` separate from `@fiction-map/core`
- connect it to runtime through explicit state and derivation contracts

The reason is simple:

- no entity meta-model is too little
- built-in RPG concepts are too much
- a small generic meta-model is the credible middle

The active source of truth for continued work is:

- [Consumer-App Readiness Plan](05-consumer-app-readiness-plan.md)

## Bottom line

If Fiction Map wants to support flexible worlds and different environments, the framework should
allow an entity system model to be created.

But it should do so by providing:

- generic definitions
- generic relationships
- generic modifiers
- generic unlock rules

It should not decide what a world contains.
