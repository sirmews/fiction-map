[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineStruct

# Function: defineStruct()

> **defineStruct**(`registry`, `config`): [`StructDefinition`](../interfaces/StructDefinition.md)

Defined in: packages/core/src/struct.ts:47

Define a reusable struct

## Parameters

### registry

[`ProjectRegistry`](../classes/ProjectRegistry.md)

### config

[`StructConfig`](../interfaces/StructConfig.md)

## Returns

[`StructDefinition`](../interfaces/StructDefinition.md)

## Example

```typescript
export const StatBlock = defineStruct(registry, {
  id: "stat-block",
  properties: {
    strength: { type: "number", default: 10 },
    agility: { type: "number", default: 10 },
    intelligence: { type: "number", default: 10 }
  }
})
```
