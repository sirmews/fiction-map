[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / navigateToNode

# Function: navigateToNode()

> **navigateToNode**(`state`, `nodeId`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [runtime/src/core/state.ts:100](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/core/state.ts#L100)

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
