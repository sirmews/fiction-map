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
  { evaluators: builtinEvaluators, handlers: builtinHandlers }
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
import { defineEntityType, defineWorld } from "@fiction-map/entities"
import {
  createInitialState,
  deriveEntityState,
  grantEntity,
} from "@fiction-map/runtime"

defineEntityType({ id: "item" })
defineEntityType({ id: "location" })

const world = defineWorld({
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

## Custom Conditions

```typescript
import { defineCondition } from "@fiction-map/core"
import type { ConditionEvaluator } from "@fiction-map/runtime"

// Define condition type
const HasItemCondition = defineCondition({
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

// Define effect type
const GiveItemEffect = defineEffect({
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
