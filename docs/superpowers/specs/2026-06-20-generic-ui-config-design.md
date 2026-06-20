# Design Spec: Generic UI Data-Binding via Consumer Configuration

**Topic:** Generic UI Data-Binding (Issue #76)
**Date:** 2026-06-20

## Problem Context
Currently, the consumer applications (like `apps/literature-rpg-web`) contain hardcoded logic to look for specific variables (`health`, `mana`, `gold`) inside the `Frame` emitted by the engine, and explicitly map those string keys to specific icons and visual treatments. This tightly couples the consumer app to the specific logic of one game, defeating the purpose of a headless engine. We need a way to build a generic web or terminal interface that can render *any* game built on `@fiction-map` without knowing the specific variables in advance.

## Decision: Strict Headless Separation
We have decided to strictly enforce the headless boundary:
1. **The Engine** (`@fiction-map/core`, `@fiction-map/runtime`, `@fiction-map/protocol`) must remain completely ignorant of presentation, semantics, layout, or components. It only tracks raw state (numbers, strings, booleans, entity sets).
2. **The Consumer Application** (e.g., TUI, Web) owns the presentation configuration. 

## Architecture & Implementation

### 1. The Presentation Configuration Layer (Consumer-Side)
Instead of putting `semanticTags` or `icons` into the `WorldDefinition` in the engine, the consumer application will define a `PresentationConfig`.

This configuration maps engine state keys (e.g., the variable `"health"`, or the entity ID `"silver-shield"`) to UI components and metadata.

**Example TUI Configuration (`apps/literature-rpg/tui-config.ts`):**
```typescript
export const tuiPresentationConfig = {
  hud: {
    resources: {
      "health": { widget: "ProgressBar", color: "red", label: "HP", icon: "❤️", max: 100 },
      "mana": { widget: "ProgressBar", color: "cyan", label: "MP", icon: "🧪", max: 50 },
      "gold": { widget: "Counter", color: "yellow", label: "Gold", icon: "🪙" }
    }
  },
  inventory: {
    entities: {
      "lantern": { icon: "🔦" },
      "silver-shield": { icon: "🛡️" }
    },
    defaultIcon: "📦"
  }
}
```

### 2. The Render Pipeline
1. The engine computes the standard protocol `Frame` (which contains raw `resources: { health: 75, gold: 150 }`).
2. The consumer app receives the `Frame`.
3. The consumer app iterates over the `Frame.resources`.
4. For each resource key, it looks up the key in the `PresentationConfig`.
5. It mounts the specified widget (e.g., a Bubble Tea progress bar, or a React `<ProgressBar />`) passing in the raw value from the `Frame` and the visual metadata from the `config`.

### 3. Benefits
* **Purity:** The core engine remains 100% focused on logic and state transitions.
* **Flexibility:** A TUI might choose to render "health" as a text fraction `(75/100)`, while the Web UI renders it as a CSS animated bar. They can maintain different configs.
* **No Engine Changes Required:** This feature does not require changes to `@fiction-map/core` or `@fiction-map/protocol`. It is purely an architectural pattern enforced in the consumer applications.

## Actionable Steps for Implementation
1. Remove all hardcoded "health", "mana", "silver-shield" logic from `apps/literature-rpg-web/src/App.tsx`.
2. Create a generic `webPresentationConfig.ts` in the web app.
3. Refactor the React `App.tsx` HUD loop to map `frame.resources` through the configuration, rendering a generic `<ResourceWidget />` that delegates to a ProgressBar or Text component based on the config.
4. (Future) When building the TUI, establish a similar `tuiPresentationConfig.ts` that maps to Bubble Tea widgets.