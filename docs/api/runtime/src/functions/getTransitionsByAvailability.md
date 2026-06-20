[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / getTransitionsByAvailability

# Function: getTransitionsByAvailability()

> **getTransitionsByAvailability**(`state`, `transitions`, `evaluators`, `context?`): `object`

Defined in: [packages/runtime/src/core/transition.ts:335](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/transition.ts#L335)

Get transitions grouped by availability status.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Current runtime state

### transitions

[`Transition`](../interfaces/Transition.md)[]

All transitions in the graph

### evaluators

`Map`\<`string`, [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)\>

Map of condition type → evaluator function

### context?

`CombinedContext`

Optional evaluation context

## Returns

`object`

Object with available, blocked, and hidden transitions

### available

> **available**: [`Transition`](../interfaces/Transition.md)[]

### blocked

> **blocked**: [`Transition`](../interfaces/Transition.md)[]

### hidden

> **hidden**: [`Transition`](../interfaces/Transition.md)[]
