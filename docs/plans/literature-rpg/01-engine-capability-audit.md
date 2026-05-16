# Literature RPG Engine Capability Audit

Date: 2026-05-16

## Purpose

This document answers a precise question without assuming any prior context:

Given the current Fiction Map packages, what can a consumer app for a literature RPG already do,
what is awkward, and what is not yet supported cleanly enough?

## Starting context

Fiction Map currently has two relevant package surfaces for this question:

### `@fiction-map/core`

This package provides the abstractions used by a consumer app to define:

- node types
- edge types
- conditions
- effects
- graph instances

It is a schema and validation layer, not a product-specific story model.

### `@fiction-map/runtime`

This package provides the headless execution layer used by a consumer app to:

- create runtime state
- evaluate conditions
- apply effects
- step through transitions
- validate graph traversal integrity
- enumerate paths

It is a simulation and execution layer, not an editor layer.

## What a literature RPG needs from an engine

The target use case is more demanding than a simple branching story.

A literature-RPG-style consumer app typically needs the engine to support:

- branching prose
- stateful choices
- inventory checks
- item acquisition and item consumption
- currency or resource gates
- equipment or selected-item state
- quest or progression state
- blocked choices that remain visible
- hidden choices that should not appear yet
- failure consequences and failure branches
- path testing and validation
- author-facing debugging signals

The key question is whether the current engine contracts can express those concerns without
forcing the consumer app to invent its own parallel methodology.

## Current `core` surface

The current `core` package uses generic definitions.

Relevant contracts in [packages/core/src/types.ts](/Users/nav/Projects/fiction-map/packages/core/src/types.ts):

- `ConditionDefinition`
- `ConditionInstance`
- `EffectDefinition`
- `EffectInstance`
- `EdgeInstance`
- `GraphDefinition`
- `PropertySchema`

The important structural facts are:

1. Conditions and effects are consumer-defined types.
2. Condition and effect definitions can declare parameter schemas.
3. Graph edges can carry condition instances and effect instances.
4. Graph validation currently checks type existence and graph structure.

The important limitation is that parameter schemas are declared, but they are not yet enforced
deeply when graph instances are validated.

## Current `runtime` surface

The current runtime contracts are defined in
[packages/story-runtime/src/types.ts](/Users/nav/Projects/fiction-map/packages/story-runtime/src/types.ts).

The key pieces are:

- `GraphRuntimeState`
- `Condition`
- `ConditionSet`
- `Effect`
- `Transition`
- `TransitionAvailability`
- `TransitionTrace`
- `TransitionResult`

The runtime state currently provides:

- `currentNodeId`
- `history`
- `variables`
- `flags`
- `visited`
- `extensions`

The runtime transition model currently supports:

- requirements
- visibility
- effects
- failure effects
- failure target

That is already richer than the authoring contract exposed by `core`.

## What is already expressible today

### App-defined item logic

A consumer app can already define its own condition and effect types for item logic.

Examples already in the repo:

- [has-item.condition.ts](/Users/nav/Projects/fiction-map/examples/story/conditions/has-item.condition.ts)
- [give-item.effect.ts](/Users/nav/Projects/fiction-map/examples/story/effects/give-item.effect.ts)

That means the abstraction model already accepts concepts such as:

- `has-item`
- `buy-item`
- `consume-item`
- `equip-item`
- `can-afford`
- `quest-stage-at-least`

This is a strong sign that the architecture direction is compatible with a literature RPG.

### Gated story choices

Edges can already carry conditions and effects.

That means a consumer app can model:

- a choice that only works if the player has a rope
- a choice that grants an item on success
- a choice that spends currency
- a choice that mutates quest state

The engine already understands the idea that a graph transition both checks state and mutates
state.

### Hidden and blocked choices at runtime

The runtime transition model distinguishes:

- visibility
- requirements

That means the runtime is already structurally capable of differentiating:

- hidden choices that should not be shown
- blocked choices that should remain visible but unavailable

