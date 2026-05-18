[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineGraph

# Function: defineGraph()

> **defineGraph**(`registry`, `config`): [`GraphDefinition`](../interfaces/GraphDefinition.md)

Defined in: [core/src/graph.ts:313](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/core/src/graph.ts#L313)

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
