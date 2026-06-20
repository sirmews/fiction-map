[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / hasUnreachableNodes

# Function: hasUnreachableNodes()

> **hasUnreachableNodes**(`nodes`, `transitions`, `startNodeId`): `boolean`

Defined in: [packages/runtime/src/core/validation.ts:188](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/validation.ts#L188)

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
