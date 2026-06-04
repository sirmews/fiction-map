[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / SerializableState

# Interface: SerializableState

Defined in: [runtime/src/types.ts:203](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L203)

## Properties

### currentNodeId

> **currentNodeId**: `string`

Defined in: [runtime/src/types.ts:206](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L206)

***

### entityState?

> `optional` **entityState?**: [`SerializableEntityState`](SerializableEntityState.md)

Defined in: [runtime/src/types.ts:211](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L211)

***

### extensions?

> `optional` **extensions?**: `Record`\<`string`, `unknown`\>

Defined in: [runtime/src/types.ts:212](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L212)

***

### flags

> **flags**: `Record`\<`string`, `boolean` \| `string` \| `number`\>

Defined in: [runtime/src/types.ts:209](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L209)

***

### history

> **history**: `string`[]

Defined in: [runtime/src/types.ts:207](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L207)

***

### schemaVersion

> **schemaVersion**: `1`

Defined in: [runtime/src/types.ts:205](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L205)

Schema version. Always equals `SERIALIZATION_SCHEMA_VERSION` on write.

***

### variables

> **variables**: `Record`\<`string`, `unknown`\>

Defined in: [runtime/src/types.ts:208](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L208)

***

### visited

> **visited**: `string`[]

Defined in: [runtime/src/types.ts:210](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/types.ts#L210)
