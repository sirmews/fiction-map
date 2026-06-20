# Decision: Headless Engine Direction

Date: 2026-05-16

## Status

Accepted

## Why this exists

We reviewed adjacent systems and needed a durable decision about what Fiction Map is trying to
be, what it is not trying to be, and what that means for package boundaries.

This document is the short decision layer on top of:

- [North Star](../NORTH_STAR.md)
- [Block Editor Research](../design/block-editor-research.md)
- [Adjacent Platforms and Packages](../research/adjacent-platforms/README.md)
- [Literature RPG Gap Analysis](../plans/2026-05-16-literature-rpg-gap-analysis.md)

## Decision

Fiction Map will be a **headless engine/framework and tooling layer** for graph-based story
systems.

It will **not** be the end-user Story Editor product.

The Story Editor may live in a separate repo or in this monorepo, but it is a **consumer app**
that imports Fiction Map packages rather than defining their product/UI responsibilities.

## Adopt

We are explicitly adopting these principles:

1. **Engine first**
   Fiction Map owns graph abstractions, validation, runtime execution, and tooling.

2. **Consumer app owns schemas**
   Concrete story schemas such as `SceneNode`, `ChoiceEdge`, quest logic, and world-model types
   belong to the consumer app, not to `@fiction-map/core`.

3. **Consumer app owns UI**
   ShadCN, routing, forms, editor panels, rich text editing, persistence, auth, and product
   workflows belong to the consumer app.

4. **Runtime stays headless**
   `@fiction-map/runtime` should expose simulation and validation behavior without depending on
   any visual editor or canvas model.

5. **Tooling stays optional**
   Metadata generation, semantics generation, and validation CLI flows should support consumer
   apps, CI, and AI workflows without becoming a workspace platform.

6. **Presentation stays in consumer space**
   Visual semantics and render behavior are never authored in engine-facing types.
   Icons, colors, layout slots, fonts, panels, and widget selection belong to consumer app configuration.

## Reject

We are explicitly rejecting these directions inside the Fiction Map package surface:

1. **Built-in Story Editor UI**
   No ShadCN components, page shells, product panels, or editor workflow components in the core
   package surface.

2. **Visual-library-led architecture**
   Fiction Map should not be shaped around React Flow, Rete, JointJS, GoJS, or similar visual
   frameworks. Those may be used by a consumer app, but they are not the architectural center of
   the engine.

3. **Platform bloat**
   We are not building Arcweave/articy-style collaboration, cloud workspaces, sharing, or
   enterprise content-management features in this repo.

4. **Custom language first**
   We are not committing Fiction Map to a custom narrative scripting language/compiler as a first
   step.

## What we are taking from adjacent systems

### From ink

- strong engine/editor separation
- exportable intermediate representation
- host-owned rendering and side effects

### From Yarn Spinner

- bridge-style runtime integration
- command/callback model between runtime and host
- reusable engine imported by another app

### From XState / Stately

- strong package layering
- optional visual tooling on top of a headless runtime
- model/runtime contract first, integrations second

### From Arcweave and articy:draft

- discipline around structured authored data
- clear distinction between authoring product and integration surface
- reminder that product workflows belong in the app, not in the engine

## What we are not taking

### From Twine

- coupling authored output directly to presentation/runtime behavior

### From visual graph libraries

- using UI node/edge models as the engine's canonical graph model
- letting canvas interaction concerns leak into `core` or `runtime`

### From enterprise narrative platforms

- broad built-in product/domain scope
- collaboration/platform complexity
- all-in-one workspace assumptions

## Implications for packages

### `@fiction-map/core`

Should own:

- graph-definition abstractions
- structural graph contracts
- reusable validation primitives
- metadata shapes

Should not own:

- built-in story schemas
- app-specific domain ontology
- UI concerns
- visual semantics or rendering metadata (icons/colors/labels/layout)

### `@fiction-map/runtime`

Should own:

- traversal
- stateful or host-driven simulation APIs
- condition/effect evaluation contracts
- runtime validation
- path enumeration and playtest support

Should not own:

- editor UI state
- canvas coordinates
- visual graph interactions
- any UI/rendering logic or presentational defaults

### `fiction-map` CLI

Should own:

- metadata generation
- semantics generation
- validation/export tooling as needed

Should not own:

- a platform runtime
- a built-in editor shell

## Implications for the consumer app

The consumer app is free to choose:

- repo placement
- frontend stack
- UI library
- persistence model
- product workflows

The only requirement is that it consume Fiction Map through the engine/tooling contracts rather
than pushing product responsibilities back down into the packages.

## Immediate consequences

The first entity-aware engine foundation has now been implemented. The current active next-phase
plan is:

- [Literature RPG Consumer-App Readiness Plan](../plans/literature-rpg/05-consumer-app-readiness-plan.md)

This means the next work in Fiction Map should focus on making the package contract consumable by a
separate Story Editor app:

1. public API audit
2. consumer usage guide
3. documented example placement
4. derived unlock semantics decision
5. runtime explanation ergonomics review

It does **not** mean building:

- editor canvases
- ShadCN components
- workspace/platform features
- product-specific authoring flows

## Open questions

These are the remaining boundary questions that should drive the next-phase plan:

1. What is the smallest serializable graph/document contract the consumer app should read/write?
2. Should the literature-RPG example remain a test, become a fixture, or become a separate example package?
3. Should derived unlocks remain read-only, or should runtime expose an explicit materialization helper?
4. Is there an explicit compile/export step between authored data and runtime-ready data?

## Bottom line

Fiction Map is the engine.

The Story Editor is the product.

The engine should stay small, headless, and importable. The product should stay outside the
package surface, even if it lives in the same monorepo.
