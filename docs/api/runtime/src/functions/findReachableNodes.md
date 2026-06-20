[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / findReachableNodes

# Function: findReachableNodes()

> **findReachableNodes**(`nodes`, `transitions`, `startNodeId`): `Set`\<`string`\>

Defined in: [packages/runtime/src/core/validation.ts:149](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/validation.ts#L149)

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
