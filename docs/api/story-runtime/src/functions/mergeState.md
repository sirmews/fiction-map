[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / mergeState

# Function: mergeState()

> **mergeState**(`state`, `updates`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [story-runtime/src/core/state.ts:56](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/core/state.ts#L56)

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
