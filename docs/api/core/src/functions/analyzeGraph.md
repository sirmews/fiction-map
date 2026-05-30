[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / analyzeGraph

# Function: analyzeGraph()

> **analyzeGraph**(`registry`, `nodes`, `edges`): `object`

Defined in: [core/src/graph.ts:232](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/core/src/graph.ts#L232)

## Parameters

### registry

[`ProjectRegistry`](../classes/ProjectRegistry.md)

### nodes

[`NodeInstance`](../interfaces/NodeInstance.md)[]

### edges

[`EdgeInstance`](../interfaces/EdgeInstance.md)[]

## Returns

`object`

### conditionsUsed

> **conditionsUsed**: `string`[]

### edgeTypesUsed

> **edgeTypesUsed**: `string`[]

### effectsUsed

> **effectsUsed**: `string`[]

### endings

> **endings**: `string`[]

### errors

> **errors**: [`ValidationError`](../interfaces/ValidationError.md)[]

### maxDepth

> **maxDepth**: `number`

### nodeTypesUsed

> **nodeTypesUsed**: `string`[]

### warnings

> **warnings**: [`ValidationWarning`](../interfaces/ValidationWarning.md)[]
