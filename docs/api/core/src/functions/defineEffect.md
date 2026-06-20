[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineEffect

# Function: defineEffect()

> **defineEffect**(`registry`, `config`): [`EffectDefinition`](../interfaces/EffectDefinition.md)

Defined in: [packages/core/src/effect.ts:43](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/effect.ts#L43)

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
