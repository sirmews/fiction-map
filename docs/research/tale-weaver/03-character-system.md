# Tale Weaver — Character System

> **Reference:** `/Users/nav/Projects/tale-weaver-stats` (as of 2026-04-29)

---

## Two Concepts: Character Template vs Primitive Definitions

The review conflates these. In the codebase they are **separate**:

| Concept | Purpose | File |
|---------|---------|------|
| **CharacterTemplate** | Starting values for a new playthrough | `contracts/src/character-template.contract.ts` |
| **PrimitiveDefinitions** | Schema of what stats/resources/items/traits CAN exist | `domain/src/types.ts:97-102` |

Both are used at runtime — the template provides initial values, primitives provide min/max clamps and validation references.

---

## Character Template

`contracts/src/character-template.contract.ts:17-35`

```typescript
{
  id: string.uuid,
  storyId: string.uuid,
  storyCharacterId: string.uuid | null,   // Link to world entity character
  name: string,                           // "My Character"
  class: string,                          // "Rogue"
  level: number.int,
  imageAssetId: string.uuid | null,
  imageServeUrl: string.url | null,
  imagePlaceholderStyle: "pixel-art-neutral" | "lorelei-neutral" | "notionists-neutral" | "thumbs",
  imagePlaceholderSeed: string,
  stats: Record<string, number>,          // e.g., { strength: 12, intelligence: 14 }
  resources: Record<string, { current, max }>,  // e.g., { hp: { current: 10, max: 10 } }
  inventory: string[],                    // ["Longsword", "Torch"]
  traits: string[],                       // ["Observant", "Lucky"]
  createdAt: datetime,
  updatedAt: datetime,
}
```

### Editor

`product-tale-weaver-ui/src/editor/components/character-template-editor.tsx` (885 lines)

Supports:
- Identity form: name, class, level
- Image upload via presigned URLs: `CharacterTemplateImagePresignRequest`
- Placeholder avatar styles via Dicebear
- Dynamic stat/resource/inventory/trait fields via `usePrimitiveForm` hook

---

## Four Primitive Categories

### 1. Stats

`domain/src/types.ts:18` — `Record<string, number>`

Examples: `strength`, `dexterity`, `intelligence`

Schema defined in `contracts/src/world.contract.ts:10-14`:
```typescript
{
  minValue: number.int.default(0),
  maxValue: number.int.default(20),
}
```

### 2. Resources

`domain/src/types.ts:19` — `Record<string, { current: number, max: number }>`

Examples: `hp`, `mp`, `gold`, `oxygen`

Schema defined in `contracts/src/world.contract.ts:26-30`:
```typescript
{
  maxValue: number.int.default(100),
  defaultValue: number.int.default(0),
}
```

### 3. Inventory

`domain/src/types.ts:20` — `string[]`

Item properties in `world.contract.ts:16-19`:
```typescript
{
  category: string.optional,
  // ...passthrough properties
}
```

### 4. Traits

`domain/src/types.ts:21` — `string[]`

Trait properties in `world.contract.ts:21-24`:
```typescript
{
  category: string.optional,
}
```

---

## Character Primitive Properties

World entity characters have additional properties beyond the player character:

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

Location primitives have distinct properties (`world.contract.ts:55-61`):
```typescript
{
  tags: string[],
  region: string,
  parentLocationId: string.uuid,
  atmosphere: string,
}
```

---

## Running Character State (GameState)

`domain/src/types.ts:119-129`

```typescript
interface GameState {
  character: Character;                    // Current character state
  currentSceneKey: string;                 // Where the player is
  history: string[];                        // Visited scene keys
  selectedChoicesByScene: Record<string, string[]>;  // Choices made per scene
  completedActionsByScene: Record<string, string[]>; // Actions done per scene
  completedActionsGlobal: string[];         // Actions done across playthrough
  sceneFlagsByScene: Record<string, Record<string, boolean | string | number>>;
  globalFlags: Record<string, boolean | string | number>;
  quests: Record<string, QuestState>;
}
```

