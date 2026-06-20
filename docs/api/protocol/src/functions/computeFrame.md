[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [protocol/src](../README.md) / computeFrame

# Function: computeFrame()

> **computeFrame**(`runtime`, `state`, `context`, `world?`): [`Frame`](../interfaces/Frame.md)

Defined in: [packages/protocol/src/presenter.ts:13](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/protocol/src/presenter.ts#L13)

Presenter function that projects the raw engine state into a presentation Frame.

## Parameters

### runtime

`GraphRuntime`

The active GraphRuntime instance

### state

`GraphRuntimeState`

The current GraphRuntimeState

### context

The evaluation context containing derived entity state

#### derivedState

`any`

### world?

Optional world definition to resolve entity labels

#### entities

`object`[]

## Returns

[`Frame`](../interfaces/Frame.md)
