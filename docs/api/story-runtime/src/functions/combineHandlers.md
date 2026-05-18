[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / combineHandlers

# Function: combineHandlers()

> **combineHandlers**(...`handlerMaps`): `Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>

Defined in: [story-runtime/src/effects/index.ts:66](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/effects/index.ts#L66)

Create a combined handler from multiple handlers.

Later handlers override earlier ones for the same effect type.

## Parameters

### handlerMaps

...`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>[]

## Returns

`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>
