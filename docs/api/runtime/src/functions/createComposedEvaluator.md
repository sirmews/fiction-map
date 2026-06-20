[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / createComposedEvaluator

# Function: createComposedEvaluator()

> **createComposedEvaluator**(`conditionSet`, `evaluators`): [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)

Defined in: [packages/runtime/src/conditions/index.ts:106](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/conditions/index.ts#L106)

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