---

## Server-Side Session State

`contracts/src/session.contract.ts:30-46`

**Same fields as GameState** but for server persistence:

```typescript
interface SessionState {
  currentSceneKey: string;
  character: Character;
  history: string[];
  selectedChoicesByScene: Record<string, string[]>;
  completedActionsByScene: Record<string, string[]>;
  completedActionsGlobal: string[];
  sceneFlagsByScene: Record<string, Record<string, boolean | string | number>>;
  globalFlags: Record<string, boolean | string | number>;
  quests: Record<string, { stage: number, status: "inactive" | "active" | "completed" | "failed" }>;
}
```

---

## Domain Functions

### Choice/Action Validation

| Function | File | Purpose |
|----------|------|---------|
| `canMakeChoice()` | `domain/src/can-make-choice.ts:228-234` | Validate requirements |
| `canPerformAction()` | `domain/src/can-make-choice.ts:236-253` | Validate + check repeatability |
| `isVisible()` | `domain/src/can-make-choice.ts:255-260` | Check visibility conditions |

### Choice/Action Application

| Function | File | Purpose |
|----------|------|---------|
| `applyChoice()` | `domain/src/apply-choice.ts:173-202` | Apply effects, navigate, return consequence |
| `applyAction()` | `domain/src/apply-choice.ts:204-235` | Apply effects, track completion, navigate |
| `getVisibleChoices()` | `domain/src/apply-choice.ts:237-243` | Filter by visibility |
| `getVisibleActions()` | `domain/src/apply-choice.ts:245-251` | Filter by visibility |

---

## Consequence System

The review doesn't mention the consequence tracking. This is important for UI feedback.

### Consequence Type

`domain/src/types.ts:131-141`:

```typescript
type Consequence =
  | { type: "resourceChange", resource?: string, delta?: number }
  | { type: "statChange", stat?: string, delta?: number }
  | { type: "itemGain", item?: string }
  | { type: "itemLoss", item?: string }
  | { type: "traitGain", trait?: string }
  | { type: "traitLoss", trait?: string }
  | { type: "narrative", text?: string }
  | { type: "flagChange", flag?: string }
  | { type: "questChange", questId?: string };
```

### InteractionResult

`domain/src/types.ts:143-148`:

```typescript
interface InteractionResult {
  state: GameState;
  consequence?: Consequence;
  shouldNavigate: boolean;
  nextScene?: string;
  success: boolean;
}
```

---

## Frontend Components

### CharacterPanel

`product-tale-weaver-ui/src/components/character-panel.tsx`

| Feature | Line | Notes |
|---------|------|-------|
| Editable name | 81-136 | Click pencil to edit, Enter to save |
| Class display | 119-121 | Read-only |
| Level | 140-142 | Always shows "Lv. X" |
| Resource bars | 145-165 | `VitalBar` component with color coding |
| Stats display | 169-214 | Shows stat name, value, progress bar; flash animation on change |
| Inventory | 217-232 | Simple list |
| Traits | 234-247 | Badge display |

**Gap noted in review confirmed:** The panel iterates over whatever stats/resources exist in the character object — doesn't enforce a specific schema. This matches the ECS design.

### Stat Flash Animation

`character-panel.tsx:54-55, 176-198`:
- When `statFlashes` prop has entries, displays delta (+2, -1, etc.) next to changed stats
- Color: green for positive, red for negative

---

## Not Covered in Original Review

- **Two character structures:** `CharacterTemplate` (initial values) vs `PrimitiveDefinitions` (schema)
- **CharacterTemplateEditor** — 885-line component with image upload, Dicebear placeholders
- **World entity character properties** — role, aliases, pronouns, tags, voice style, notes, portrait
- **Location primitive properties** — region, parent location, atmosphere
- **`Consequence` + `InteractionResult` types** — 9 consequence types, result includes success flag and navigation
- **Server vs runtime state** — `SessionState` (server) vs `GameState` (static publisher) same fields, different contexts