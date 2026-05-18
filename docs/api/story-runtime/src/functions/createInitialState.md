[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / createInitialState

# Function: createInitialState()

> **createInitialState**(`startNodeId`, `initialVariables?`, `initialExtensions?`, `initialEntityState?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [story-runtime/src/core/state.ts:15](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/core/state.ts#L15)

Create initial state at a starting node.

## Parameters

### startNodeId

`string`

The node ID to start at

### initialVariables?

`Record`\<`string`, `unknown`\>

Optional initial variable values

### initialExtensions?

`Record`\<`string`, `unknown`\>

Optional initial extension data

### initialEntityState?

[`EntityRuntimeState`](../interfaces/EntityRuntimeState.md)

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)
