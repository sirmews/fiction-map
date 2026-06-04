[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / cloneState

# Function: cloneState()

> **cloneState**(`state`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [runtime/src/core/state.ts:39](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/core/state.ts#L39)

Clone state (deep copy).

Use before any mutation. Guarantees immutability.
Sets are cloned, objects are shallow-copied.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)
