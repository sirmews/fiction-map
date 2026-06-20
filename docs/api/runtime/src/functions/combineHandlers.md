[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / combineHandlers

# Function: combineHandlers()

> **combineHandlers**(...`handlerMaps`): `Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>

Defined in: [packages/runtime/src/effects/index.ts:61](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/effects/index.ts#L61)

Create a combined handler from multiple handlers.

Later handlers override earlier ones for the same effect type.

## Parameters

### handlerMaps

...`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>[]

## Returns

`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>
