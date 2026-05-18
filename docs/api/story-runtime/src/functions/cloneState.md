[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / cloneState

# Function: cloneState()

> **cloneState**(`state`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [story-runtime/src/core/state.ts:38](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/core/state.ts#L38)

Clone state (deep copy).

Use before any mutation. Guarantees immutability.
Sets are cloned, objects are shallow-copied.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)
