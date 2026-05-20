# @fiction-map/entities

Define generic world/entity models in code without hardcoding RPG ontology into the framework.

## Installation

```bash
npm install @fiction-map/entities
```

## What it is for

This package is an optional companion to `@fiction-map/core`.

It lets a consumer app define world concepts such as:

- `species`
- `stat`
- `trait`
- `item`
- `spell`
- `location`

without Fiction Map itself shipping those concepts as built-ins.

The package provides:

- entity type definitions
- entity instances
- typed references between entities
- declarative modifiers
- declarative prerequisites and unlocks
- minimal validation for properties, references, and entity rules
- an `EntityRegistry` that extends `ProjectRegistry` so a single registry holds both graph and world schemas

This package itself does not provide:

- built-in RPG ontology
- runtime evaluation of modifiers
- runtime transition conditions or effects
- inventory semantics
- editor UI

Runtime state, derived state, entity-aware transition primitives, and story/world reference
validation live in `@fiction-map/runtime`.

## Quick Start

```typescript
import { EntityRegistry, defineEntityType, defineWorld } from "@fiction-map/entities"

const registry = new EntityRegistry()

defineEntityType(registry, {
  id: "stat",
  properties: {
    label: { type: "string", required: true },
  },
})

defineEntityType(registry, {
  id: "species",
  properties: {
    label: { type: "string", required: true },
  },
  references: {
    baseStats: { to: ["stat"], multiple: true, required: true },
  },
})

const world = defineWorld(registry, {
  id: "forest-world",
  entities: [
    { id: "strength", type: "stat", label: "Strength" },
    {
      id: "elf",
      type: "species",
      label: "Elf",
      references: {
        baseStats: ["strength"],
      },
      modifiers: [
        { target: "stats.dexterity", operation: "add", value: 2 },
      ],
      prerequisites: [
        { kind: "entity", target: "strength", operator: "has" },
      ],
    },
  ],
})

console.log(world.errors)
```

## API

### `new EntityRegistry()`

Holds entity types and worlds for a single project/workspace. Extends `ProjectRegistry` from `@fiction-map/core`, so it can also store node types, edge types, conditions, effects, and graphs.

```typescript
const registry = new EntityRegistry()
registry.clear() // resets entity types, worlds, and the inherited project state
```

### `defineEntityType(registry, config)`

Define a reusable entity type.

```typescript
defineEntityType(registry, {
  id: string
  properties?: { ... }
  references?: {
    [name: string]: {
      to: string[]
      required?: boolean
      multiple?: boolean
    }
  }
})
```

### `defineWorld(registry, config)`

Define a world containing entity instances. Validation runs against the entity types already registered on the same registry.

```typescript
defineWorld(registry, {
  id: string
  entities: EntityInstance[]
})
```

Metadata is held on the registry instance. Iterate `registry.entityTypes` / `registry.worlds` directly, or drive generation through the `fiction-map` CLI. There is no longer a top-level `generateEntityMetadata` export.

## Validation

The current first slice validates:

- entity types exist
- duplicate entity ids
- required properties
- basic property type checks
- required references
- unknown reference targets
- invalid target types for references
- basic modifier shape
- unknown entity prerequisite targets
- unknown unlock targets

## License

MIT
