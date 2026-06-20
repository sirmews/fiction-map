# Design Spec: Generic TUI UI Data-Binding via Consumer Configuration

**Topic:** Generic TUI Data-Binding (Issue #76)
**Date:** 2026-06-20

## Problem Context
Currently, the consumer TUI (`apps/literature-rpg-tui`) contains hardcoded logic to look for specific variables (`health`, `mana`, `gold`) inside the `Frame` emitted by the engine, and explicitly map those string keys to specific icons and terminal treatments. This tightly couples the consumer app to the specific logic of one game, defeating the purpose of a headless engine. We need a way to build a generic terminal interface that can render *any* game built on `@fiction-map` without knowing the specific variables in advance.

## Decision: Strict Headless Separation
We have decided to strictly enforce the headless boundary:
1. **The Engine** (`@fiction-map/core`, `@fiction-map/runtime`, `@fiction-map/protocol`) must remain completely ignorant of presentation, semantics, layout, or components. It only tracks raw state (numbers, strings, booleans, entity sets).
2. **The Consumer TUI Application** owns the presentation configuration. 

## Architecture & Implementation

### 1. The Presentation Configuration Layer (Consumer-Side)
Instead of putting `semanticTags` or `icons` into the `WorldDefinition` in the engine, the consumer TUI app will define a `PresentationConfig`.

This configuration maps engine state keys (e.g., the variable `"health"`, or the entity ID `"silver-shield"`) to UI components and metadata.

**Example TUI Configuration (`apps/literature-rpg-tui/presentation.config.ts`):**
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
5. It mounts the specified widget (e.g., a Bubble Tea progress bar or numeric renderer) passing in the raw value from the `Frame` and the visual metadata from the `config`.

   For the initial TUI scope, step 5 maps to terminal widgets (Lip Gloss/Bubble Tea style blocks) rather than web components.

### 3. Benefits
* **Purity:** The core engine remains 100% focused on logic and state transitions.
* **Flexibility:** A TUI might choose to render "health" as a terminal progress bar, while another terminal client renders a numeric readout. They can maintain different configs.
* **No Engine Changes Required:** This feature does not require changes to `@fiction-map/core` or `@fiction-map/protocol`. It is purely an architectural pattern enforced in the consumer TUI application.

## Actionable Steps for Implementation
1. Remove all hardcoded "health", "mana", "silver-shield" logic from `apps/literature-rpg-tui/main.go`.
2. Create a generic `tuiPresentationConfig.ts` equivalent in the TUI app (or a Go-local config if preferred).
3. Refactor the TUI HUD/render loop to map `frame.Resources` through the configuration, rendering terminal widgets/formatters based on the config.
4. Maintain compatibility fallbacks for unknown resource keys and inventory IDs.
