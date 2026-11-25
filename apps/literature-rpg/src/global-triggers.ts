import type { StateTrigger } from "@fiction-map/runtime"

/**
 * The game's global triggers, shared by the live `GraphRuntime` in
 * `main.ts` and every `JournalSession` built in `journal.ts`. Keep this
 * the single source of truth — trigger changes must not diverge between
 * the plain runtime and journaled sessions.
 */
export const globalTriggers: readonly StateTrigger[] = [
  {
    id: "turn-counter-trigger",
    conditions: [],
    effects: [{ type: "addResource", key: "turns", amount: 1 }],
  },
  {
    id: "cavern-collapse-trigger",
    conditions: [{ type: "resourceAtLeast", key: "turns", value: 11 }],
    effects: [{ type: "spendResource", key: "health", amount: 25, clampToZero: true }],
  },
  {
    id: "death-trigger",
    conditions: [{ type: "resourceLessThan", key: "health", value: 1 }],
    effects: [{ type: "navigate", nodeId: "death" }],
  },
  {
    id: "mana-regen-trigger",
    conditions: [{ type: "resourceLessThan", key: "mana", value: 50 }],
    effects: [{ type: "addResource", key: "mana", amount: 5 }],
  },
  {
    id: "cooldown-tick-trigger",
    conditions: [{ type: "resourceAtLeast", key: "heal_cooldown", value: 1 }],
    effects: [{ type: "spendResource", key: "heal_cooldown", amount: 1, clampToZero: true }],
  },
]
