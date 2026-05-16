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

It does not provide:

- built-in RPG ontology
- runtime evaluation of modifiers
- runtime evaluation of prerequisites and unlocks
- inventory semantics
- editor UI

## Quick Start

```typescript
import { defineEntityType, defineWorld } from "@fiction-map/entities"

defineEntityType({
  id: "stat",
  properties: {
    label: { type: "string", required: true },
  },
})

defineEntityType({
  id: "species",
  properties: {
    label: { type: "string", required: true },
  },
  references: {
    baseStats: { to: ["stat"], multiple: true, required: true },
  },
})

const world = defineWorld({
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

### `defineEntityType(config)`

Define a reusable entity type.

```typescript
defineEntityType({
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

### `defineWorld(config)`

Define a world containing entity instances.

```typescript
defineWorld({
  id: string
  entities: EntityInstance[]
})
```

### `generateEntityMetadata()`

Generate metadata for all registered entity types and worlds.

```typescript
const metadata = generateEntityMetadata()
// { entityTypes, worlds, validation }
```

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
