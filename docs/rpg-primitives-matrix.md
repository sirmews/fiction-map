# Fiction Map: RPG Primitives & Capability Matrix

This document maps out the core narrative and state primitives of the Fiction Map engine. It serves as a comprehensive reference guide to understand what capabilities currently exist, how they are utilized, and what gaps remain for future improvement.

---

## 1. The Core Primitives Matrix

The following matrix organizes each Fiction Map primitive, defining its execution domain, how it is configured, how it is evaluated/mutated, and its typical utilization in game design.

| Primitive | Execution Domain | Authored Format (Static) | Runtime Representation | Evaluation & Mutation | Sandbox Utilization Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Node** (`NodeInstance`) | Static Graph | Registered in `story.graph.ts` as a flat node descriptor. | `NodeDefinition` (read-only blueprint) | Accessed dynamically via `state.currentNodeId`. | A room, scene, dialogue passage, or game-over terminal state. |
| **Edge / Choice** (`EdgeInstance`) | Static Graph | Registered in `story.graph.ts` connecting source to target. | `Transition` (blueprint with visibility & requirements) | Evaluated by `getAvailable()`. Executed by `step()`. | A dialogue choice, a doorway, an active search, or cast spell. |
| **Condition** (`Condition`) | State Predicate | Flat objects on edges (`conditions: [{ type: "hasEntity" }]`). | `Condition` (conforming to `builtinConditionConfigs` schema) | Evaluated purely in `evaluateConditionSet` (returns `boolean`). | Gating a locked door with a key or requiring mana to cast a spell. |
| **Effect** (`Effect`) | State Mutation | Flat objects on edges (`effects: [{ type: "grantEntity" }]`). | `Effect` (conforming to `builtinEffectConfigs` schema) | Handled purely inside `EffectHandler` (returns new cloned State). | Damaging a player, giving an item, learning a spell, or subtracting MP. |
| **State** (`GraphRuntimeState`) | Mutable Session | N/A (initialized at runtime). | `GraphRuntimeState` (fully serializable JSON) | Cloned immutably on every step. Preserves full history and resources. | Storing player health, mana, learned spells, active flags, and path history. |
| **Entity** (`EntityInstance`) | World Schema | Registered in `world.ts` under defined Entity Types. | `EntityInstance` (read-only world record) | Static metadata checked during graph references cross-validation. | Defining item details (name, mana cost) or slot types. |
| **Derived State** (`DerivedEntityState`) | Computed Layer | N/A (recomputed on every step). | `DerivedEntityState` (read-only computed sets) | Evaluated by `deriveEntityState(world, state)` dynamically. | Tracking active modifiers, cascading locks, and effective equipment buffs. |
| **State Trigger** (`StateTrigger`) | Reactive Middleware | Registered on `GraphRuntime` or in Graph Definition. | `StateTrigger` (rules pipeline) | Evaluated and executed in a sequential loop inside `step()`. | Turn-based poison damage, mana regeneration ticks, and health death triggers. |

---

## 2. Deep-Dive: How Primitives Interact (The Pipeline)

When a player takes a choice in a Fiction Map client (TUI or Web), the primitives cooperate through a strict, headless pipeline:

```text
               [1] Player selects Choice (Edge)
                              │
                              ▼
               [2] Step is Executed (Runtime.step)
                              │
                              ▼
          [3] Apply Transition Effects (Effects Mutate State)
             - Health reduced to 0 HP
             - Mana reduced by 20 MP
                              │
                              ▼
     [4] Recompute Derived State (World Definitions + New State)
             - Re-evaluate active modifiers and effective unlocks
                              │
                              ▼
          [5] Execute State Triggers (Reaction Engine)
             - Trigger A: health < 1  ──► navigate to "death" node
             - Trigger B: mana < 50   ──► addResource mana 5
                              │
                              ▼
          [6] Final State returned to Client Application
             - Client receives state at "death" node, rendering Game Over
```

---

## 3. Primitives Taxonomy & Game Design Recipes

