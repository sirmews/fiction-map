# Literature RPG Gap Catalog

Date: 2026-05-16

> Reference snapshot, not the active implementation plan.
>
> Use [04-continued-work-plan.md](04-continued-work-plan.md) as the single source of truth for
> current status, next tasks, and implementation order. This catalog records requirements and
> rationale, not the current task sequence.

## Purpose

This document records the detailed engine gaps that matter for a literature-RPG-style consumer
app.

It assumes no prior context. It explains:

- what the engine does now
- why that is insufficient in specific places
- what a minimal improvement would need to achieve
- what should remain outside the engine

This is not an implementation plan. It is a requirements-quality gap record.

## Architectural baseline

Fiction Map is intended to be:

- a headless graph abstraction layer
- a headless runtime and validation layer
- optional tooling around those layers

It is not intended to be:

- the editor product
- a ShadCN component library
- a persistence platform
- a collaboration system

Because of that boundary, every gap below is framed as an engine or contract problem, not a UI
problem.

## Gap 1: condition and effect instance validation is too weak

### Current behavior

`@fiction-map/core` allows a consumer app to define conditions and effects with parameter schemas.

Examples:

- [packages/core/src/condition.ts](/Users/nav/Projects/fiction-map/packages/core/src/condition.ts)
- [packages/core/src/effect.ts](/Users/nav/Projects/fiction-map/packages/core/src/effect.ts)

However, graph validation in
[packages/core/src/graph.ts](/Users/nav/Projects/fiction-map/packages/core/src/graph.ts)
only checks whether the referenced condition or effect type exists.

It does not fully validate whether the payload instance conforms to the declared schema.

### Why this matters

Literature-RPG logic relies heavily on parameterized conditions and effects.

Examples:

- `has-item(itemId: string)`
- `can-afford(resource: string, amount: number)`
- `buy-item(itemId: string, cost: number)`
- `advance-quest(questId: string, stage: number)`

If payload validation is weak, authoring mistakes become runtime bugs instead of early validation
errors.

Examples of mistakes the engine should catch:

- missing required `itemId`
- using `itemID` instead of `itemId`
- passing `"5"` as a string where `5` is expected
- passing an unknown enum value

### What minimum improvement means

The engine needs:

- validation of required parameters
- validation of parameter types
- validation of nested property shapes where applicable
- errors tied back to the specific edge and condition/effect instance

### What should remain outside the engine

The engine does not need:

- a form builder
- a visual inspector
- story-editor-specific validation UI

Those belong to the consumer app.

## Gap 2: world-state methodology is too implicit

### Current behavior

The runtime state currently provides generic containers:

- `variables`
- `flags`
- `visited`
- `extensions`

See [packages/story-runtime/src/types.ts](/Users/nav/Projects/fiction-map/packages/story-runtime/src/types.ts).

This is flexible enough to store literature-RPG data, but it does not guide the consumer app
toward a stable shape.

### Why this matters

Literature RPGs usually need repeatable patterns for:

- inventory
- currency or resources
- equipment or selected loadout
- quest or progression state
- relationship or faction state
- consumables and counters

Without a shared methodology, the consumer app must invent a private structure and hope it stays
consistent over time.

That undermines one of the reasons to have a headless engine in the first place.

### What minimum improvement means

The engine does not need a giant RPG ontology.

It does need a small documented convention for the most common state domains, such as:

- resources
- inventory
- progression
- selections or equipment

This could remain extensible while still giving the consumer app a stable default model.

### What should remain outside the engine

The engine does not need:

- item databases
- shop configuration UIs
- balancing tools
- save-slot systems

It only needs the runtime contract to be coherent enough that those product features can be built
consistently.

## Gap 3: runtime extension registration is too low-level

### Current behavior

`GraphRuntime` accepts evaluator and handler maps directly.

See [packages/story-runtime/src/runtime.ts](/Users/nav/Projects/fiction-map/packages/story-runtime/src/runtime.ts).

That means a consumer app is responsible for deciding how custom logic interacts with built-ins.

### Why this matters

In a literature RPG, custom logic is normal, not exceptional.

A consumer app will almost certainly need app-specific handlers for:

- inventory checks
- purchases
- item grants
- consumables
- quest updates
- party or faction logic

If extension registration is easy to misuse, the consumer app can accidentally replace baseline
behavior while trying to add domain-specific behavior.

### What minimum improvement means

The engine needs a first-class extend path such as:

- built-ins plus app custom evaluators
- built-ins plus app custom handlers

The important point is not the exact API shape. The important point is that safe extension should
be the obvious path.

### What should remain outside the engine

The engine does not need to ship all RPG handlers itself.

It only needs the extension contract to be easy and difficult to misuse.

## Gap 4: authored graph semantics are thinner than runtime semantics

### Current behavior

The authoring side in `core` models:

- conditions on edges
- effects on edges

The runtime side models:

- `requirements`
- `visibility`
- `failureEffects`
- `failureTargetNodeId`

See:

