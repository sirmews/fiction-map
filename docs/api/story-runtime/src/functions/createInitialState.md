[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / createInitialState

# Function: createInitialState()

> **createInitialState**(`startNodeId`, `initialVariables?`, `initialExtensions?`, `initialEntityState?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [runtime/src/core/state.ts:16](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/core/state.ts#L16)

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
