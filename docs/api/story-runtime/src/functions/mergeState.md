[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / mergeState

# Function: mergeState()

> **mergeState**(`state`, `updates`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [story-runtime/src/core/state.ts:57](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/story-runtime/src/core/state.ts#L57)

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
