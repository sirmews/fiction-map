[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineCondition

# Function: defineCondition()

> **defineCondition**(`registry`, `config`): [`ConditionDefinition`](../interfaces/ConditionDefinition.md)

Defined in: [packages/core/src/condition.ts:42](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/condition.ts#L42)

Define a condition

## Parameters

### registry

[`ProjectRegistry`](../classes/ProjectRegistry.md)

### config

[`ConditionConfig`](../interfaces/ConditionConfig.md)

## Returns

[`ConditionDefinition`](../interfaces/ConditionDefinition.md)

## Example

```typescript
export const HasItemCondition = defineCondition(registry, {
  id: "has-item",
  parameters: {
    itemId: { type: "string", required: true },
  },
})
```
