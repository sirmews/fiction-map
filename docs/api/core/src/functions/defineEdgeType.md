[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineEdgeType

# Function: defineEdgeType()

> **defineEdgeType**(`registry`, `config`): [`EdgeTypeDefinition`](../interfaces/EdgeTypeDefinition.md)

Defined in: [core/src/edge-type.ts:45](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/core/src/edge-type.ts#L45)

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
