# Design Spec: Epic RPG Sandbox Expansion

Date: 2026-06-14
Status: Draft

## Purpose

Implement an Epic RPG Sandbox Expansion in the reference consumer app `literature-rpg` and its Web UI companion. This demonstrates the ultimate versatility of our declarative platform, introducing multi-path non-linear puzzle-solving, trading, gold resource spending, turn tracking, and global time-limit damage hazards.

## Requirements

1. **Entities & World Expansion:**
   - Add item entity `lockpick` (Lockpick) inside `apps/literature-rpg/src/world.ts`.
2. **New Currencies & Resources:**
   - Initialize the player with `30 gold` (resource) and `0 turns` (resource) upon stepping inside.
3. **Non-Linear Story Graph Expansion (`story.graph.ts`):**
   - **Dusty Archives:** Add choice `buy-lockpick` (requires `15 gold`, grants `lockpick` item, spends `15 gold`).
   - **Forgotten Crypt (Lockpicking path):** Add choice `lockpick-casket` (requires `lockpick` item, gates win transition to `victory`).
4. **Time Limits & Cavern Collapse (Triggers):**
   - Register **Turn Counter Trigger**: Increments `turns` by `1` on every step.
   - Register **Cavern Collapse Trigger**: If `turns > 10` and player is not in `entrance`, `victory`, or `death`, apply a collapse hazard that inflicts `-25 HP` per turn (`spendResource: health, amount: 25, clampToZero: true`).
5. **HUD Interface Updates:**
   - Update terminal TUI HUD to print:
     ```text
     ❤️ HP: 100 | 🧪 MP: 50 | 🪙 Gold: 30g | ⏳ CD: 0t | 🕒 Turn: 0
     ```
   - Update React Web HUD with gold icons, turn counters, and warning flags if the cavern is collapsing.

---

## Technical Specifications

### A. Turn Counter Trigger
```typescript
runtime.addTrigger({
  id: "turn-counter-trigger",
  conditions: [], // always runs
  effects: [{ type: "addResource", key: "turns", amount: 1 }]
});
```

### B. Cavern Collapse Trigger
```typescript
runtime.addTrigger({
  id: "cavern-collapse-trigger",
  conditions: [
    { type: "resourceAtLeast", key: "turns", value: 11 },
    // exclude safe areas
    { type: "none", conditions: [
      { type: "currentNode", nodeId: "entrance" },
      { type: "currentNode", nodeId: "victory" },
      { type: "currentNode", nodeId: "death" }
    ]}
  ],
  effects: [
    { type: "spendResource", key: "health", amount: 25, clampToZero: true }
  ]
});
```
*Note:* Since `conditions` inside trigger accepts flat Conditions, we can negate safe areas by checking variables or creating a clean conditional check.
Let's see: we can implement the trigger conditions cleanly using `notVisited` or matching nodes! Or, to keep it extremely simple, we can check if `currentNodeId !== "victory"` and `currentNodeId !== "death"`.
Wait, do we have a core condition like `notNodeId`? No, we have `currentNode` which checks if `currentNodeId === nodeId`. We can use `ConditionGroup` none on `currentNode`!
```typescript
  conditions: [
    { type: "resourceAtLeast", key: "turns", value: 11 }
  ]
```
Wait! If the player is on `victory` or `death`, the game loop immediately terminates, so the trigger will never run on those nodes!
So we don't even need to write complex exclusions: if they are on `entrance` or `victory` or `death`, the game has either not started or has already ended!
This is incredibly elegant and simple!
