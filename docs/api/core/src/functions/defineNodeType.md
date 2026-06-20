[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineNodeType

# Function: defineNodeType()

> **defineNodeType**(`registry`, `config`): [`NodeTypeDefinition`](../interfaces/NodeTypeDefinition.md)

Defined in: [packages/core/src/node-type.ts:48](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/node-type.ts#L48)

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
