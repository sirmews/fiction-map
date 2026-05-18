[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / getAvailableTransitions

# Function: getAvailableTransitions()

> **getAvailableTransitions**(`state`, `transitions`, `evaluators`, `context?`): [`Transition`](../interfaces/Transition.md)[]

Defined in: [story-runtime/src/core/transition.ts:332](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/core/transition.ts#L332)

Get all available transitions from the current node.

A transition is "available" if it is both visible AND allowed.
Use `getTransitionsByAvailability` to get grouped by status.

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

[`Transition`](../interfaces/Transition.md)[]

Array of transitions that are available from the current node
