# Tale Weaver — Story Model

> **Reference:** `/Users/nav/Projects/tale-weaver-stats` (as of 2026-04-29)

---

## Story Container

```
Story
  └── Story Version (draft / published)
        ├── Character Template (stats, resources, inventory, traits)
        ├── Scene nodes
        ├── World entity nodes (characters, items, locations)
        └── Configuration (style, enabled features)
```

### Key Types

| Type | File | Fields |
|------|------|--------|
| `Story` | `contracts/src/story.contract.ts:35-49` | `id`, `slug`, `title`, `description`, `visibility`, `config`, `status`, `publishedAt`, `createdBy`, `createdAt`, `updatedAt`, `sceneCount`, `choiceCount` |
| `StoryVersion` | `contracts/src/story.contract.ts:112-122` | `id`, `storyId`, `version`, `status`, `config`, `createdBy`, `createdAt`, `publishedAt` |
| `StoryConfig` | `contracts/src/story.contract.ts:29-33` | `styleId`, `enabledFeatures` |

### Story Styles

Defined in `domain/src/story-styles.ts:14-57`:

| Style ID | Name | Features | Status |
|----------|------|----------|--------|
| `linear` | Linear Story | `scenes`, `story-map` | ✅ Available |
| `cyoa` | Choose Your Own Adventure | `scenes`, `story-map`, `branching-choices` | ✅ Available |
| `rpg` | RPG Adventure | All features | ⚠️ `comingSoon: true` |

---

## Scene

The fundamental narrative unit — a content node with a rich TipTap body.

### Schema

`contracts/src/scene.contract.ts:31-43`:
```typescript
{
  id: string.uuid,
  storyId: string.uuid,
  sceneKey: string,           // URL-friendly: "intro", "chapter-1/forest-entry"
  title: string | null,
  chapter: string | null,
  body: TipTapDoc,            // Rich text document
  choices: SceneChoice[],     // Branching choices
  afterChoices: "auto" | "show-navigation",  // Navigation behavior
  isEnding: boolean,          // Terminates playthrough
  sortOrder: number,          // For linear progression
  createdAt: datetime,
}
```

### Key Properties

| Property | Type | Notes |
|----------|------|-------|
| `sceneKey` | `string` | URL-safe, max 100 chars, regex `^[a-z0-9-]+$` |
| `afterChoices` | `"auto"` \| `"show-navigation"` | Controls if Continue button appears (`story-scene-graph.ts:11`) |
| `isEnding` | `boolean` | Shows "The End" UI in `StoryDisplay` (`story-display.tsx:109-116`) |
| `sortOrder` | `int` | Scenes sorted by this for linear stories |

### Start Scene

`progression.ts:23-29`:
```typescript
export function getStartSceneKey(graph: ProgressionGraph): string | undefined {
  if ("intro" in graph) {
    return "intro";
  }
  return getOrderedSceneKeys(graph)[0];
}
```

---

## Choices

### SceneChoice Type

`contracts/src/choice.contract.ts:126-139`:
```typescript
{
  id: string,
  label: string,                    // Display text
  description?: string,            // Longer explanation
  visibility?: ConditionSet,        // Should choice appear?
  requirements?: ConditionSet,      // Can player select this?
  effects?: Effect[],               // Applied on success
  successText?: string,             // Narrative feedback
  nextScene?: string,               // Target on success
  failureText?: string,             // Feedback on failure
  failureEffects?: Effect[],        // Applied on failure
  failureNextScene?: string,        // Target on failure
}
```

### After Choice Navigation

The `failureNextScene` / `failureEffects` path is notable — choices can have **two consequences** depending on whether requirements are met:
- Success → apply `effects`, narrate `successText`, go to `nextScene`
- Failure → apply `failureEffects`, narrate `failureText`, go to `failureNextScene`

This is different from simply hiding unavailable choices — locked choices can still be selected and drive narrative progression.

---

## Condition System

`contracts/src/choice.contract.ts:20-71`

### ConditionSet Structure

```typescript
{
  all?: Condition[],   // ALL must pass
  any?: Condition[],  // at least ONE must pass
  none?: Condition[]  // NONE must pass
}
```

At least one group must be present (Zod validation).

### Condition Types

