[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [story-runtime/src](../README.md) / GraphRuntime

# Class: GraphRuntime

Defined in: [story-runtime/src/runtime.ts:49](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L49)

## Constructors

### Constructor

> **new GraphRuntime**(`blueprint`, `evaluators?`, `handlers?`): `GraphRuntime`

Defined in: [story-runtime/src/runtime.ts:54](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L54)

#### Parameters

##### blueprint

`GraphBlueprint`

##### evaluators?

`Map`\<`string`, [`ConditionEvaluator`](../type-aliases/ConditionEvaluator.md)\>

##### handlers?

`Map`\<`string`, [`EffectHandler`](../type-aliases/EffectHandler.md)\>

#### Returns

`GraphRuntime`

## Accessors

### endingNodeIds

#### Get Signature

> **get** **endingNodeIds**(): `Set`\<`string`\>

Defined in: [story-runtime/src/runtime.ts:76](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L76)

##### Returns

`Set`\<`string`\>

***

### nodes

#### Get Signature

> **get** **nodes**(): `Map`\<`string`, [`NodeDefinition`](../interfaces/NodeDefinition.md)\>

Defined in: [story-runtime/src/runtime.ts:68](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L68)

##### Returns

`Map`\<`string`, [`NodeDefinition`](../interfaces/NodeDefinition.md)\>

***

### startNodeId

#### Get Signature

> **get** **startNodeId**(): `string`

Defined in: [story-runtime/src/runtime.ts:72](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L72)

##### Returns

`string`

***

### transitions

#### Get Signature

> **get** **transitions**(): [`Transition`](../interfaces/Transition.md)[]

Defined in: [story-runtime/src/runtime.ts:64](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L64)

##### Returns

[`Transition`](../interfaces/Transition.md)[]

## Methods

### createState()

> **createState**(`initialVariables?`, `initialExtensions?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [story-runtime/src/runtime.ts:84](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L84)

#### Parameters

##### initialVariables?

`Record`\<`string`, `unknown`\>

##### initialExtensions?

`Record`\<`string`, `unknown`\>

#### Returns

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

***

### enumeratePaths()

> **enumeratePaths**(`maxDepth?`, `maxPaths?`): [`TraversalPath`](../interfaces/TraversalPath.md)[]

Defined in: [story-runtime/src/runtime.ts:160](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L160)

#### Parameters

##### maxDepth?

`number` = `50`

##### maxPaths?

`number` = `100`

#### Returns

[`TraversalPath`](../interfaces/TraversalPath.md)[]

***

### getAvailable()

> **getAvailable**(`state`): [`Transition`](../interfaces/Transition.md)[]

Defined in: [story-runtime/src/runtime.ts:95](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L95)

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

#### Returns

[`Transition`](../interfaces/Transition.md)[]

***

### getByAvailability()

> **getByAvailability**(`state`): `object`

Defined in: [story-runtime/src/runtime.ts:105](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L105)

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

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

Defined in: [story-runtime/src/runtime.ts:80](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L80)

#### Parameters

##### nodeId

`string`

#### Returns

`boolean`

***

### step()

> **step**(`state`, `transition`): [`TransitionResult`](../interfaces/TransitionResult.md)

Defined in: [story-runtime/src/runtime.ts:115](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L115)

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

##### transition

[`Transition`](../interfaces/Transition.md)

#### Returns

[`TransitionResult`](../interfaces/TransitionResult.md)

***

### validate()

> **validate**(): [`ValidationResult`](../interfaces/ValidationResult.md)

Defined in: [story-runtime/src/runtime.ts:231](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L231)

#### Returns

[`ValidationResult`](../interfaces/ValidationResult.md)

***

### walk()

> **walk**(`state`, `maxSteps?`): [`StepResult`](../interfaces/StepResult.md)[]

Defined in: [story-runtime/src/runtime.ts:127](https://github.com/sirmews/fiction-map/blob/b370981c8043baa0195ceed6d309f2ea761ca379/packages/story-runtime/src/runtime.ts#L127)

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

##### maxSteps?

`number` = `100`

#### Returns

[`StepResult`](../interfaces/StepResult.md)[]
