# Consumer Usage Guide

This guide demonstrates how a separate consumer application (such as a Story Editor or Game Engine) integrates with Fiction Map.

Fiction Map is a **headless framework**. It does not own your UI, your database persistence, or your specific game/narrative mechanics. Instead, it provides the generic abstractions for nodes, graphs, world entities, and state transitions.

The examples below use a "Literature RPG" concept to illustrate the flow, matching the executable test found in [`packages/runtime/src/examples/literature-rpg.test.ts`](../packages/runtime/src/examples/literature-rpg.test.ts).

## The Framework / Editor Boundary

*   **Consumer App Owns:** UI, project persistence, specific game mechanics (e.g., stats, species, items), rendering runtime state, and the execution loop timer.
*   **Fiction Map Owns:** Entity relationships schemas, validating graph connections against the world model, enforcing transition rules (conditions/effects), and updating runtime machine state.

---

## 1. Creating a Registry

All schema definitions are scoped to a registry. Your consumer app instantiates one (or many — one per project, namespace, or worker) so the framework never relies on global mutable state.

```typescript
import { EntityRegistry } from "@fiction-map/entities";

const registry = new EntityRegistry();
```

`EntityRegistry` extends `ProjectRegistry` from `@fiction-map/core`, so the same registry holds node types, edge types, conditions, effects, graphs, entity types, and worlds.

## 2. Defining Schemas (Entity Types)

Your app uses `@fiction-map/entities` to teach the engine about your specific domain concepts. In this RPG example, we want `stat`, `trait`, `species`, `item`, and `location`.

```typescript
import { defineEntityType } from "@fiction-map/entities";

// A base trait concept
defineEntityType(registry, {
  id: "trait",
  properties: {
    label: { type: "string", required: true },
  },
});

// A species can grant multiple traits
defineEntityType(registry, {
  id: "species",
  properties: {
    label: { type: "string", required: true },
  },
  references: {
    baseStats: { to: ["stat"], multiple: true, required: true },
    grants: { to: ["trait"], multiple: true },
  },
});

// Items can also grant traits
defineEntityType(registry, {
  id: "item",
  properties: {
    label: { type: "string", required: true },
  },
  references: {
    grants: { to: ["trait"], multiple: true },
  },
});
```

*Note: The engine doesn't know what an "Elf" or a "Sword" is yet, only what structure they should have.*

## 3. Instantiating the World

Next, the author uses your editor to create actual entities. Your app feeds these into `defineWorld`.

```typescript
import { defineWorld } from "@fiction-map/entities";

const world = defineWorld(registry, {
  id: "moonlit-forest",
  entities: [
    { id: "dexterity", type: "stat", label: "Dexterity" },
    {
      id: "night-vision",
      type: "trait",
      label: "Night Vision",
      modifiers: [
        { target: "senses.darkness", operation: "add", value: 2 },
      ],
    },
    {
      id: "elf",
      type: "species",
      label: "Elf",
      references: {
        baseStats: ["dexterity"],
        grants: ["night-vision"],
      },
      // Note the unlock cascade!
      unlocks: ["night-vision"],
    },
    {
      id: "lantern",
      type: "item",
      label: "Lantern",
      references: {
        grants: ["night-vision"],
      },
      unlocks: ["dark-cave"],
    },
    {
      id: "dark-cave",
      type: "location",
      label: "Dark Cave",
      prerequisites: [
        { kind: "entity", target: "lantern", operator: "has" },
      ],
    },
  ],
});
```

## 4. Defining Transitions

Your visual editor allows the author to draw edges (transitions) between story nodes. Transitions define *when* they can happen (Conditions) and *what* they do (Effects).

```typescript
import type { Transition } from "@fiction-map/runtime";

const transitions: Transition[] = [
  {
    id: "enter-dark-cave",
    sourceNodeId: "forest-edge",
    targetNodeId: "dark-cave",
    visibility: {
      all: [{ type: "entityUnlocked", entityId: "dark-cave" }],
    },
    requirements: {
      all: [
        { type: "hasEntity", entityId: "lantern" },
        { type: "resourceAtLeast", key: "stamina", value: 3 },
      ],
    },
    effects: [
      { type: "spendResource", key: "stamina", amount: 3 },
      { type: "grantEntity", entityId: "night-vision" },
    ],
  },
];
```