This is especially important for literature RPGs, where "you can see this option but cannot take
it yet" is a common design pattern.

### Failure consequences

The runtime transition model also supports:

- `failureEffects`
- `failureTargetNodeId`

That means a failed action can still do something meaningful, such as:

- lose reputation
- consume a turn
- redirect to a failure passage
- mark a scene as attempted

This is another strong fit for literature-RPG design.

### Headless simulation

The `GraphRuntime` class already supports:

- creating runtime state
- enumerating available transitions
- stepping through a transition
- walking through a graph
- enumerating paths
- validating graph connectivity

That means a consumer app does not need to build its own execution model from scratch.

## Where support is real but fragile

### Condition definitions are stronger than condition instances

The repo can declare a condition schema like:

```ts
defineCondition({
  id: "has-item",
  parameters: {
    itemId: { type: "string", required: true },
  },
})
```

But the graph validation layer does not currently guarantee that every use of `has-item` actually
contains a valid `itemId: string`.

This means the definition layer is ahead of the instance-validation layer.

### Runtime state is flexible but unstructured

The runtime has enough storage to represent literature-RPG state, but not enough shared structure
to make that methodology stable by default.

A consumer app could plausibly put item state in any of these places:

- `variables.inventory`
- `variables.items`
- `flags["has-rope"]`
- `extensions.inventory`
- `extensions.party.items`

The engine allows all of those, which is flexible, but also means the engine does not yet guide a
consumer app toward one stable model.

### Runtime extensibility is present but easy to misuse

The runtime accepts custom evaluator and handler maps in the `GraphRuntime` constructor.

That is good.

The problem is that the extension mechanism is low-level enough that a consumer app must decide
how to combine custom logic with built-ins. The engine does not yet provide a strongly guided
"extend the built-ins safely" path.

### Authoring and runtime models do not line up cleanly

The authoring side in `core` exposes:

- edge conditions
- edge effects

The runtime side exposes:

- requirements
- visibility
- failure effects
- failure target

This mismatch matters because literature-RPG design often needs all of those concepts to be
authored intentionally, not inferred or smuggled through adapters later.

## Capability examples

### Example: "Buy lantern for 5 gold"

This is directionally possible now.

A consumer app can define:

- `can-afford(currency, amount)` condition
- `buy-item(itemId, cost)` effect

The runtime can evaluate the condition and apply the effect.

The fragile part is that the engine does not yet provide:

- a canonical place for gold or inventory state
- strong instance validation for the condition and effect payloads
- structured explanations if the purchase is blocked

### Example: "Show lockpick option, but disable it unless the player owns lockpicks"

This is supported in the runtime model because visibility and requirements are separate concepts.

The fragile part is that the authored graph model in `core` does not yet expose this as a
first-class distinction.

### Example: "Attempting to climb without rope causes injury and redirects to failure text"

This is supported in the runtime model via:

- failed requirements
- `failureEffects`
- `failureTargetNodeId`

The fragile part is that this richer semantics currently lives more clearly in runtime than in the
graph authoring layer.

### Example: "Quest stage 2 unlocks a new dialogue branch"

This is directionally possible now with app-defined conditions and state conventions.

The fragile part is that quest state is not yet a clearly documented part of the engine
methodology.

## What this means in practical terms

A literature-RPG consumer app can be built on top of Fiction Map's current architecture.

However, if development started immediately, the consumer app would have to compensate for several
engine-level gaps itself:

- define and enforce its own world-state conventions
- work around weak instance validation
- invent its own richer authored transition model
- add its own explanation/debugging layer for authors

That would make the consumer app carry responsibilities that probably belong in the engine layer.

## Bottom line

The current engine is compatible with literature-RPG logic.

It is not yet a disciplined literature-RPG engine contract.

The strongest conclusion from this audit is that the next improvements should focus on tightening
the headless contracts, not on adding UI or platform complexity.
