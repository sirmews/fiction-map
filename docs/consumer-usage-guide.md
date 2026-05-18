# Consumer Usage Guide

This guide demonstrates how a separate consumer application (such as a Story Editor or Game Engine) integrates with Fiction Map. 

Fiction Map is a **headless framework**. It does not own your UI, your database persistence, or your specific game/narrative mechanics. Instead, it provides the generic abstractions for nodes, graphs, world entities, and state transitions.

The examples below use a "Literature RPG" concept to illustrate the flow, matching the executable test found in [`packages/story-runtime/src/examples/literature-rpg.test.ts`](../packages/story-runtime/src/examples/literature-rpg.test.ts).

## The Framework / Editor Boundary

*   **Consumer App Owns:** UI, project persistence, specific game mechanics (e.g., stats, species, items), rendering runtime state, and the execution loop timer.
*   **Fiction Map Owns:** Entity relationships schemas, validating graph connections against the world model, enforcing transition rules (conditions/effects), and updating runtime machine state.

---

## 1. Defining Schemas (Entity Types)

Your app first uses `@fiction-map/entities` to teach the engine about your specific domain concepts. In this RPG example, we want `stat`, `trait`, `species`, `item`, and `location`.

```typescript
import { defineEntityType } from "@fiction-map/entities";

// A base trait concept
defineEntityType({
  id: "trait",
  properties: {
    label: { type: "string", required: true },
  },
});

// A species can grant multiple traits
defineEntityType({
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
defineEntityType({
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

## 2. Instantiating the World

Next, the author uses your editor to create actual entities. Your app feeds these into `defineWorld`.

```typescript
import { defineWorld } from "@fiction-map/entities";

const world = defineWorld({
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

## 3. Defining Transitions

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

## 4. Static Validation

Before letting the player start, or while the author is typing in the editor, your app should validate that the transitions don't reference typos or missing entities.

```typescript
import { validateEntityTransitionReferences } from "@fiction-map/runtime";

const validation = validateEntityTransitionReferences(transitions, world);
if (!validation.valid) {
  // Your app highlights errors in the editor UI
  console.log(validation.errors); 
  // e.g., "unknown-entity-reference: 'lantern' not found"
}
```

## 5. Runtime Execution & Derived State

When a player plays the game, your app maintains a mutable `GraphRuntimeState`.

```typescript
import { 
  createInitialState, 
  grantEntity, 
  addResource 
} from "@fiction-map/runtime";

let state = createInitialState("forest-edge");

// E.g., The player selected Elf and picked up a lantern
state = grantEntity(state, "elf");
state = grantEntity(state, "lantern");
state = addResource(state, "stamina", 5);
```

### Deriving State

The runtime state only holds arrays of IDs (`owned`, `active`, `unlocked`). Your app uses `deriveEntityState` to merge the static world definition with the player's current runtime progress, calculating prerequisites and modifiers.

```typescript
import { deriveEntityState } from "@fiction-map/runtime";

const derivedState = deriveEntityState(world, state);
// derivedState.effectiveEntityIds includes 'elf', 'lantern', 'night-vision', 'dark-cave'
// derivedState.prerequisites checks if 'dark-cave' requirements are met
```

*Note: Derived unlocks are calculated on the fly, but the runtime graph evaluates based on explicit runtime state. Your consumer app handles materializing derived unlocks into explicit state if needed.*

### Evaluating Conditions & Failed Feedback

You check if a player can click a transition. If they can't, Fiction Map tells your app exactly *why*.

```typescript
import { 
  checkTransitionAvailability, 
  builtinEvaluators 
} from "@fiction-map/runtime";

const availability = checkTransitionAvailability(state, transitions[0], builtinEvaluators);

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

### Applying Effects (Transitioning)

Once conditions are met (e.g. your app explicitly calls `unlockEntity(state, 'dark-cave')`), your app applies the transition.

```typescript
import { 
  applyTransition, 
  builtinHandlers 
} from "@fiction-map/runtime";

const result = applyTransition(
  state, 
  transitions[0], 
  builtinEvaluators, 
  builtinHandlers
);

if (result.success) {
  state = result.state;
  // state.currentNodeId === "dark-cave"
  // stamina is now 2
  // 'night-vision' is granted
}
```

## Summary

1. Define generic schemas with `@fiction-map/entities`.
2. Populate the static graph and world instances.
3. Validate statically.
4. Run the simulation using `@fiction-map/runtime` state transitions.

Your consumer app wraps all of these calls in visual panels, menus, saving/loading serialization, and gameplay rendering loops.