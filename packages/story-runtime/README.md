# @fiction-map/runtime

Graph execution engine for node-based systems.

## Installation

```bash
npm install @fiction-map/runtime
```

## Features

- **State Management** — Immutable state with history tracking
- **Entity-Aware State** — Generic owned, active, unlocked, and resource state
- **Entity Derivation** — Combine world definitions with runtime entity state
- **Condition Evaluation** — Pluggable condition system
- **Effect Application** — Pluggable effect handlers
- **Graph Traversal** — Transition engine with tracing
- **Built-in Primitives** — Common conditions and effects included

## Quick Start

```typescript
import { 
  createInitialState, 
  applyTransition,
  builtinEvaluators,
  builtinHandlers 
} from "@fiction-map/runtime"

// Create initial state
const state = createInitialState("start-node")

// Define a transition
const transition = {
  id: "choice-1",
  sourceNodeId: "start-node",
  targetNodeId: "next-node",
  requirements: {
    all: [{ type: "hasFlag", key: "ready" }]
  },
  effects: [
    { type: "setFlag", key: "visited-start", value: true }
  ]
}

// Apply transition
const result = applyTransition(
  state,
  transition,
  builtinEvaluators,
  builtinHandlers
)

console.log(result.success)        // true/false
console.log(result.state)          // new state
console.log(result.shouldNavigate) // true
console.log(result.nextNodeId)     // "next-node"
```

## Entity-Aware State

Runtime state can optionally track generic entity state without hardcoding RPG concepts.

```typescript
import {
  createInitialState,
  grantEntity,
  activateEntity,
  unlockEntity,
  addResource,
  ownsEntity,
  entityIsActive,
  entityIsUnlocked,
  getResource,
} from "@fiction-map/runtime"

let state = createInitialState("start")

state = grantEntity(state, "lantern")
state = activateEntity(state, "elf")
state = unlockEntity(state, "dark-cave")
state = addResource(state, "gold", 12)

console.log(ownsEntity(state, "lantern"))          // true
console.log(entityIsActive(state, "elf"))          // true
console.log(entityIsUnlocked(state, "dark-cave"))  // true
console.log(getResource(state, "gold"))            // 12
```

This state layer only records what a player/session owns, has active, has unlocked, and has
available as numeric resources.

For world-aware reads, combine it with a world definition from `@fiction-map/entities`:

```typescript
import { EntityRegistry, defineEntityType, defineWorld } from "@fiction-map/entities"
import {
  createInitialState,
  deriveEntityState,
  grantEntity,
} from "@fiction-map/runtime"

const registry = new EntityRegistry()

defineEntityType(registry, { id: "item" })
defineEntityType(registry, { id: "location" })

const world = defineWorld(registry, {
  id: "example-world",
  entities: [
    { id: "lantern", type: "item", unlocks: ["dark-cave"] },
    {
      id: "dark-cave",
      type: "location",
      prerequisites: [{ kind: "entity", target: "lantern", operator: "has" }],
    },
  ],
})

const state = grantEntity(createInitialState("start"), "lantern")
const derived = deriveEntityState(world, state)

console.log(derived.effectiveEntityIds.has("dark-cave")) // true
console.log(derived.prerequisites[0]?.satisfied)         // true
```

Derivation reports effective ids, active modifiers, prerequisite status, unlocks, and runtime
references that do not exist in the supplied world. It does not apply RPG-specific formulas,
inventory rules, equipment rules, combat, or story graph transition logic.

### Seamless derived-state evaluation

Pass `{ derivedState }` to `checkTransitionAvailability` / `applyTransition` so cascading
unlocks computed in derived state are respected automatically — the consumer app does not need
to mirror them back into runtime state by hand:

```typescript
import {
  checkTransitionAvailability,
  applyTransition,
  builtinEvaluators,
  builtinHandlers,
} from "@fiction-map/runtime"

const availability = checkTransitionAvailability(
  state,
  transition,
  builtinEvaluators,
  { derivedState: derived }
)

const result = applyTransition(
  state,
  transition,
  builtinEvaluators,
  builtinHandlers,
  { derivedState: derived }
)
```

If you omit `{ derivedState }`, entity-aware evaluators fall back to explicit runtime state only.

