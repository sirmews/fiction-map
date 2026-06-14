# Design Spec: Reactive State Triggers Middleware

Date: 2026-06-14
Status: Draft

## Purpose

Implement a declarative **State Triggers & Reaction Engine** inside `@fiction-map/runtime`. This enables authors to declare global reactive rules (like player death when HP reaches 0, stamina depletion, or status effects) that evaluate and fire automatically after any state transition, keeping client applications completely decoupled from game rules.

## Requirements

1. **`StateTrigger` Schema:**
   - `id`: unique string.
   - `conditions`: Array of core condition definitions.
   - `effects`: Array of core effect definitions.
2. **Runtime Registration API:**
   - Add `addTrigger(trigger: StateTrigger)` and a `triggers: StateTrigger[]` collection to `GraphRuntime` class in `packages/runtime/src/runtime.ts`.
3. **Execution Pipeline inside `step()`:**
   - In `GraphRuntime.step()`, after applying transition effects, execute a trigger processing loop.
   - If a trigger's conditions are met, apply its effects to the state immediately.
   - Supports cascading (e.g., if one trigger modifies a resource that fires another trigger, let it process sequentially up to a safety limit like 5 iterations).
4. **Declarative RPG Rule Integration:**
   - Define the `"death-trigger"` declaratively on the runtime inside the consumer applications (`apps/literature-rpg/src/main.ts` and `apps/literature-rpg-web/src/hooks/useStoryRuntime.ts`).
   - Remove hardcoded `if (hp <= 0)` check logic from both client loops.
5. **Unit Tests:**
   - Add a test suite to verify that reactive triggers execute successfully, modify resources, and navigate to target nodes as designed.

---

## Code Architecture & Execution Flow

```text
       Player takes Action (Choice Taken)
                     │
                     ▼
       Apply Choice Transition Effects (e.g., -30 HP)
                     │
                     ▼
         State Updated (Health = 0 HP)
                     │
                     ▼
          Evaluate Registered Triggers
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   Condition Met?          Condition Not Met?
   (health <= 0)           (stamina > 0)
        │                         │
        ▼                         ▼
  Apply Trigger Effects       Do nothing
  (navigate to "death")
        │
        ▼
   Return Redirected State (currentNodeId = "death")
```
