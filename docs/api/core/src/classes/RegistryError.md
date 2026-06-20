[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [core/src](../README.md) / RegistryError

# Class: RegistryError

Defined in: [packages/core/src/errors.ts:20](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/errors.ts#L20)

Thrown when there is an issue with the ProjectRegistry, such as duplicate IDs.

## Extends

- [`FictionMapError`](FictionMapError.md)

## Constructors

### Constructor

> **new RegistryError**(`message`, `code?`): `RegistryError`

Defined in: [packages/core/src/errors.ts:21](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/errors.ts#L21)

#### Parameters

##### message

`string`

##### code?

`string` = `"ERR_REGISTRY"`

#### Returns

`RegistryError`

#### Overrides

[`FictionMapError`](FictionMapError.md).[`constructor`](FictionMapError.md#constructor)

## Properties

### cause?

> `optional` **cause?**: `unknown`

Defined in: node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:26

#### Inherited from

[`FictionMapError`](FictionMapError.md).[`cause`](FictionMapError.md#cause)

***

### code

> `readonly` **code**: `string`

Defined in: [packages/core/src/errors.ts:8](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/core/src/errors.ts#L8)

#### Inherited from

[`FictionMapError`](FictionMapError.md).[`code`](FictionMapError.md#code)

***

### message

> **message**: `string`

Defined in: node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1077

#### Inherited from

[`FictionMapError`](FictionMapError.md).[`message`](FictionMapError.md#message)

***

### name

> **name**: `string`

Defined in: node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1076

#### Inherited from

[`FictionMapError`](FictionMapError.md).[`name`](FictionMapError.md#name)

***

### stack?

> `optional` **stack?**: `string`

Defined in: node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1078

#### Inherited from

[`FictionMapError`](FictionMapError.md).[`stack`](FictionMapError.md#stack)
