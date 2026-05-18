[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / applyTransition

# Function: applyTransition()

> **applyTransition**(`state`, `transition`, `evaluators`, `handlers`, `context?`): [`TransitionResult`](../interfaces/TransitionResult.md)

Defined in: [story-runtime/src/core/transition.ts:107](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/core/transition.ts#L107)

Execute a transition.

1. Check requirements
2. Apply effects (success or failure)
3. Navigate to target
4. Return traceable result

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Current runtime state

### transition

[`Transition`](../interfaces/Transition.md)

Transition to execute

### evaluators

`Map`\<`string`, [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)\>

Map of condition type → evaluator function

### handlers

`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>

Map of effect type → handler function

### context?

`CombinedContext`

Optional context for evaluation and effects

## Returns

[`TransitionResult`](../interfaces/TransitionResult.md)

TransitionResult with new state, consequence, and trace
