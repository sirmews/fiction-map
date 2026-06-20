[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / checkTransitionAvailability

# Function: checkTransitionAvailability()

> **checkTransitionAvailability**(`state`, `transition`, `evaluators`, `context?`): [`TransitionAvailability`](../interfaces/TransitionAvailability.md)

Defined in: [packages/runtime/src/core/transition.ts:39](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/transition.ts#L39)

Check if a transition is available.

Evaluates both visibility and requirements conditions.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Current runtime state

### transition

[`Transition`](../interfaces/Transition.md)

Transition to check

### evaluators

`Map`\<`string`, [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)\>

Map of condition type → evaluator function

### context?

`CombinedContext`

Optional evaluation context

## Returns

[`TransitionAvailability`](../interfaces/TransitionAvailability.md)

TransitionAvailability with allowed, visible, and reason
