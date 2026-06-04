[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / applyEffects

# Function: applyEffects()

> **applyEffects**(`state`, `effects`, `handlers`, `context?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [runtime/src/effects/index.ts:45](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/effects/index.ts#L45)

Apply multiple effects in sequence.

Each effect is applied to the result of the previous one.
If an effect has no handler, it is skipped (with a warning).

## Parameters

### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Current runtime state

### effects

[`Effect`](../interfaces/Effect.md)[]

Effects to apply in order

### handlers

`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>

Map of effect type → handler function

### context?

[`EffectContext`](../interfaces/EffectContext.md)

Optional effect context

## Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

New state with all effects applied
