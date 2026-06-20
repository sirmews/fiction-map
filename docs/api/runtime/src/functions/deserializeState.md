[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / deserializeState

# Function: deserializeState()

> **deserializeState**(`data`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [packages/runtime/src/core/state.ts:403](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/state.ts#L403)

Restore state from a serialized format.

Arrays are converted back to Sets. Unknown `schemaVersion` values are
rejected with a descriptive error; the consumer must migrate the data
to the current version before calling this function.

## Parameters

### data

[`SerializableState`](../interfaces/SerializableState.md)

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)
