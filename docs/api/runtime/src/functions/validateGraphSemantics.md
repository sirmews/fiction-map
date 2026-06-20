[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / validateGraphSemantics

# Function: validateGraphSemantics()

> **validateGraphSemantics**(`runtime`, `world`, `options?`): [`SemanticValidationResult`](../interfaces/SemanticValidationResult.md)

Defined in: [packages/runtime/src/validation/index.ts:19](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/validation/index.ts#L19)

Statically validates the semantic and behavioral correctness of a story graph.

Simulates all possible traversals under the game rules, triggers, and resource
constraints to detect dead ends, unwinnable paths, and infinite resource-draining loops.

## Parameters

### runtime

[`GraphRuntime`](../classes/GraphRuntime.md)

The compiled GraphRuntime instance

### world

`any`

The WorldDefinition containing entity schemas and instances

### options?

[`SemanticValidationOptions`](../interfaces/SemanticValidationOptions.md)

Optional validation settings (limits, terminal thresholds)

## Returns

[`SemanticValidationResult`](../interfaces/SemanticValidationResult.md)
