[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / createComposedEvaluator

# Function: createComposedEvaluator()

> **createComposedEvaluator**(`conditionSet`, `evaluators`): [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)

Defined in: [story-runtime/src/conditions/index.ts:106](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/conditions/index.ts#L106)

Create a composed evaluator from a condition set.

Useful when you need to pass a single evaluator function
that evaluates multiple conditions.

## Parameters

### conditionSet

[`ConditionSet`](../interfaces/ConditionSet.md)

### evaluators

`Map`\<`string`, [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)\>

## Returns

[`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)