| Type | Schema | Example |
|------|--------|---------|
| `stat` | `{ type: "stat", stat: string, comparison: "gte"\|"lte"\|"eq", value: number }` | `strength >= 12` |
| `resource` | `{ type: "resource", resource: string, comparison, value }` | `hp >= 10` |
| `has-item` | `{ type: "has-item", item: string }` | `"Skeleton Key" in inventory` |
| `has-trait` | `{ type: "has-trait", trait: string }` | `"Observant" possessed` |
| `flag` | `{ type: "flag", scope: "global"\|"scene", key: string, comparison: "eq", value: boolean\|string\|number }` | `global.greeted_mira === true` |
| `quest-stage` | `{ type: "quest-stage", questId: string, comparison, value }` | `quest.find_heir.stage >= 3` |
| `action-used` | `{ type: "action-used", scope: "scene"\|"global", actionId: string }` | `action.inspect_statue was used` |

---

## Effect System

`contracts/src/choice.contract.ts:73-116`

| Effect Type | Schema | Behavior |
|-------------|--------|----------|
| `stat` | `{ type: "stat", stat: string, delta: number }` | Modify stat, clamped to min/max |
| `resource` | `{ type: "resource", resource: string, delta: number }` | Modify HP/MP/etc, clamped 0–max |
| `add-item` | `{ type: "add-item", item: string }` | Add to inventory |
| `remove-item` | `{ type: "remove-item", item: string }` | Remove from inventory |
| `add-trait` | `{ type: "add-trait", trait: string }` | Add to traits |
| `remove-trait` | `{ type: "remove-trait", trait: string }` | Remove from traits |
| `set-flag` | `{ type: "set-flag", scope: "global"\|"scene", key: string, value }` | Set boolean/string/number flag |
| `clear-flag` | `{ type: "clear-flag", scope: "global"\|"scene", key: string }` | Delete flag |
| `quest-stage` | `{ type: "quest-stage", questId: string, value: number }` | Set quest stage, status → "active" if value > 0 |

---

## Inline Actions

Unlike choices, inline actions are embedded directly in prose via custom TipTap `inlineAction` nodes.

### InlineActionAttrs Schema

`contracts/src/choice.contract.ts:141-154`:
```typescript
{
  id: string,
  label: string,
  kind: "interact" | "loot" | "skill-check" | "use-item" | "quest" | "consume" | "combat-action",
  visibility?: ConditionSet,
  requirements?: ConditionSet,
  effects?: Effect[],
  successText?: string,
  failureText?: string,
  successNextScene?: string,
  failureNextScene?: string,
  usage?: {
    repeatability: "repeatable" | "once-per-scene" | "once-ever",
    hideAfterUse?: boolean,
    disableAfterUse?: boolean,
  },
}
```

### Usage Modes

| Mode | Behavior |
|------|----------|
| `repeatable` | Unlimited uses |
| `once-per-scene` | Once in current scene only |
| `once-ever` | Once across entire playthrough |

---

## Feature System

`domain/src/story-features.ts`

### Feature List

```typescript
type StoryFeature =
  // Core (always enabled)
  | 'scenes'
  // Narrative
  | 'branching-choices'
  | 'inline-actions'
  // Primitives
  | 'stats'
  | 'resources'
  | 'items'
  | 'traits'
  | 'character-sheet'
  // Logic
  | 'conditions'
  | 'effects'
  // Advanced
  | 'flags'
  | 'action-repeatability'
  // Visualization
  | 'story-map'
```

### Dependencies

`story-features.ts:29-32`:
```typescript
{
  'conditions': ['effects'],    // conditions require effects
  'action-repeatability': ['inline-actions'],
}
```

### Feature Resolution

The `resolveStoryFeatures()` function (`story-features.ts:40-93`) handles:
- Core features always enabled
- Dependency chain resolution
- Blocking unresolved dependencies

---

## Not Covered in Original Review

- **`afterChoices` scene property** — Controls Continue button visibility (`"auto"` | `"show-navigation"`)
- **Failure path on choices** — `failureNextScene` + `failureEffects` for narrative progression even when requirements not met
- **Action kinds** — 7 distinct action types: `interact`, `loot`, `skill-check`, `use-item`, `quest`, `consume`, `combat-action`
- **`use-block-editor` hook** — TipTap editor integration for scene bodies (`frontend-graph/src/hooks/use-block-editor.ts`)
- **ReorderScenesRequest** — `scene.contract.ts:69-77` — Array order determines `sortOrder`