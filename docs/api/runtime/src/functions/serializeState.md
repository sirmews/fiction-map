[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / serializeState

# Function: serializeState()

> **serializeState**(`state`): [`SerializableState`](../interfaces/SerializableState.md)

Defined in: [packages/runtime/src/core/state.ts:383](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/state.ts#L383)

Convert state to a JSON-serializable format.

Sets are converted to arrays. Emits the current `schemaVersion` so
consumers can migrate old saves. See `docs/decisions/2026-05-20-persistence-contract.md`.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

## Returns

[`SerializableState`](../interfaces/SerializableState.md)