- [packages/core/src/types.ts](/Users/nav/Projects/fiction-map/packages/core/src/types.ts)
- [packages/story-runtime/src/types.ts](/Users/nav/Projects/fiction-map/packages/story-runtime/src/types.ts)
- [packages/story-runtime/src/adapter.ts](/Users/nav/Projects/fiction-map/packages/story-runtime/src/adapter.ts)

### Why this matters

Literature-RPG choices are often more nuanced than a single success-only branch.

Common patterns include:

- visible but unavailable options
- hidden options unlocked later
- failed actions that still change state
- failed actions that branch elsewhere

These are not edge cases. They are normal authoring patterns for this genre.

If the richer semantics only exist in runtime, then the authoring model is lagging behind the
actual execution model.

### What minimum improvement means

The engine needs a clearer authored contract for:

- visibility conditions
- availability requirements
- failure effects
- failure target behavior

That could happen either by enriching the authored graph contract directly or by clearly defining
an authored-to-runtime adapter contract.

### What should remain outside the engine

The engine does not need:

- editor affordances for showing blocked choices
- copywriting for disabled states
- product-specific reveal animations

Those are consumer-app concerns.

## Gap 5: runtime explanations are too shallow

### Current behavior

The runtime currently returns coarse reasons such as:

- `"Transition is not visible"`
- `"Requirements not met"`

The runtime also has trace structures, but the public explanation layer is still thin.

See [packages/story-runtime/src/core/transition.ts](/Users/nav/Projects/fiction-map/packages/story-runtime/src/core/transition.ts).

### Why this matters

A literature-RPG consumer app needs better explanations for:

- authors
- testers
- automation
- eventual AI-assisted tooling

Examples of useful reasons:

- missing required item `rope`
- insufficient `gold`, requires `5`, has `3`
- quest `healer` stage is `1`, requires `2`
- selected item does not match required tag `light-source`

Without structured explanations, debugging becomes slower and tooling gets weaker.

### What minimum improvement means

The engine needs machine-readable explanation data for:

- which condition failed
- what values were compared
- whether a transition was hidden or blocked
- which effects ran on success or failure

### What should remain outside the engine

The engine does not need:

- human-facing copy for every error state
- panel layouts
- authoring-specific visualizations

It only needs to expose enough structure for the consumer app to present good explanations.

## Gap 6: entity references are possible but under-modeled

### Current behavior

`core` already includes property schema support such as:

- `reference`
- `array`
- `map`
- `set`

See [packages/core/src/types.ts](/Users/nav/Projects/fiction-map/packages/core/src/types.ts).

That means the engine is already aware that one object may refer to another.

### Why this matters

A literature RPG often needs to refer to entities such as:

- items
- quests
- factions
- locations
- skills
- equipment slots

The current abstraction layer can represent references, but there is not yet a strongly articulated
methodology for when world entities should be:

- nodes in the story graph
- referenced records outside the story graph
- or a hybrid of both

### What minimum improvement means

The engine should document and support a consistent stance on:

- story-flow graph versus world-entity model
- references between them
- where conditions and effects are expected to resolve those references

### What should remain outside the engine

The engine does not need:

- a full item database UI
- content taxonomies
- CMS workflows

It only needs enough conceptual structure that consumer apps do not have to guess.

## Gap 7: connectivity validation is stronger than semantic validation

### Current behavior

Runtime validation is currently good at structural concerns such as:

- empty graph
- missing start node
- dangling transitions
- unreachable nodes
- orphan nodes

See [packages/story-runtime/src/core/validation.ts](/Users/nav/Projects/fiction-map/packages/story-runtime/src/core/validation.ts).

### Why this matters

That is useful, but a literature RPG also needs semantic checks such as:

- a choice spends an item that is never obtainable
- a quest gate references an unknown quest identifier
- a shop action references a currency domain that does not exist
- a failure target exists structurally but violates design intent

These are not purely runtime-state issues. They are authoring-quality issues that a serious engine
should eventually help detect.

### What minimum improvement means

The engine should move gradually from structural validation toward richer semantic validation,
starting with the validation that is directly implied by declared schemas and runtime contracts.

### What should remain outside the engine

The engine does not need to own game design policy.

It should validate declared contracts, not enforce a specific narrative philosophy.

## Gap prioritization

At the time of the original gap analysis, these gaps were prioritized strictly for engine value as:

1. condition and effect instance validation
2. world-state convention
3. safer runtime extension registration
4. authored transition semantics aligned with runtime
5. richer runtime explanations
6. clearer entity-reference methodology
7. broader semantic validation

That ordering is background analysis. It is not the active implementation sequence. Use
[04-continued-work-plan.md](04-continued-work-plan.md) for the current order of work.

## Non-goals

To keep scope honest, the following are explicitly not required to close the engine gaps above:

- a visual graph editor
- React Flow or Rete integration
- ShadCN components
- cloud sync
- collaboration features
- publishing pipelines
- player save systems
- analytics dashboards

Those may matter for a product, but they are not prerequisites for making Fiction Map a more
credible literature-RPG engine.

## Bottom line

The current gap is not "we need a UI stack."

The current gap is that the engine still leaves too much of the literature-RPG methodology to
consumer-app convention.

The next improvements should make the engine stricter, clearer, and more explicit without making
it larger than it needs to be.
