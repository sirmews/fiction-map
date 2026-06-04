[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / createComposedEvaluator

# Function: createComposedEvaluator()

> **createComposedEvaluator**(`conditionSet`, `evaluators`): [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)

Defined in: [runtime/src/conditions/index.ts:106](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/conditions/index.ts#L106)

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
