[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / applyEffect

# Function: applyEffect()

> **applyEffect**(`state`, `effect`, `handlers`, `context?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [packages/runtime/src/effects/index.ts:12](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/effects/index.ts#L12)

Apply a single effect using the provided handlers.

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Current runtime state

### effect

[`Effect`](../interfaces/Effect.md)

Effect to apply

### handlers

`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>

Map of effect type → handler function

### context?

[`EffectContext`](../interfaces/EffectContext.md)

Optional effect context

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

New state (cloned, never mutated)
