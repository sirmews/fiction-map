[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / deserializeState

# Function: deserializeState()

> **deserializeState**(`data`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [story-runtime/src/core/state.ts:414](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/story-runtime/src/core/state.ts#L414)

Restore state from a serialized format.

Arrays are converted back to Sets. Unknown `schemaVersion` values are
rejected with a descriptive error; the consumer must migrate the data
to the current version before calling this function.

## Parameters

### data

[`SerializableState`](../interfaces/SerializableState.md)

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)
