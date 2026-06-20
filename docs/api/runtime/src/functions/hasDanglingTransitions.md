[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / hasDanglingTransitions

# Function: hasDanglingTransitions()

> **hasDanglingTransitions**(`transitions`, `nodeIds`): `boolean`

Defined in: [packages/runtime/src/core/validation.ts:165](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/core/validation.ts#L165)

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
