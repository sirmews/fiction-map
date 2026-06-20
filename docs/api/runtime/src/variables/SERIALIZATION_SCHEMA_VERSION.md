[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / SERIALIZATION\_SCHEMA\_VERSION

# Variable: SERIALIZATION\_SCHEMA\_VERSION

> `const` **SERIALIZATION\_SCHEMA\_VERSION**: `1`

Defined in: [packages/runtime/src/types.ts:221](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/types.ts#L221)

Current serialization schema version.

Increment when `SerializableState` or `SerializableEntityState` change
in a backward-incompatible way (rename, type narrowing, removal,
semantic change). Do not increment when a new optional field is added.

See `docs/decisions/2026-05-20-persistence-contract.md`.
