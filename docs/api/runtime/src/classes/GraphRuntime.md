[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / GraphRuntime

# Class: GraphRuntime

Defined in: [packages/runtime/src/runtime.ts:46](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L46)

## Constructors

### Constructor

> **new GraphRuntime**(`blueprint`, `evaluators?`, `handlers?`): `GraphRuntime`

Defined in: [packages/runtime/src/runtime.ts:52](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L52)

#### Parameters

##### blueprint

[`GraphBlueprint`](../interfaces/GraphBlueprint.md)

##### evaluators?

`Map`\<`string`, [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)\>

##### handlers?

`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>

#### Returns

`GraphRuntime`

## Properties

### triggers

> **triggers**: `StateTrigger`[] = `[]`

Defined in: [packages/runtime/src/runtime.ts:50](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L50)

## Accessors

### endingNodeIds

#### Get Signature

> **get** **endingNodeIds**(): `Set`\<`string`\>

Defined in: [packages/runtime/src/runtime.ts:78](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L78)

##### Returns

`Set`\<`string`\>

***

### nodes

#### Get Signature

> **get** **nodes**(): `Map`\<`string`, [`NodeDefinition`](../interfaces/NodeDefinition.md)\>

Defined in: [packages/runtime/src/runtime.ts:70](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L70)

##### Returns

`Map`\<`string`, [`NodeDefinition`](../interfaces/NodeDefinition.md)\>

***

### startNodeId

#### Get Signature

> **get** **startNodeId**(): `string`

Defined in: [packages/runtime/src/runtime.ts:74](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L74)

##### Returns

`string`

***

### transitions

#### Get Signature

> **get** **transitions**(): [`Transition`](../interfaces/Transition.md)[]

Defined in: [packages/runtime/src/runtime.ts:66](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L66)

##### Returns

[`Transition`](../interfaces/Transition.md)[]

## Methods

### addTrigger()

> **addTrigger**(`trigger`): `void`

Defined in: [packages/runtime/src/runtime.ts:62](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L62)

#### Parameters

##### trigger

`StateTrigger`

#### Returns

`void`

***

### createState()

> **createState**(`initialVariables?`, `initialExtensions?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [packages/runtime/src/runtime.ts:86](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L86)

#### Parameters

##### initialVariables?

`Record`\<`string`, `unknown`\>

##### initialExtensions?

`Record`\<`string`, `unknown`\>

#### Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

***

### enumeratePaths()

> **enumeratePaths**(`maxDepth?`, `maxPaths?`, `context?`): [`TraversalPath`](../interfaces/TraversalPath.md)[]

Defined in: [packages/runtime/src/runtime.ts:305](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L305)

#### Parameters

##### maxDepth?

`number` = `50`

##### maxPaths?

`number` = `100`

##### context?

[`EvaluationContext`](../interfaces/EvaluationContext.md) & [`EffectContext`](../interfaces/EffectContext.md)

#### Returns

[`TraversalPath`](../interfaces/TraversalPath.md)[]

***

### getAvailable()

> **getAvailable**(`state`, `context?`): [`Transition`](../interfaces/Transition.md)[]

Defined in: [packages/runtime/src/runtime.ts:93](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L93)

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

##### context?

[`EvaluationContext`](../interfaces/EvaluationContext.md)

#### Returns

[`Transition`](../interfaces/Transition.md)[]

***

### getByAvailability()

> **getByAvailability**(`state`, `context?`): `object`

Defined in: [packages/runtime/src/runtime.ts:97](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L97)

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

##### context?

[`EvaluationContext`](../interfaces/EvaluationContext.md)

#### Returns

`object`

##### available

> **available**: [`Transition`](../interfaces/Transition.md)[]

##### blocked

> **blocked**: [`Transition`](../interfaces/Transition.md)[]

##### hidden

> **hidden**: [`Transition`](../interfaces/Transition.md)[]

***

### isEnding()

> **isEnding**(`nodeId`): `boolean`

Defined in: [packages/runtime/src/runtime.ts:82](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L82)

#### Parameters

##### nodeId

`string`

#### Returns

`boolean`

***

### step()

> **step**(`state`, `transition`, `context?`): [`TransitionResult`](../interfaces/TransitionResult.md)

Defined in: [packages/runtime/src/runtime.ts:104](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L104)

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

##### transition

[`Transition`](../interfaces/Transition.md)

##### context?

[`EvaluationContext`](../interfaces/EvaluationContext.md) & [`EffectContext`](../interfaces/EffectContext.md)

#### Returns

[`TransitionResult`](../interfaces/TransitionResult.md)

***

### validate()

> **validate**(): [`ValidationResult`](../interfaces/ValidationResult.md)

Defined in: [packages/runtime/src/runtime.ts:377](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L377)

#### Returns

[`ValidationResult`](../interfaces/ValidationResult.md)

***

### walk()

> **walk**(`state`, `maxSteps?`, `context?`): [`StepResult`](../interfaces/StepResult.md)[]

Defined in: [packages/runtime/src/runtime.ts:271](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L271)

Traverse the graph continuously until no more transitions are available.
Uses a static context object for the entire walk. For derived-state usage,
prefer `walkWithContext`.

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

The starting state

##### maxSteps?

`number` = `100`

Safety limit (default 100)

##### context?

[`EvaluationContext`](../interfaces/EvaluationContext.md) & [`EffectContext`](../interfaces/EffectContext.md)

Static context for the evaluation and effects

#### Returns

[`StepResult`](../interfaces/StepResult.md)[]

***

### walkWithContext()

> **walkWithContext**(`state`, `makeContext`, `maxSteps?`): [`StepResult`](../interfaces/StepResult.md)[]

Defined in: [packages/runtime/src/runtime.ts:223](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/runtime/src/runtime.ts#L223)

Traverse the graph continuously until no more transitions are available.
Useful for derived-state scenarios where the context needs to be recomputed
after every step (e.g. updating character stats or entities).

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

The starting state

##### makeContext

(`state`) => [`EvaluationContext`](../interfaces/EvaluationContext.md) & [`EffectContext`](../interfaces/EffectContext.md)

A callback invoked before each step to provide the context

##### maxSteps?

`number` = `100`

Safety limit (default 100)

#### Returns

[`StepResult`](../interfaces/StepResult.md)[]
