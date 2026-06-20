[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / evaluateConditionSet

# Function: evaluateConditionSet()

> **evaluateConditionSet**(`state`, `conditionSet`, `evaluators`, `context?`): `boolean`

Defined in: [packages/runtime/src/conditions/index.ts:50](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/conditions/index.ts#L50)

Evaluate a condition set with all/any/none composition.

- all: All conditions must be true (AND)
- any: At least one condition must be true (OR)
- none: No conditions must be true (NOR)

Multiple groups can be specified. If multiple groups are present,
they are combined with AND (all groups must pass).

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Current runtime state

### conditionSet

[`ConditionSet`](../interfaces/ConditionSet.md)

Condition set to evaluate

### evaluators

`Map`\<`string`, [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)\>

Map of condition type → evaluator function

### context?

[`EvaluationContext`](../interfaces/EvaluationContext.md)

Optional evaluation context

## Returns

`boolean`

boolean result of evaluation
