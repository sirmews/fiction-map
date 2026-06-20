[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / mergeState

# Function: mergeState()

> **mergeState**(`state`, `updates`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [packages/runtime/src/core/state.ts:58](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/state.ts#L58)

Merge partial state updates into a cloned state.

Returns new state with updates applied.
Arrays and Sets are replaced, not merged.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

### updates

`Partial`\<[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)\>

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)
