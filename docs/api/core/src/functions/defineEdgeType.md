[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineEdgeType

# Function: defineEdgeType()

> **defineEdgeType**(`registry`, `config`): [`EdgeTypeDefinition`](../interfaces/EdgeTypeDefinition.md)

Defined in: [packages/core/src/edge-type.ts:46](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/edge-type.ts#L46)

Define an edge type

## Parameters

### registry

[`ProjectRegistry`](../classes/ProjectRegistry.md)

### config

[`EdgeTypeConfig`](../interfaces/EdgeTypeConfig.md)

## Returns

[`EdgeTypeDefinition`](../interfaces/EdgeTypeDefinition.md)

## Example

```typescript
export const ChoiceEdge = defineEdgeType(registry, {
  id: "choice",
  properties: {
    text: { type: "string", required: true },
    conditions: { type: "array", items: { type: "reference", referenceTo: "condition" } },
    effects: { type: "array", items: { type: "reference", referenceTo: "effect" } },
  },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})
```
