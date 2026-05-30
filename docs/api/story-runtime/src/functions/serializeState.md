[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / serializeState

# Function: serializeState()

> **serializeState**(`state`): [`SerializableState`](../interfaces/SerializableState.md)

Defined in: [story-runtime/src/core/state.ts:394](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/story-runtime/src/core/state.ts#L394)

Convert state to a JSON-serializable format.

Sets are converted to arrays. Emits the current `schemaVersion` so
consumers can migrate old saves. See `docs/decisions/2026-05-20-persistence-contract.md`.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

## Returns

[`SerializableState`](../interfaces/SerializableState.md)
