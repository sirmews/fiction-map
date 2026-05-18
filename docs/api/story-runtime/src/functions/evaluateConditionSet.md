[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / evaluateConditionSet

# Function: evaluateConditionSet()

> **evaluateConditionSet**(`state`, `conditionSet`, `evaluators`, `context?`): `boolean`

Defined in: [story-runtime/src/conditions/index.ts:50](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/conditions/index.ts#L50)

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
