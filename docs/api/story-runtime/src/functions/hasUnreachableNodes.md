[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / hasUnreachableNodes

# Function: hasUnreachableNodes()

> **hasUnreachableNodes**(`nodes`, `transitions`, `startNodeId`): `boolean`

Defined in: [story-runtime/src/core/validation.ts:198](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/story-runtime/src/core/validation.ts#L198)

Check if a graph has unreachable nodes.

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

`boolean`

true if any node is not reachable from start
