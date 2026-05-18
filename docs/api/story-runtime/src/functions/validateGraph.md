[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / validateGraph

# Function: validateGraph()

> **validateGraph**(`nodes`, `transitions`, `startNodeId`): [`ValidationResult`](../interfaces/ValidationResult.md)

Defined in: [story-runtime/src/core/validation.ts:24](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/core/validation.ts#L24)

Validate graph integrity.

Checks:
- Empty graph
- Missing start node
- Dangling transitions (references non-existent nodes)
- Unreachable nodes (not reachable from start)
- Orphan nodes (no connections)

## Parameters

### nodes

`Map`\<`string`, [`NodeDefinition`](../interfaces/NodeDefinition.md)\>

Map of node ID → node definition

### transitions

[`Transition`](../interfaces/Transition.md)[]

All transitions in the graph

### startNodeId

`string`

The starting node ID

## Returns

[`ValidationResult`](../interfaces/ValidationResult.md)

ValidationResult with valid flag, errors, and reachable nodes
