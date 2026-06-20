[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / navigateToNode

# Function: navigateToNode()

> **navigateToNode**(`state`, `nodeId`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [packages/runtime/src/core/state.ts:101](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/state.ts#L101)

Navigate to a new node.

Updates currentNodeId, adds to history, and marks as visited.
Returns cloned state.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

### nodeId

`string`

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)
