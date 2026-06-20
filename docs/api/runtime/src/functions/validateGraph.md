[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / validateGraph

# Function: validateGraph()

> **validateGraph**(`nodes`, `transitions`, `startNodeId`): [`ValidationResult`](../interfaces/ValidationResult.md)

Defined in: [packages/runtime/src/core/validation.ts:18](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/validation.ts#L18)

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