Entity-aware transition failures are machine-readable. A blocked or hidden transition can include
`failedConditions` entries that identify the failed condition, whether it came from `visibility`
or `requirements`, and which condition group failed.

Use `validateEntityTransitionReferences(transitions, world)` to validate that entity-aware
transition conditions and effects reference entities that exist in the supplied world definition.
Resource references remain generic and are not checked against a built-in resource registry.

## Built-in Conditions

| Type | Parameters | Description |
|------|------------|-------------|
| `equals` | `key`, `value` | `state.variables[key] === value` |
| `notEquals` | `key`, `value` | `state.variables[key] !== value` |
| `greaterThan` | `key`, `value` | `state.variables[key] > value` |
| `lessThan` | `key`, `value` | `state.variables[key] < value` |
| `hasFlag` | `key` | `key in state.flags` |
| `flagEquals` | `key`, `value` | `state.flags[key] === value` |
| `visited` | `nodeId` | `state.visited.has(nodeId)` |
| `notVisited` | `nodeId` | `!state.visited.has(nodeId)` |
| `currentNode` | `nodeId` | `state.currentNodeId === nodeId` |
| `hasVariable` | `key` | `key in state.variables` |
| `hasEntity` | `entityId` | Entity is owned in runtime entity state |
| `entityActive` | `entityId` | Entity is active in runtime entity state |
| `entityUnlocked` | `entityId` | Entity is unlocked in runtime entity state |
| `resourceAtLeast` | `key`, `value` | Runtime resource is at least `value` |

## Built-in Effects

| Type | Parameters | Description |
|------|------------|-------------|
| `setVariable` | `key`, `value` | Set `state.variables[key]` |
| `deleteVariable` | `key` | Delete `state.variables[key]` |
| `increment` | `key`, `delta` | Increment number by delta |
| `decrement` | `key`, `delta` | Decrement number by delta |
| `clamp` | `key`, `min`, `max` | Clamp number to range |
| `setFlag` | `key`, `value` | Set `state.flags[key]` |
| `clearFlag` | `key` | Delete `state.flags[key]` |
| `markVisited` | `nodeId` | Add to visited set |
| `navigate` | `nodeId` | Navigate to node |
| `setExtension` | `key`, `value` | Set extension data |
| `mergeExtension` | `key`, `value` | Merge extension data |
| `grantEntity` | `entityId` | Add an entity to owned runtime state |
| `revokeEntity` | `entityId` | Remove an entity from owned runtime state |
| `activateEntity` | `entityId` | Add an entity to active runtime state |
| `deactivateEntity` | `entityId` | Remove an entity from active runtime state |
| `unlockEntity` | `entityId` | Add an entity to unlocked runtime state |
| `lockEntity` | `entityId` | Remove an entity from unlocked runtime state |
| `addResource` | `key`, `amount` | Add to a numeric runtime resource |
| `spendResource` | `key`, `amount` | Spend a numeric runtime resource if enough is available |

## Custom Conditions

```typescript
import { ProjectRegistry, defineCondition } from "@fiction-map/core"
import type { ConditionEvaluator } from "@fiction-map/runtime"

const registry = new ProjectRegistry()

// Define condition type
const HasItemCondition = defineCondition(registry, {
  id: "has-item",
  parameters: {
    itemId: { type: "string", required: true }
  }
})

// Implement evaluator
const hasItemEvaluator: ConditionEvaluator = (state, condition) => {
  const { itemId } = condition as { itemId: string }
  const inventory = state.extensions?.inventory as Set<string> | undefined
  return inventory?.has(itemId) ?? false
}
```

## Custom Effects

```typescript
import { defineEffect } from "@fiction-map/core"
import type { EffectHandler } from "@fiction-map/runtime"
import { cloneState } from "@fiction-map/runtime"

// Reuse the same registry instance from your project
// Define effect type
const GiveItemEffect = defineEffect(registry, {
  id: "give-item",
  parameters: {
    itemId: { type: "string", required: true }
  }
})

// Implement handler
const giveItemHandler: EffectHandler = (state, effect) => {
  const { itemId } = effect as { itemId: string }
  const cloned = cloneState(state)
  const inventory = (cloned.extensions?.inventory as Set<string>) ?? new Set()
  inventory.add(itemId)
  cloned.extensions = { ...cloned.extensions, inventory }
  return cloned
}
```

## License

MIT
