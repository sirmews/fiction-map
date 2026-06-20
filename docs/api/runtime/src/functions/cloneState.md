[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / cloneState

# Function: cloneState()

> **cloneState**(`state`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [packages/runtime/src/core/state.ts:40](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/state.ts#L40)

Clone state (deep copy).

Use before any mutation. Guarantees immutability.
Sets are cloned, objects are shallow-copied.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)
