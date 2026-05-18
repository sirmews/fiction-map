[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / applyEffect

# Function: applyEffect()

> **applyEffect**(`state`, `effect`, `handlers`, `context?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [story-runtime/src/effects/index.ts:17](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/effects/index.ts#L17)

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
