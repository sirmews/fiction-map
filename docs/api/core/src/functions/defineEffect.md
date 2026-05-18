[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineEffect

# Function: defineEffect()

> **defineEffect**(`registry`, `config`): [`EffectDefinition`](../interfaces/EffectDefinition.md)

Defined in: [core/src/effect.ts:42](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/core/src/effect.ts#L42)

Define an effect

## Parameters

### registry

[`ProjectRegistry`](../classes/ProjectRegistry.md)

### config

[`EffectConfig`](../interfaces/EffectConfig.md)

## Returns

[`EffectDefinition`](../interfaces/EffectDefinition.md)

## Example

```typescript
export const GiveItemEffect = defineEffect(registry, {
  id: "give-item",
  parameters: {
    itemId: { type: "string", required: true },
    quantity: { type: "number", default: 1 },
  },
})
```
