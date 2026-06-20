[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / evaluateCondition

# Function: evaluateCondition()

> **evaluateCondition**(`state`, `condition`, `evaluators`, `context?`): `boolean`

Defined in: [packages/runtime/src/conditions/index.ts:18](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/conditions/index.ts#L18)

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
