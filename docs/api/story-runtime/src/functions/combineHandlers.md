[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / combineHandlers

# Function: combineHandlers()

> **combineHandlers**(...`handlerMaps`): `Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>

Defined in: [runtime/src/effects/index.ts:66](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/effects/index.ts#L66)

Create a combined handler from multiple handlers.

Later handlers override earlier ones for the same effect type.

## Parameters

### handlerMaps

...`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>[]

## Returns

`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>
