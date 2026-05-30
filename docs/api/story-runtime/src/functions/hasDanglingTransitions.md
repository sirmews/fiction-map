[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / hasDanglingTransitions

# Function: hasDanglingTransitions()

> **hasDanglingTransitions**(`transitions`, `nodeIds`): `boolean`

Defined in: [story-runtime/src/core/validation.ts:172](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/story-runtime/src/core/validation.ts#L172)

Check if a graph has dangling transitions.

## Parameters

### transitions

[`Transition`](../interfaces/Transition.md)[]

All transitions in the graph

### nodeIds

`Set`\<`string`\>

Set of valid node IDs

## Returns

`boolean`

true if any transition points to a non-existent node
