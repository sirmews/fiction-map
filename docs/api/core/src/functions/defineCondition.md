[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / defineCondition

# Function: defineCondition()

> **defineCondition**(`registry`, `config`): [`ConditionDefinition`](../interfaces/ConditionDefinition.md)

Defined in: [core/src/condition.ts:41](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/core/src/condition.ts#L41)

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
