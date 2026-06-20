[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [protocol/src](../README.md) / applyIntent

# Function: applyIntent()

> **applyIntent**(`runtime`, `state`, `intent`, `world?`): `ApplyIntentResult`

Defined in: [packages/protocol/src/reducer.ts:21](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/protocol/src/reducer.ts#L21)

Pure, transport-agnostic session reducer that applies a user Intent to the current state.

## Parameters

### runtime

`GraphRuntime`

The active GraphRuntime instance

### state

`GraphRuntimeState`

The current GraphRuntimeState

### intent

[`Intent`](../interfaces/Intent.md)

The user Intent to apply

### world?

Optional world definition to dynamically recompute derived context

#### entities

`object`[]

## Returns

`ApplyIntentResult`
