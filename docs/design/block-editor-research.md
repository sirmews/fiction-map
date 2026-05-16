# Block Editor Research — Consumer App Guidance

> Research summary for apps built on top of Fiction Map.
>
> This document is not a package design spec for Fiction Map itself. The canonical product
> boundary is:
>
> - Fiction Map provides the headless engine and tooling
> - the consumer app provides the schemas, UI, and product workflows

## What We Learned

We reviewed BlockSuite, BlockNote, Logseq, Block Protocol, and Tale Weaver to understand
what should live in a reusable engine versus what should live in an app-specific editor.

The consistent result was:

- keep the document/model layer separate from the editor UI
- let apps define their own concrete schema types
- generate only the parts that are truly structural
- keep visual design and product workflows in the app

## Useful Patterns

### 1. Document and editor should be separate

The same underlying story graph should support multiple views:

- graph canvas
- scene inspector
- timeline/tree views
- playtest preview

That means Fiction Map should provide model/runtime contracts, while the consumer app owns
how those contracts are presented.

### 2. Schema and rendering are different concerns

The engine can help define:

- what fields exist
- what relationships are valid
- what conditions/effects are allowed
- what metadata is available to tooling

The app still has to decide:

- field order and grouping
- visual hierarchy
- panel structure
- colors, icons, labels, and affordances
- product-specific interactions

### 3. App-specific schemas should stay in the app

Fiction Map should not ship built-in product schemas like:

- `SceneNode`
- `ChoiceEdge`
- `QuestNode`
- `InventoryCondition`

Instead, the consumer app should define those using the abstractions in `@fiction-map/core`.

### 4. Subgraph-aware UI is app work

Real editor surfaces often need more than a single node. A scene editor may need:

- the scene node
- outgoing and incoming choices
- related entities
- annotations
- validation issues

That composition logic belongs in the consumer app, not in the reusable engine package.

## What Fiction Map Should Generate

These are good engine-level responsibilities:

- structural validation from graph constraints
- runtime traversal and playtest simulation
- metadata for tooling, CI, and AI
- serializable graph/document contracts
- source-agnostic graph analysis

## What Fiction Map Should Not Generate

These are poor engine-level responsibilities:

- beautiful editor UI from schema alone
- product-specific panels or page shells
- ShadCN components
- canvas interaction design
- auth, persistence, autosave, and collaboration
- story-specific authoring workflows

## Recommended Boundary

### Fiction Map

Owns:

- `@fiction-map/core`
- `@fiction-map/runtime`
- CLI/tooling
- shared graph contracts
- headless validation and execution

### Consumer app

Owns:

- app-specific schema definitions
- ShadCN UI
- routing and layout
- editor interactions
- persistence and backend integration
- rich text editing
- product-specific workflows

## Practical takeaway

The research supports a simpler strategy than the older package explorations:

- keep Fiction Map small and headless
- let the Story Editor app import it
- define the concrete story model in that app
- use Fiction Map as the engine behind the editor, not as the editor itself
