[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / checkTransitionAvailability

# Function: checkTransitionAvailability()

> **checkTransitionAvailability**(`state`, `transition`, `evaluators`, `context?`): [`TransitionAvailability`](../interfaces/TransitionAvailability.md)

Defined in: [story-runtime/src/core/transition.ts:39](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/core/transition.ts#L39)

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
