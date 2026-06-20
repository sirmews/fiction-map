[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / createInitialState

# Function: createInitialState()

> **createInitialState**(`startNodeId`, `initialVariables?`, `initialExtensions?`, `initialEntityState?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [packages/runtime/src/core/state.ts:17](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/state.ts#L17)

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
