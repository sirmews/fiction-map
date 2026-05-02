# Tale Weaver — UI Components

> **Reference:** `/Users/nav/Projects/tale-weaver-stats` (as of 2026-04-29)

---

## Core Player Components

### StoryDisplay

`product-tale-weaver-ui/src/components/story-display.tsx`

Renders scene prose with inline action support.

| Feature | Line | Implementation |
|---------|------|----------------|
| TipTap body rendering | 81-93 | `<ReadOnlyRichText>` with `InlineAction` extension |
| Legacy prose fallback | 84-91 | Renders `scene.prose[]` array if no body |
| Consequence display | 95-107 | Shows `consequenceText` after choice |
| "The End" ending | 109-116 | Shows when `scene.isEnding && !consequenceText` |
| Auto-scroll | 57-61 | Scrolls to bottom on scene/choice change |

**Props:**
```typescript
interface StoryDisplayProps {
  scene: Scene;
  consequenceText: string | null;
  sceneKey: string;
  embedded?: boolean;
  onAction?: (actionId: string) => void;
}
```

---

### ChoicePanel

`product-tale-weaver-ui/src/components/choice-panel.tsx`

Renders available choices with requirement visualization.

| Feature | Line | Implementation |
|---------|------|----------------|
| Continue button | 98-126 | Shown when `canContinue` and no choices |
| Choice rendering | 128-205 | Displays label, description, requirements |
| Requirement badges | 166-191 | Shows stat/resource/item/trait requirements with comparison |
| Locked state | 138-143 | Disabled button, muted styling |
| Reason tooltip | 193-196 | Shows why choice is unavailable via `getRequirementReason()` |
| Restart button | 62-89 | Shown at endings |

**Requirement reason types** (`choice-panel.tsx:245-312`):
```typescript
"stat_requirement"
  | "resource_requirement"
  | "item_required"
  | "trait_required"
  | "flag_required"
  | "quest_requirement"
  | "action_required"
  | "unknown_stat"
  | "unknown_item"
  | "unknown_trait"
  | "unknown_resource"
```

---

### CharacterPanel

`product-tale-weaver-ui/src/components/character-panel.tsx`

Displays player character state.

| Feature | Line | Implementation |
|---------|------|----------------|
| Editable name | 81-136 | Click pencil → inline input → save/cancel |
| Class display | 119-121 | Read-only below name |
| Level | 140-142 | Always visible: "Lv. X" |
| Resource bars | 145-165 | `VitalBar` component, color-coded |
| Stats display | 169-214 | Shows stat name, value, progress bar |
| Stat flash | 176-198 | Shows +2/-1 delta after changes |
| Inventory | 217-232 | Simple list |
| Traits | 234-247 | Badge display |

**Props:**
```typescript
interface CharacterPanelProps {
  character: Character;
  statFlashes: PlayerSidebarStatFlash[];  // { stat, delta, id }
  onEdit: (updates: Partial<Character>) => void;
  embedded?: boolean;
  showStats?: boolean;
  showResources?: boolean;
  showInventory?: boolean;
  showTraits?: boolean;
}
```

---

## Graph Editor Components

From `packages/frontend-graph/src/`:

### GraphEditor

Full graph editing surface. Supports node CRUD, edge creation, rich text editing.

### GraphCollection

List/grid view of nodes. Configurable title/description fields.

### GraphDetail

Single node detail view with editing.

### GraphForm

Form for creating/editing nodes. Automatically generated from node type schema.

### GraphRelationPicker

Modal/component for creating edges. Validates source/target constraints.

### SequenceToolSurface

`frontend-graph/src/components/sequence-tool-surface.ts`

Drag-and-drop ordering surface for scenes.

---

## Tale Weaver Editor Components

From `packages/product-tale-weaver-ui/src/editor/`:

### CharacterTemplateEditor

`product-tale-weaver-ui/src/editor/components/character-template-editor.tsx` (885 lines)

Full character template editing:
- Identity: name, class, level
- Image: upload or Dicebear placeholder
- Stats: dynamic field editor
- Resources: dynamic vital bars
- Inventory: string list
- Traits: string list

### Scene Flow View

Scene sequencing with drag-and-drop reordering.

### World Entity Editor

CRUD for `story-world-entity` nodes.

---

## Graph Surfaces

`frontend-graph/src/components/`:

### SequenceToolSurface

Interactive scene ordering. Returns `SequenceToolSessionResult` with ordered scene keys.

### CharacterProfileSurface

Character detail view with portrait, stats, relationships.

---

## Key Files

| Component | File |
|-----------|------|
| StoryDisplay | `product-tale-weaver-ui/src/components/story-display.tsx` |
| ChoicePanel | `product-tale-weaver-ui/src/components/choice-panel.tsx` |
| CharacterPanel | `product-tale-weaver-ui/src/components/character-panel.tsx` |
| CharacterTemplateEditor | `product-tale-weaver-ui/src/editor/components/character-template-editor.tsx` |
| GraphEditor | `frontend-graph/src/components/graph-editor.tsx` |
| GraphCollection | `frontend-graph/src/components/graph-collection.tsx` |
| GraphDetail | `frontend-graph/src/components/graph-detail.tsx` |
| GraphForm | `frontend-graph/src/components/graph-form.tsx` |
| GraphRelationPicker | `frontend-graph/src/components/graph-relation-picker.tsx` |

---

## Not Covered in Original Review

- **Requirement reason tooltips** — Full error messages explaining why choice is locked
- **Stat flash animations** — Delta displayed on stat changes
- **CharacterTemplateEditor** — 885-line full editor for character template
- **`useBlockEditor` hook** — TipTap integration for scene bodies (`frontend-graph/src/hooks/use-block-editor.ts`)
- **SequenceToolSurface** — Interactive scene ordering
- **CharacterProfileSurface** — Character detail panel with portrait
- **GraphRelationPicker** — Edge creation with validation