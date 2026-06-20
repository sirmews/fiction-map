[**fiction-map**](../../../README.md)

***

[fiction-map](../../../README.md) / [protocol/src](../README.md) / schema

# Variable: schema

> `const` **schema**: `object`

Defined in: [packages/protocol/src/schema.ts:10](https://github.com/sirmews/fiction-map/blob/6022fe6f260accf641b1d9ae99d958096a8f0450/packages/protocol/src/schema.ts#L10)

Neutral JSON Schema definition for the Frame and Intent presentation protocol.

This schema is the single source of truth for the cross-language contract
between the headless engine and any frontends (TUI, Web, SaaS).

## Type Declaration

### $schema

> **$schema**: `string` = `"http://json-schema.org/draft-07/schema#"`

### definitions

> **definitions**: `object`

#### definitions.Frame

> **Frame**: `object`

#### definitions.Frame.description

> **description**: `string` = `"The complete visual and semantic state of the game at a single point in time."`

#### definitions.Frame.properties

> **properties**: `object`

#### definitions.Frame.properties.choices

> **choices**: `object`

#### definitions.Frame.properties.choices.description

> **description**: `string` = `"Available choices/transitions the player can select from."`

#### definitions.Frame.properties.choices.items

> **items**: `object`

#### definitions.Frame.properties.choices.items.properties

> **properties**: `object`

#### definitions.Frame.properties.choices.items.properties.id

> **id**: `object`

#### definitions.Frame.properties.choices.items.properties.id.description

> **description**: `string` = `"The transition/edge ID."`

#### definitions.Frame.properties.choices.items.properties.id.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.choices.items.properties.label

> **label**: `object`

#### definitions.Frame.properties.choices.items.properties.label.description

> **description**: `string` = `"The text label to display to the user."`

#### definitions.Frame.properties.choices.items.properties.label.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.choices.items.required

> **required**: `string`[]

#### definitions.Frame.properties.choices.items.type

> **type**: `string` = `"object"`

#### definitions.Frame.properties.choices.type

> **type**: `string` = `"array"`

#### definitions.Frame.properties.currentNode

> **currentNode**: `object`

#### definitions.Frame.properties.currentNode.description

> **description**: `string` = `"The active scene or node the player is currently on."`

#### definitions.Frame.properties.currentNode.properties

> **properties**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks

> **blocks**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.description

> **description**: `string` = `"Visual content blocks (paragraphs, headers, images) to render."`

#### definitions.Frame.properties.currentNode.properties.blocks.items

> **items**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties

> **properties**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.caption

> **caption**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.caption.description

> **description**: `string` = `"Optional caption for image blocks."`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.caption.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.id

> **id**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.id.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.metadata

> **metadata**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.metadata.additionalProperties

> **additionalProperties**: `boolean` = `true`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.metadata.type

> **type**: `string` = `"object"`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.text

> **text**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.text.description

> **description**: `string` = `"Text content for paragraphs and headers."`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.text.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.type

> **type**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.type.enum

> **enum**: ...[]

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.type.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.url

> **url**: `object`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.url.description

> **description**: `string` = `"Image URL for image blocks."`

#### definitions.Frame.properties.currentNode.properties.blocks.items.properties.url.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.currentNode.properties.blocks.items.required

> **required**: `string`[]

#### definitions.Frame.properties.currentNode.properties.blocks.items.type

> **type**: `string` = `"object"`

#### definitions.Frame.properties.currentNode.properties.blocks.type

> **type**: `string` = `"array"`

#### definitions.Frame.properties.currentNode.properties.id

> **id**: `object`

#### definitions.Frame.properties.currentNode.properties.id.description

> **description**: `string` = `"Unique identifier of the node."`

#### definitions.Frame.properties.currentNode.properties.id.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.currentNode.properties.type

> **type**: `object`

#### definitions.Frame.properties.currentNode.properties.type.description

> **description**: `string` = `"The node type (e.g., 'scene', 'location')."`

#### definitions.Frame.properties.currentNode.properties.type.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.currentNode.required

> **required**: `string`[]

#### definitions.Frame.properties.currentNode.type

> **type**: `string` = `"object"`

#### definitions.Frame.properties.flags

> **flags**: `object`

#### definitions.Frame.properties.flags.additionalProperties

> **additionalProperties**: `object`

#### definitions.Frame.properties.flags.additionalProperties.anyOf

> **anyOf**: `object`[]

#### definitions.Frame.properties.flags.description

> **description**: `string` = `"Active story flags and their values."`

#### definitions.Frame.properties.flags.type

> **type**: `string` = `"object"`

#### definitions.Frame.properties.inventory

> **inventory**: `object`

#### definitions.Frame.properties.inventory.description

> **description**: `string` = `"Items or entities currently owned by the player."`

#### definitions.Frame.properties.inventory.items

> **items**: `object`

#### definitions.Frame.properties.inventory.items.properties

> **properties**: `object`

#### definitions.Frame.properties.inventory.items.properties.id

> **id**: `object`

#### definitions.Frame.properties.inventory.items.properties.id.description

> **description**: `string` = `"The entity ID."`

#### definitions.Frame.properties.inventory.items.properties.id.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.inventory.items.properties.label

> **label**: `object`

#### definitions.Frame.properties.inventory.items.properties.label.description

> **description**: `string` = `"The human-readable name of the item."`

#### definitions.Frame.properties.inventory.items.properties.label.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.inventory.items.required

> **required**: `string`[]

#### definitions.Frame.properties.inventory.items.type

> **type**: `string` = `"object"`

#### definitions.Frame.properties.inventory.type

> **type**: `string` = `"array"`

#### definitions.Frame.properties.pacing

> **pacing**: `object`

#### definitions.Frame.properties.pacing.description

> **description**: `string` = `"Pacing metadata for progressive block reveals."`

#### definitions.Frame.properties.pacing.properties

> **properties**: `object`

#### definitions.Frame.properties.pacing.properties.isComplete

> **isComplete**: `object`

#### definitions.Frame.properties.pacing.properties.isComplete.description

> **description**: `string` = `"Whether all blocks have been revealed."`

#### definitions.Frame.properties.pacing.properties.isComplete.type

> **type**: `string` = `"boolean"`

#### definitions.Frame.properties.pacing.properties.pacingIndex

> **pacingIndex**: `object`

#### definitions.Frame.properties.pacing.properties.pacingIndex.description

> **description**: `string` = `"The index of the last revealed block."`

#### definitions.Frame.properties.pacing.properties.pacingIndex.type

> **type**: `string` = `"number"`

#### definitions.Frame.properties.pacing.required

> **required**: `string`[]

#### definitions.Frame.properties.pacing.type

> **type**: `string` = `"object"`

#### definitions.Frame.properties.resources

> **resources**: `object`

#### definitions.Frame.properties.resources.additionalProperties

> **additionalProperties**: `object`

#### definitions.Frame.properties.resources.additionalProperties.type

> **type**: `string` = `"number"`

#### definitions.Frame.properties.resources.description

> **description**: `string` = `"Player resources (e.g., health, mana, gold, turns)."`

#### definitions.Frame.properties.resources.type

> **type**: `string` = `"object"`

#### definitions.Frame.properties.serializedState

> **serializedState**: `object`

#### definitions.Frame.properties.serializedState.description

> **description**: `string` = `"Opaque, serialized representation of the GraphRuntimeState for save/load."`

#### definitions.Frame.properties.serializedState.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.warnings

> **warnings**: `object`

#### definitions.Frame.properties.warnings.description

> **description**: `string` = `"Active warnings or alerts (e.g., 'THE CAVERN IS COLLAPSING!')."`

#### definitions.Frame.properties.warnings.items

> **items**: `object`

#### definitions.Frame.properties.warnings.items.type

> **type**: `string` = `"string"`

#### definitions.Frame.properties.warnings.type

> **type**: `string` = `"array"`

#### definitions.Frame.required

> **required**: `string`[]

#### definitions.Frame.type

> **type**: `string` = `"object"`

#### definitions.Intent

> **Intent**: `object`

#### definitions.Intent.description

> **description**: `string` = `"A user action sent from the UI to the engine to transition state."`

#### definitions.Intent.properties

> **properties**: `object`

#### definitions.Intent.properties.choiceId

> **choiceId**: `object`

#### definitions.Intent.properties.choiceId.description

> **description**: `string` = `"The transition ID to select (required for 'selectChoice')."`

#### definitions.Intent.properties.choiceId.type

> **type**: `string` = `"string"`

#### definitions.Intent.properties.saveSlot

> **saveSlot**: `object`

#### definitions.Intent.properties.saveSlot.description

> **description**: `string` = `"The slot identifier to save to or load from (required for 'save' and 'load')."`

#### definitions.Intent.properties.saveSlot.type

> **type**: `string` = `"string"`

#### definitions.Intent.properties.serializedState

> **serializedState**: `object`

#### definitions.Intent.properties.serializedState.description

> **description**: `string` = `"Opaque, serialized representation of the GraphRuntimeState to load (required for 'load')."`

#### definitions.Intent.properties.serializedState.type

> **type**: `string` = `"string"`

#### definitions.Intent.properties.type

> **type**: `object`

#### definitions.Intent.properties.type.description

> **description**: `string` = `"The kind of intent."`

#### definitions.Intent.properties.type.enum

> **enum**: `string`[]

#### definitions.Intent.properties.type.type

> **type**: `string` = `"string"`

#### definitions.Intent.required

> **required**: `string`[]

#### definitions.Intent.type

> **type**: `string` = `"object"`

### description

> **description**: `string` = `"Headless presentation protocol for Fiction Map"`

### title

> **title**: `string` = `"PresentationProtocol"`

## Ai-rule

Frame represents the complete visual and semantic state of the game at a single point in time.

## Ai-rule

Intent represents a user action sent from the UI to the engine to transition state.
