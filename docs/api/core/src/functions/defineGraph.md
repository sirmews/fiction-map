[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineGraph

# Function: defineGraph()

> **defineGraph**(`registry`, `config`): [`GraphDefinition`](../interfaces/GraphDefinition.md)

Defined in: [core/src/graph.ts:361](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/core/src/graph.ts#L361)

Define a graph

## Parameters

### registry

[`ProjectRegistry`](../classes/ProjectRegistry.md)

### config

[`GraphConfig`](../interfaces/GraphConfig.md)

## Returns

[`GraphDefinition`](../interfaces/GraphDefinition.md)

## Example

```typescript
export const myStory = defineGraph(registry, {
  id: "my-story",
  nodes: [
    { id: "start", type: "scene", title: "Beginning" },
    { id: "end", type: "scene", title: "Ending" },
  ],
  edges: [
    { id: "c1", type: "choice", source: "start", target: "end", text: "Continue" },
  ],
})
```
