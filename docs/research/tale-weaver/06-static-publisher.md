# Tale Weaver — Static Publisher

> **Reference:** `/Users/nav/Projects/tale-weaver-stats` (as of 2026-04-29)

---

## Overview

Generates standalone HTML+JS+CSS bundles from stories. Uses vanilla JavaScript (no React) for small bundle sizes.

**Key files:** `packages/static-publisher/src/`

---

## Resolution Phase

`static-publisher/src/resolve/index.ts`

Takes a story version ID and resolves all data needed for the bundle:

```typescript
interface ResolveDependencies {
  getGraph(versionId: string): Promise<SerializedStoryGraph>;
  getPrimitives(versionId: string): Promise<PrimitiveDefinitions | undefined>;
  getCharacterTemplate(versionId: string): Promise<Character | null>;
  getConfig(versionId: string): Promise<StoryConfig>;
  getStoryTitle(storyId: string): Promise<string>;
  getStoryDescription(storyId: string): Promise<string | undefined>;
  getAsset(assetId: string): Promise<ArrayBuffer | null>;
}
```

### Serialized Types

Converted from domain types for JSON serialization:
- `SerializedPrimitiveDefinitions` — Maps/Sets become `Record`
- `SerializedCharacter` — Character template
- `SerializedScene` — Scene with string body instead of TipTap
- `SerializedStoryGraph` — Keyed by sceneKey

---

## Module Selection

`static-publisher/src/generate/select-modules.ts`

Based on `StoryConfig.enabledFeatures`, selects which runtime modules to include:

### Available Modules

`static-publisher/src/generate/modules.ts`:

| Module | Features | Size | Requires |
|--------|----------|------|----------|
| `core` | `scenes`, `branching-choices` | ~20KB | — (required) |
| `primitives` | `stats`, `resources`, `items`, `traits` | ~10KB | core |
| `logic` | `conditions`, `effects`, `flags`, `action-repeatability` | ~5KB | core |
| `character` | `character-sheet` | ~5KB | core |
| `actions` | `inline-actions` | ~5KB | core |

### Algorithm

1. Always include `core`
2. For each feature enabled, include its module
3. Recursively include dependencies
4. Topological sort to ensure correct order
5. Calculate estimated size

---

## Runtime

`static-publisher/src/runtime/`

### Core Exports

| Export | Purpose |
|--------|---------|
| `initStory()` | Initialize new playthrough |
| `autoInit()` | Auto-detect saved state or start new |
| `saveState()` | Persist to localStorage |
| `loadState()` | Restore from localStorage |
| `clearState()` | Clear saved state |
| `applyChoice()` | Process choice selection |
| `applyAction()` | Process inline action |
| `renderScene()` | Render current scene to DOM |
| `renderConsequence()` | Show consequence toaster |

### Module System

`static-publisher/src/runtime/modules/index.ts`

```typescript
export const allModules: RuntimeExtension[] = [
  primitivesModule,
  logicModule,
  characterModule,
  actionsModule,
];
```

---

## RuntimeExtension Interface

`static-publisher/src/types.ts:191-204`

```typescript
interface RuntimeExtension {
  id: string;
  provides: StoryFeature[];
  requires?: StoryFeature[];

  effectHandlers?: Record<string, EffectHandler>;
  conditionEvaluators?: Record<string, ConditionEvaluator>;
  panels?: PanelDefinition[];
  contentRenderers?: Record<string, ContentRenderer>;

  init?: (context: RuntimeContext) => void;
  destroy?: () => void;
  render?: (container: HTMLElement, state: GameState) => void;
}
```

This allows **extending the runtime** with custom effects, conditions, and UI panels.

---

## RuntimeContext

`static-publisher/src/types.ts:142-160`

```typescript
interface RuntimeContext {
  state: GameState;
  story: ResolvedStoryBundle;
  container: HTMLElement;

  applyChoice(choiceId: string): InteractionResult;
  applyAction(actionId: string): InteractionResult;
  applyContinue(): InteractionResult;
  navigate(sceneKey: string): void;
  restart(): void;

  saveState(): void;
  loadState(): boolean;
  clearState(): void;

  render(): void;
  renderSidebar(): void;
  showToast(message: string, type: "info" | "success" | "error"): void;
}
```

---

## Bundle Generation

`static-publisher/src/generate/index.ts`

### Output

```typescript
interface GeneratedBundle {
  manifest: BundleManifest;
  files: Map<string, { content: Uint8Array; contentType: string }>;
}

interface BundleManifest {
  id: string;
  type: "story" | "post";
  version: string;
  features: StoryFeature[];
  files: BundleFile[];
  createdAt: string;
  checksum: string;
  estimatedSize: number;
}
```

### Files Generated

- `index.html` — Entry point
- `story.js` — Bundled runtime modules
- `story.css` — Styles
- Assets (images, fonts)

---

## Prebuilt Modules

`static-publisher/src/generated/prebuilt-modules.ts`

Pre-compiled module bundles for faster generation. Generated via:
- `static-publisher/scripts/generate-prebuilt.ts`

---

## Size Estimate

Review says "~26-35 KB". Module sizes in code:
- `core`: 20,000 bytes
- `primitives`: 10,000 bytes
- `logic`: 5,000 bytes
- `character`: 5,000 bytes
- `actions`: 5,000 bytes

**Best case (linear story):** ~20KB core only = ~20KB  
**Full RPG:** all modules = ~45KB  

So the review's estimate is slightly optimistic for full features, but core is close.

---

## Not Covered in Original Review

- **`RuntimeExtension` interface** — Custom effect handlers, condition evaluators, panels, content renderers can be added
- **`RuntimeContext`** — Full API available to extensions for state management, navigation, rendering
- **Prebuilt modules** — Pre-compiled bundles for faster generation
- **Asset resolution** — `getAsset()` dependency for bundling images
- **`resolveStoryBundle()` function** — Main entry point that coordinates all resolution