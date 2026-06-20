[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / SerializableState

# Interface: SerializableState

Defined in: [packages/runtime/src/types.ts:223](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L223)

## Properties

### currentNodeId

> **currentNodeId**: `string`

Defined in: [packages/runtime/src/types.ts:226](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L226)

***

### entityState?

> `optional` **entityState?**: [`SerializableEntityState`](SerializableEntityState.md)

Defined in: [packages/runtime/src/types.ts:231](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L231)

***

### extensions?

> `optional` **extensions?**: `Record`\<`string`, `unknown`\>

Defined in: [packages/runtime/src/types.ts:232](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L232)

***

### flags

> **flags**: `Record`\<`string`, `boolean` \| `string` \| `number`\>

Defined in: [packages/runtime/src/types.ts:229](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L229)

***

### history

> **history**: `string`[]

Defined in: [packages/runtime/src/types.ts:227](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L227)

***

### schemaVersion

> **schemaVersion**: `1`

Defined in: [packages/runtime/src/types.ts:225](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L225)

Schema version. Always equals `SERIALIZATION_SCHEMA_VERSION` on write.

***

### variables

> **variables**: `Record`\<`string`, `unknown`\>

Defined in: [packages/runtime/src/types.ts:228](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L228)

***

### visited

> **visited**: `string`[]

Defined in: [packages/runtime/src/types.ts:230](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L230)
