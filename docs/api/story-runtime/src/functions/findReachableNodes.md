[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / findReachableNodes

# Function: findReachableNodes()

> **findReachableNodes**(`nodes`, `transitions`, `startNodeId`): `Set`\<`string`\>

Defined in: [runtime/src/core/validation.ts:156](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/core/validation.ts#L156)

Find all reachable nodes from a starting node.

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

`Set`\<`string`\>

Set of reachable node IDs