Because of this unified pipeline, highly advanced RPG systems can be written **100% declaratively** using combinations of these primitives, with zero custom engine-level code:

### A. Turn-Based Resource Regeneration (Stamina/Mana)
* **What it utilizes:** `resourceLessThan` (Condition), `addResource` (Effect), `StateTrigger` (Trigger).
* **Declarative Recipe:**
  - Every step the player takes, if their Mana is less than `50`, increment it by `5`.
  - **Authoring:**
    ```typescript
    runtime.addTrigger({
      id: "mana-regen",
      conditions: [{ type: "resourceLessThan", key: "mana", value: 50 }],
      effects: [{ type: "addResource", key: "mana", amount: 5 }]
    });
    ```

### B. Turn-Based Action Cooldowns (Spells/Abilities)
* **What it utilizes:** `addResource` (Effect), `resourceLessThan` (Condition), `spendResource` with `clampToZero` (Effect), `StateTrigger` (Trigger).
* **Declarative Recipe:**
  1. Casting the spell sets a `heal_cooldown` resource to `3`.
  2. The casting choice is gated by a condition requiring `heal_cooldown` to be less than `1`.
  3. Every step/turn, a global trigger ticks down `heal_cooldown` by `1`.
  - **Authoring (Casting Edge):**
    ```typescript
    conditions: [
      { type: "hasEntity", entityId: "heal-spell" },
      { type: "resourceLessThan", key: "heal_cooldown", value: 1 }
    ],
    effects: [
      { type: "spendResource", key: "mana", amount: 20 },
      { type: "addResource", key: "heal_cooldown", amount: 3 }
    ]
    ```
  - **Authoring (Global Trigger):**
    ```typescript
    runtime.addTrigger({
      id: "cooldown-tick",
      conditions: [{ type: "resourceAtLeast", key: "heal_cooldown", value: 1 }],
      effects: [{ type: "spendResource", key: "heal_cooldown", amount: 1, clampToZero: true }]
    });
    ```

### C. Status Effects & Damage-over-Time (Poison/Burn)
* **What it utilizes:** `flagEquals` (Condition), `spendResource` (Effect), `StateTrigger` (Trigger).
* **Declarative Recipe:**
  - If the player gets bit by a snake, we apply the flag `is_poisoned: true`.
  - Every step they take while poisoned, they lose `5 HP`.
  - **Authoring:**
    ```typescript
    runtime.addTrigger({
      id: "poison-tick",
      conditions: [{ type: "flagEquals", key: "is_poisoned", value: true }],
      effects: [{ type: "spendResource", key: "health", amount: 5, clampToZero: true }]
    });
    ```

---

## 4. Analysis of Gaps & Future Improvements

While our primitives are already exceptionally powerful, this matrix exposes a few clear areas where Fiction Map can be further improved to become a world-class RPG engine:

### Gap 1: Declaring Triggers statically inside the Graph Schema
* **Current Status:** Triggers are registered dynamically in the client's javascript runtime loop (`main.ts`, `useStoryRuntime.ts`). This is clean, but means the static graph parser (`fiction-map generate`) doesn't know about them.
* **Proposed Improvement:** Update `GraphDefinition` inside `@fiction-map/core` to support a native, optional `triggers?: StateTrigger[]` schema, allowing authors to draw or define reactive triggers directly alongside story nodes.

### Gap 2: Advanced Entity Modifiers Evaluation (Math Formulas)
* **Current Status:** We can define entity modifiers (e.g., an item `iron-shield` modifying a stat), but our `spendResource` and `addResource` effects only accept flat numeric amounts.
* **Proposed Improvement:** Support basic formula evaluations inside effects (e.g. `{ type: "spendResource", key: "health", formula: "30 / defense_stat" }`), utilizing active modifiers from the derived state layer during execution.

### Gap 3: Turn-Based Event Buffers
* **Current Status:** Cooldowns and status ticks decrement purely on step transitions.
* **Proposed Improvement:** Introduce turn count structures directly into the `GraphRuntimeState` to allow precise event scheduling (e.g., "apply effect in 10 turns") natively supported by the engine.
