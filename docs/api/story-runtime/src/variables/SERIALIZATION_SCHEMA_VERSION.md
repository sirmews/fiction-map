[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / SERIALIZATION\_SCHEMA\_VERSION

# Variable: SERIALIZATION\_SCHEMA\_VERSION

> `const` **SERIALIZATION\_SCHEMA\_VERSION**: `1`

Defined in: [story-runtime/src/types.ts:201](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/story-runtime/src/types.ts#L201)

Current serialization schema version.

Increment when `SerializableState` or `SerializableEntityState` change
in a backward-incompatible way (rename, type narrowing, removal,
semantic change). Do not increment when a new optional field is added.

See `docs/decisions/2026-05-20-persistence-contract.md`.
