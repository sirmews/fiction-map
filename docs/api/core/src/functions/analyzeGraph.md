[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / analyzeGraph

# Function: analyzeGraph()

> **analyzeGraph**(`registry`, `nodes`, `edges`): `object`

Defined in: [packages/core/src/graph.ts:364](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/graph.ts#L364)

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
