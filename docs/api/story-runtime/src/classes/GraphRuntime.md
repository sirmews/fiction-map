[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [runtime/src](../README.md) / GraphRuntime

# Class: GraphRuntime

Defined in: [runtime/src/runtime.ts:50](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L50)

## Constructors

### Constructor

> **new GraphRuntime**(`blueprint`, `evaluators?`, `handlers?`): `GraphRuntime`

Defined in: [runtime/src/runtime.ts:55](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L55)

#### Parameters

##### blueprint

[`GraphBlueprint`](../interfaces/GraphBlueprint.md)

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

Defined in: [runtime/src/runtime.ts:77](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L77)

##### Returns

`Set`\<`string`\>

***

### nodes

#### Get Signature

> **get** **nodes**(): `Map`\<`string`, [`NodeDefinition`](../interfaces/NodeDefinition.md)\>

Defined in: [runtime/src/runtime.ts:69](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L69)

##### Returns

`Map`\<`string`, [`NodeDefinition`](../interfaces/NodeDefinition.md)\>

***

### startNodeId

#### Get Signature

> **get** **startNodeId**(): `string`

Defined in: [runtime/src/runtime.ts:73](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L73)

##### Returns

`string`

***

### transitions

#### Get Signature

> **get** **transitions**(): [`Transition`](../interfaces/Transition.md)[]

Defined in: [runtime/src/runtime.ts:65](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L65)

##### Returns

[`Transition`](../interfaces/Transition.md)[]

## Methods

### createState()

> **createState**(`initialVariables?`, `initialExtensions?`): [`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

Defined in: [runtime/src/runtime.ts:85](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L85)

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

Defined in: [runtime/src/runtime.ts:168](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L168)

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

Defined in: [runtime/src/runtime.ts:96](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L96)

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

Defined in: [runtime/src/runtime.ts:108](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L108)

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

Defined in: [runtime/src/runtime.ts:81](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L81)

#### Parameters

##### nodeId

`string`

#### Returns

`boolean`

***

### step()

> **step**(`state`, `transition`, `context?`): [`TransitionResult`](../interfaces/TransitionResult.md)

Defined in: [runtime/src/runtime.ts:120](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L120)

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

Defined in: [runtime/src/runtime.ts:240](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L240)

#### Returns

[`ValidationResult`](../interfaces/ValidationResult.md)

***

### walk()

> **walk**(`state`, `maxSteps?`, `context?`): [`StepResult`](../interfaces/StepResult.md)[]

Defined in: [runtime/src/runtime.ts:134](https://github.com/sirmews/fiction-map/blob/735999b977a84e38bea36c388f129cf2fea90529/packages/runtime/src/runtime.ts#L134)

#### Parameters

##### state

[`GraphRuntimeState`](../interfaces/GraphRuntimeState.md)

##### maxSteps?

`number` = `100`

##### context?

[`EvaluationContext`](../interfaces/EvaluationContext.md) & [`EffectContext`](../interfaces/EffectContext.md)

#### Returns

[`StepResult`](../interfaces/StepResult.md)[]
