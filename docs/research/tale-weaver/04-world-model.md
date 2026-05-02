# Tale Weaver — World Model

> **Reference:** `/Users/nav/Projects/tale-weaver-stats` (as of 2026-04-29)

---

## Story World Entity

Any durable named entity in the story world. Distinguishable by `kind` property (free-form string, not an enum).

### Node Type

`product-tale-weaver-graph/src/node-types/story-world-entity.node-type.ts`:

```typescript
defineNodeType({
  id: "story-world-entity",
  product: "tale-weaver",
  facets: { body: false, children: false },
  edges: {
    asSource: ["story-world-relationship"],
    asTarget: ["story-world-relationship"],
  },
  annotations: [],
  operations: ["create", "update", "delete"],
});
```

### Schema

`contracts/src/world.contract.ts:66-81`:

```typescript
{
  id: string.uuid,
  storyId: string.uuid,
  type: string,           // "character" | "item" | "location" (convention)
  name: string,           // machine-readable: "mara", "longsword", "tavern"
  displayName: string | null,
  description: string | null,
  category: string | null,
  properties: Record<string, unknown>,  // custom attributes
  sortOrder: number.int,
  createdAt: datetime,
  updatedAt: datetime,
}
```

### World Entity Kinds

The review mentions "kind property: character, item, location". This is **convention not schema**:
- `kind: "character"` — has `CharacterPrimitiveProperties`
- `kind: "item"` — has `ItemProperties`
- `kind: "location"` — has `LocationPrimitiveProperties`

Type-specific properties validated via superRefine in `UpsertStoryPrimitiveSchema` (`world.contract.ts:131-163`).

---

## Character Properties (when kind = "character")

`contracts/src/world.contract.ts:42-53`:

```typescript
{
  role: "player" | "npc" | "companion" | "antagonist" | "narrator" | "minor",
  aliases: string[],
  pronouns: string,
  tags: string[],
  defaultLocationId: string.uuid,
  defaultFactionId: string.uuid,
  voiceStyle: string,
  notes: string,
  portraitAssetId: string.uuid,
}
```

---

## Location Properties (when kind = "location")

`contracts/src/world.contract.ts:55-61`:

```typescript
{
  tags: string[],
  region: string,
  parentLocationId: string.uuid,
  atmosphere: string,
}
```

---

## Item Properties (when kind = "item")

`contracts/src/world.contract.ts:16-19`:

```typescript
{
  category: string,
  // ...passthrough (can add any custom fields)
}
```

---

## World Relationships

### Edge Type

`product-tale-weaver-graph/src/edge-types/story-world-relationship.edge-type.ts`:

```typescript
defineEdgeType({
  id: "story-world-relationship",
  sourceNodeTypes: ["story-world-entity"],
  targetNodeTypes: ["story-world-entity"],
  unique: false,
});
```

### Schema

`contracts/src/world.contract.ts:97-110` (`StoryPrimitiveLinkSchema`):

```typescript
{
  id: string.uuid,
  storyId: string.uuid,
  fromPrimitiveId: string.uuid,
  toPrimitiveId: string.uuid,
  relationshipType: PrimitiveLinkRelationshipType,
  properties: Record<string, unknown>,
  sortOrder: number.int,
  createdAt: datetime,
  updatedAt: datetime,
}
```

### Relationship Types (Enum)

`contracts/src/world.contract.ts:83-93`:

```typescript
"wears" | "located-at" | "member-of" | "allied-with" | "rival-of" | "knows" | "owns" | "uses"
```

**This is narrower than the examples in the review** ("Enemy Of", "Held By", "Located In"). The enum provides a fixed vocabulary.

---

## Scene References

### Edge Type

`product-tale-weaver-graph/src/edge-types/scene-references-world-entity.edge-type.ts`:

```typescript
defineEdgeType({
  id: "scene-references-world-entity",
  sourceNodeTypes: ["scene"],
  targetNodeTypes: ["story-world-entity"],
  unique: false,
});
```

### Schema

`domain/src/story-world-graph.ts:131-133`:

```typescript
{
  storyId: string.uuid,
  // No additional properties — just links scene to entity
}
```

---

## The Three World Model Layers

The review's philosophy is accurate but the implementation doesn't enforce these as strict layers:

| Layer | In Code | Status |
|-------|---------|--------|
| **Canonical Definitions** | Not separate — no "spell" node type | ❌ Not implemented |
| **Canonical World Objects** | `story-world-entity` nodes | ✅ Implemented |
| **Runtime/Playthrough State** | Edges not used for this — stored in `GameState` | ⚠️ Uses GameState fields, not edges |

---

## Inventory as Relationship (Review's Preferred Model)

The review says:

> Instead of `character.inventory: string[]`, the preferred future model is:
> ```
> character:mara -- owns --> item:longsword
> character:mara -- equipped --> item:longsword
> ```

**Status:** This is **NOT yet implemented**. Inventory is still:
- `string[]` in `Character` (`domain/src/types.ts:20`)
- No edges used for inventory tracking

The relationship system exists (`story-world-relationship`) but is only used for world entity ↔ world entity connections, not player inventory.

---

## Key Files

| Concept | File |
|---------|------|
| World entity schema | `contracts/src/world.contract.ts:66-81` |
| World relationship schema | `contracts/src/world.contract.ts:97-110` |
| Relationship types enum | `contracts/src/world.contract.ts:83-93` |
| Character properties | `contracts/src/world.contract.ts:42-53` |
| Location properties | `contracts/src/world.contract.ts:55-61` |
| Item properties | `contracts/src/world.contract.ts:16-19` |
| Node type definition | `product-tale-weaver-graph/src/node-types/story-world-entity.node-type.ts` |
| Relationship edge type | `product-tale-weaver-graph/src/edge-types/story-world-relationship.edge-type.ts` |
| Scene reference edge type | `product-tale-weaver-graph/src/edge-types/scene-references-world-entity.edge-type.ts` |
| Graph builders | `domain/src/story-world-graph.ts` |

---

## Not Covered in Original Review

- **Fixed relationship vocabulary** — The enum has only 8 types, not unlimited "Enemy Of"-style strings
- **Character role system** — 6 roles (player/npc/companion/antagonist/narrator/minor)
- **Location hierarchy** — `parentLocationId` enables nested locations
- **Scene reference edge** — Explicitly links scenes to entities they reference
- **Sort order on relationships** — Ordering entities within a category
- **Current implementation mismatch** — Inventory is still array-based, not edge-based as the review speculates for "preferred future model"