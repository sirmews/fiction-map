[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / evaluateCondition

# Function: evaluateCondition()

> **evaluateCondition**(`state`, `condition`, `evaluators`, `context?`): `boolean`

Defined in: [story-runtime/src/conditions/index.ts:18](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/story-runtime/src/conditions/index.ts#L18)

Evaluate a single condition using the provided evaluators.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Current runtime state

### condition

[`Condition`](../interfaces/Condition.md)

Condition to evaluate

### evaluators

`Map`\<`string`, [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)\>

Map of condition type → evaluator function

### context?

[`EvaluationContext`](../interfaces/EvaluationContext.md)

Optional evaluation context

## Returns

`boolean`

boolean result of evaluation
