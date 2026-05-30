[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineNodeType

# Function: defineNodeType()

> **defineNodeType**(`registry`, `config`): [`NodeTypeDefinition`](../interfaces/NodeTypeDefinition.md)

Defined in: [core/src/node-type.ts:47](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/core/src/node-type.ts#L47)

Define a node type

## Parameters

### registry

[`ProjectRegistry`](../classes/ProjectRegistry.md)

### config

[`NodeTypeConfig`](../interfaces/NodeTypeConfig.md)

## Returns

[`NodeTypeDefinition`](../interfaces/NodeTypeDefinition.md)

## Example

```typescript
export const SceneNode = defineNodeType(registry, {
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
  },
  outgoingEdges: ["choice", "trigger"],
  incomingEdges: ["choice", "trigger"],
})
```
