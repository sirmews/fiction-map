[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineCondition

# Function: defineCondition()

> **defineCondition**(`registry`, `config`): [`ConditionDefinition`](../interfaces/ConditionDefinition.md)

Defined in: [core/src/condition.ts:41](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/core/src/condition.ts#L41)

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
