[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / navigateToNode

# Function: navigateToNode()

> **navigateToNode**(`state`, `nodeId`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [story-runtime/src/core/state.ts:99](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/core/state.ts#L99)

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