## 5. Static Validation

Before letting the player start, or while the author is typing in the editor, your app should validate that the transitions don't reference typos or missing entities.

```typescript
import { validateEntityTransitionReferences } from "@fiction-map/runtime";

const validation = validateEntityTransitionReferences(transitions, world);
if (!validation.valid) {
  // Your app highlights errors in the editor UI
  console.log(validation.errors);
  // e.g., "unknown-entity-reference: 'missing-relic' not found"
}
```

## 6. Runtime Execution & Derived State

When a player plays the game, your app maintains a mutable `GraphRuntimeState`.

```typescript
import {
  createInitialState,
  grantEntity,
  addResource,
} from "@fiction-map/runtime";

let state = createInitialState("forest-edge");

// E.g., The player selected Elf and picked up a lantern
state = grantEntity(state, "elf");
state = grantEntity(state, "lantern");
state = addResource(state, "stamina", 5);
```

### Deriving State

The runtime state only holds arrays of IDs (`owned`, `active`, `unlocked`). Your app calls `deriveEntityState` to merge the static world definition with the player's current runtime progress, computing cascading unlocks, prerequisites, and modifiers.

```typescript
import { deriveEntityState } from "@fiction-map/runtime";

const derived = deriveEntityState(world, state);
// derived.effectiveEntityIds includes 'elf', 'lantern', 'night-vision', 'dark-cave'
// derived.prerequisites reports whether 'dark-cave' is satisfied
```

`derived.effectiveEntityIds` is a single `Set<string>` that fuses explicit ownership with cascaded `unlocks` from the world schema. You do *not* need to materialize it back into runtime state — the runtime can read it directly during evaluation (see next step).

### Evaluating Conditions With Derived State

You check if a player can take a transition. Pass the derived state in the evaluation context so cascaded unlocks (e.g. picking up the Lantern unlocking the Dark Cave) are respected automatically.

```typescript
import {
  checkTransitionAvailability,
  builtinEvaluators,
} from "@fiction-map/runtime";

const availability = checkTransitionAvailability(
  state,
  transitions[0],
  builtinEvaluators,
  { derivedState: derived }
);

if (!availability.visible) {
  // Your app might hide the button
  console.log(availability.failedConditions);
  /* Outputs exactly what failed:
  [{
    scope: "visibility",
    group: "all",
    condition: { type: "entityUnlocked", entityId: "dark-cave" },
  }]
  */
}
```

If you omit `{ derivedState }`, the entity-aware evaluators fall back to explicit runtime state only — useful when you deliberately want strict evaluation, but not the default ergonomic path.

### Applying Effects (Transitioning)

Once conditions are met, your app applies the transition. Pass the same `{ derivedState }` context so visibility/requirements evaluation matches what your UI showed the user.

```typescript
import {
  applyTransition,
  builtinHandlers,
} from "@fiction-map/runtime";

const result = applyTransition(
  state,
  transitions[0],
  builtinEvaluators,
  builtinHandlers,
  { derivedState: derived }
);

if (result.success) {
  state = result.state;
  // state.currentNodeId === "dark-cave"
  // stamina is now 2
  // 'night-vision' is granted
}
```

Note that `dark-cave` was never explicitly stored as `unlocked` in runtime state — it was reachable purely because the derived state computed the cascade from the Lantern's schema. See [docs/decisions/2026-05-18-derived-unlock-semantics.md](decisions/2026-05-18-derived-unlock-semantics.md) for the rationale.

## Summary

1. Instantiate an `EntityRegistry`.
2. Define generic schemas with `defineEntityType` / `defineWorld` (and node/edge/condition/effect helpers from `@fiction-map/core`).
3. Populate the static graph and world instances.
4. Validate statically with `validateEntityTransitionReferences`.
5. Run the simulation using `@fiction-map/runtime`, passing `{ derivedState }` so cascaded unlocks Just Work.

Your consumer app wraps all of these calls in visual panels, menus, save/load serialization, and gameplay rendering loops.

*Note for Bun users: If you are building an executable consumer app (e.g. `bun run src/main.ts`) and relying on `import.meta.main` for entry point detection, make sure to install `@types/bun` as a dev dependency so TypeScript recognizes the extension.*
