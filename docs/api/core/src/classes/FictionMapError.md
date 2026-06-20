[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / FictionMapError

# Class: FictionMapError

Defined in: [packages/core/src/errors.ts:5](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/errors.ts#L5)

Base error class for all Fiction Map errors.
Uses a `code` string discriminator for cross-realm safe `catch` checks.

## Extends

- `Error`

## Extended by

- [`RegistryError`](RegistryError.md)
- [`RuntimeError`](RuntimeError.md)

## Constructors

### Constructor

> **new FictionMapError**(`message`, `code`): `FictionMapError`

Defined in: [packages/core/src/errors.ts:6](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/errors.ts#L6)

#### Parameters

##### message

`string`

##### code

`string`

#### Returns

`FictionMapError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause?**: `unknown`

Defined in: node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:26

#### Inherited from

`Error.cause`

***

### code

> `readonly` **code**: `string`

Defined in: [packages/core/src/errors.ts:8](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/errors.ts#L8)

***

### message

> **message**: `string`

Defined in: node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1077

#### Inherited from

`Error.message`

***

### name

> **name**: `string`

Defined in: node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1076

#### Inherited from

`Error.name`

***

### stack?

> `optional` **stack?**: `string`

Defined in: node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1078

#### Inherited from

`Error.stack`
