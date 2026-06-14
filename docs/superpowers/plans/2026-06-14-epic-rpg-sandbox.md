# Epic RPG Sandbox Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement gold-based trading, alternate puzzle-solving (lockpicking vs. key), turn counters, and automated cavern collapse damage hazards purely through declarative state triggers.

**Architecture:** We will declare the `lockpick` item, add choice gating for buying/using lockpicks in the graph, register the generic turn and collapse triggers in our clients, and update the HUD displays to render gold, turns, and warning states.

**Tech Stack:** TypeScript, Bun, Bun Test, React, Tailwind CSS

---

### Task 1: Add Lockpick, Gold, and Lockpicking Choices

**Files:**
- Modify: `apps/literature-rpg/src/world.ts` (add `lockpick` item).
- Modify: `apps/literature-rpg/src/graphs/story.graph.ts` (add gold/turns init, buy-lockpick choice in archives, and lockpick-casket choice in crypt).
- Modify: `apps/literature-rpg/src/main.test.ts` (assert the new multi-item storyline compiles and walks).

- [ ] **Step 1: Update world.ts**

Read `apps/literature-rpg/src/world.ts` and add `lockpick`:

```typescript
// Inside apps/literature-rpg/src/world.ts under entities list:
    { id: "lantern", type: "item", label: "Brass Lantern" },
    { id: "elixir", type: "item", label: "Healing Elixir" },
    { id: "key", type: "item", label: "Casket Key" },
    { id: "lockpick", type: "item", label: "Lockpick" },
```

- [ ] **Step 2: Update story.graph.ts**

Read `apps/literature-rpg/src/graphs/story.graph.ts` and replace its graph definition to:
1. Initialize `gold` to `30` and `turns` to `0` inside `enter-hall`.
2. Add choice `buy-lockpick` inside `archives` (requires `15 gold`, spends `15 gold`, grants `lockpick`).
3. Add choice `lockpick-casket` inside `forgotten-crypt` (requires `lockpick` item, leads to `victory`).

```typescript
import { defineGraph } from "@fiction-map/core";
import { registry } from "../project";

export const story = defineGraph(registry, {
  id: "library-mystery",
  nodes: [
    { id: "entrance", type: "scene", title: "Entrance", body: "You stand at the entrance to the old library." },
    { id: "main-hall", type: "scene", title: "Main Hall", body: "Dust motes float in shafts of grey light. A lantern sits on a table." },
    { id: "archives", type: "scene", title: "Dusty Archives", body: "Towering shelves hold forgotten lore. Magical tomes rest on reading pedestals, and a spectral librarian floats nearby." },
    { id: "dark-chapter", type: "scene", title: "Dark Chapter", body: "A narrow passage drops into darkness. You hear the crackle of ancient magic." },
    { id: "chamber-of-runes", type: "scene", title: "Chamber of Runes", body: "Glowing glyphs pulsate on the walls. A central stone pedestal holds a shining key." },
    { id: "collapsed-bridge", type: "scene", title: "Collapsed Bridge", body: "A stone bridge has collapsed over a bottomless chasm. Dust and rubble are everywhere." },
    { id: "forgotten-crypt", type: "scene", title: "Forgotten Crypt", body: "An ancient crypt, smelling of age. A massive iron casket lies in the center." },
    { id: "victory", type: "scene", title: "Victory!", body: "You successfully unlocked the iron casket, revealing the legendary treasure of the Library!" },
    { id: "death", type: "scene", title: "Defeat", body: "The dark forces of the passage overwhelm you. Your journey ends here." },
  ],
  edges: [
    {
      id: "enter-hall",
      type: "choice",
      source: "entrance",
      target: "main-hall",
      text: "Step inside",
      effects: [
        { type: "grantEntity", entityId: "lantern" },
        { type: "addResource", key: "health", amount: 100 },
        { type: "addResource", key: "mana", amount: 50 },
        { type: "addResource", key: "gold", amount: 30 },
        { type: "addResource", key: "turns", amount: 0 },
      ],
    },
    {
      id: "explore-archives",
      type: "choice",
      source: "main-hall",
      target: "archives",
      text: "Explore the Dusty Archives",
      conditions: [{ type: "notVisited", nodeId: "archives" }],
    },
    {
      id: "study-heal",
      type: "choice",
      source: "archives",
      target: "archives",
      text: "Study the Tome of Heal Spell",
      conditions: [{ type: "notVisited", nodeId: "study-heal" }],
      effects: [{ type: "grantEntity", entityId: "heal-spell" }],
    },
    {
      id: "study-mage-light",
      type: "choice",
      source: "archives",
      target: "archives",
      text: "Study the Tome of Mage Light Spell",
      conditions: [{ type: "notVisited", nodeId: "study-mage-light" }],
      effects: [{ type: "grantEntity", entityId: "mage-light" }],
    },
    {
      id: "buy-lockpick",
      type: "choice",
      source: "archives",
      target: "archives",
      text: "Buy a lockpick from the spectral librarian (-15 gold)",
      conditions: [
        { type: "notVisited", nodeId: "buy-lockpick" },
        { type: "resourceAtLeast", key: "gold", value: 15 },
      ],
      effects: [
        { type: "spendResource", key: "gold", amount: 15, clampToZero: true },
        { type: "grantEntity", entityId: "lockpick" },
      ],
    },
    {
      id: "return-from-archives",
      type: "choice",
      source: "archives",
      target: "main-hall",
      text: "Return to the Main Hall",
    },
    {
      id: "descend",
      type: "choice",
      source: "main-hall",
      target: "dark-chapter",
      text: "Descend into the passage using the lantern",
      conditions: [{ type: "hasEntity", entityId: "lantern" }],
    },
    {
      id: "examine-glyphs",
      type: "choice",
      source: "dark-chapter",
      target: "chamber-of-runes",
      text: "Examine the glowing glyphs",
    },
    {
      id: "cast-mage-light",
      type: "choice",
      source: "dark-chapter",
      target: "chamber-of-runes",
      text: "Cast Mage Light Spell and proceed safely (-15 MP)",
      conditions: [
        { type: "hasEntity", entityId: "mage-light" },
        { type: "resourceAtLeast", key: "mana", value: 15 },
      ],
      effects: [
        { type: "spendResource", key: "mana", amount: 15, clampToZero: true },
      ],
    },
    {
      id: "cross-bridge",
      type: "choice",
      source: "dark-chapter",
      target: "collapsed-bridge",
      text: "Cross the crumbling bridge",
      effects: [{ type: "spendResource", key: "health", amount: 40, clampToZero: true }],
    },
    {
      id: "translate-runes",
      type: "choice",
      source: "chamber-of-runes",
      target: "forgotten-crypt",
      text: "Translate the runes using the lantern",
      conditions: [{ type: "hasEntity", entityId: "lantern" }],
      effects: [{ type: "grantEntity", entityId: "key" }],
    },
    {
      id: "touch-pedestal",
      type: "choice",
      source: "chamber-of-runes",
      target: "chamber-of-runes",
      text: "Touch the central pedestal",
      effects: [{ type: "spendResource", key: "health", amount: 30, clampToZero: true }],
    },
    {
      id: "return-to-chapter",
      type: "choice",
      source: "chamber-of-runes",
      target: "dark-chapter",
      text: "Return to the Dark Chapter",
    },
    {
      id: "heal-with-elixir",
      type: "choice",
      source: "collapsed-bridge",
      target: "collapsed-bridge",
      text: "Drink the healing elixir (+50 HP)",
      conditions: [{ type: "hasEntity", entityId: "elixir" }],
      effects: [
        { type: "addResource", key: "health", amount: 50 },
        { type: "revokeEntity", entityId: "elixir" },
      ],
    },
    {
      id: "cast-heal",
      type: "choice",
      source: "collapsed-bridge",
      target: "collapsed-bridge",
      text: "Cast Heal Spell (+40 HP, -20 MP, 3t CD)",
      conditions: [
        { type: "hasEntity", entityId: "heal-spell" },
        { type: "resourceAtLeast", key: "mana", value: 20 },
        { type: "resourceLessThan", key: "heal_cooldown", value: 1 },
      ],
      effects: [
        { type: "addResource", key: "health", amount: 40 },
        { type: "spendResource", key: "mana", amount: 20, clampToZero: true },
        { type: "addResource", key: "heal_cooldown", amount: 3 },
      ],
    },
    {
      id: "climb-rubble",
      type: "choice",
      source: "collapsed-bridge",
      target: "forgotten-crypt",
      text: "Climb through the rubble (-20 HP)",
      conditions: [{ type: "resourceAtLeast", key: "health", value: 30 }],
      effects: [{ type: "spendResource", key: "health", amount: 20, clampToZero: true }],
    },
    {
      id: "succumb-to-injuries",
      type: "choice",
      source: "collapsed-bridge",
      target: "death",
      text: "Succumb to your injuries",
    },
    {
      id: "unlock-casket",
      type: "choice",
      source: "forgotten-crypt",
      target: "victory",
      text: "Unlock the iron casket",
      conditions: [{ type: "hasEntity", entityId: "key" }],
    },
    {
      id: "lockpick-casket",
      type: "choice",
      source: "forgotten-crypt",
      target: "victory",
      text: "Lockpick the iron casket",
      conditions: [{ type: "hasEntity", entityId: "lockpick" }],
    },
    {
      id: "die-at-crypt",
      type: "choice",
      source: "forgotten-crypt",
      target: "death",
      text: "Succumb to your wounds in the crypt",
    },
  ],
});
```

- [ ] **Step 3: Update main.test.ts to walk the expanded storyline**

Read `apps/literature-rpg/src/main.test.ts` and update it to assert that the test walk-through cleanly visits the library, studies the Spells, and achieves victory:

```typescript
import { describe, expect, it } from "vitest";
import { runtime } from "./main";
import { story } from "./graphs/story.graph";
import { world } from "./world";
import { createInitialState, deriveEntityState } from "@fiction-map/runtime";

describe("literature-rpg consumer app", () => {
  it("world has no definition errors", () => {
    expect(world.errors).toEqual([]);
  });

  it("walks from the entrance to victory learning spells along the way", () => {
    const visited: string[] = [runtime.startNodeId];
    
    const steps = runtime.walkWithContext(
      createInitialState(runtime.startNodeId), 
      (currentState) => ({ derivedState: deriveEntityState(world, currentState) })
    );

    for (const step of steps) {
      if (step.applied) {
        visited.push(step.state.currentNodeId);
      }
    }

    expect(visited).toEqual([
      "entrance",
      "main-hall",
      "archives",
      "archives", // Studies Tome of Heal
      "archives", // Studies Tome of Mage Light
      "main-hall",
      "dark-chapter",
      "chamber-of-runes",
      "forgotten-crypt",
      "victory",
    ]);
  });
});
```

- [ ] **Step 4: Regenerate metadata, build and run tests**

Run: `bun packages/cli/src/cli.ts generate --root-dir apps/literature-rpg/src && bun run build && bun test`
Expected: Success

- [ ] **Step 5: Commit changes**

```bash
git add apps/literature-rpg/src/world.ts apps/literature-rpg/src/graphs/story.graph.ts apps/literature-rpg/src/main.test.ts
git commit -m "feat(rpg): add gold resources, lockpick item, and lockpicking choices to graph"
```

---

### Task 2: Register Turn and Collapse Triggers inside Clients

**Files:**
- Modify: `apps/literature-rpg/src/main.ts` (register Turn Counter and Collapse Triggers, update HUD printout).
- Modify: `apps/literature-rpg-web/src/hooks/useStoryRuntime.ts` (register Turn Counter and Collapse Triggers).

- [ ] **Step 1: Register triggers and update HUD in main.ts**

Read `apps/literature-rpg/src/main.ts` and add triggers and update HUD format:

```typescript
// Register Turn and Collapse triggers right after creating runtime in main.ts:
runtime.addTrigger({
  id: "turn-counter-trigger",
  conditions: [],
  effects: [{ type: "addResource", key: "turns", amount: 1 }],
});

runtime.addTrigger({
  id: "cavern-collapse-trigger",
  conditions: [
    { type: "resourceAtLeast", key: "turns", value: 11 },
  ],
  effects: [{ type: "spendResource", key: "health", amount: 25, clampToZero: true }],
});

// Update main.ts HUD note parsing:
    const hp = state.entityState?.resources?.health ?? 0;
    const mp = state.entityState?.resources?.mana ?? 0;
    const gold = state.entityState?.resources?.gold ?? 0;
    const turns = state.entityState?.resources?.turns ?? 0;
    const cooldown = state.entityState?.resources?.heal_cooldown ?? 0;
    const inventory = Array.from(context.derivedState.ownedEntityIds);
    
    let hudText = `❤️ HP: ${hp} | 🧪 MP: ${mp} | 🪙 Gold: ${gold}g | 🕒 Turn: ${turns}`;
    if (turns > 10) {
      hudText += `\n⚠️ WARNING: THE CAVERN IS COLLAPSING! (-25 HP/t)`;
    }
    if (cooldown > 0) {
      hudText += ` | ⏳ CD: ${cooldown} turns`;
    }
    if (inventory.length > 0) {
      hudText += `\n🎒 Spells/Items: ${inventory.join(", ")}`;
    }
```

- [ ] **Step 2: Register Turn and Collapse triggers in useStoryRuntime.ts**

Read `apps/literature-rpg-web/src/hooks/useStoryRuntime.ts` and register the same Turn and Collapse triggers right after runtime creation:

```typescript
runtime.addTrigger({
  id: "turn-counter-trigger",
  conditions: [],
  effects: [{ type: "addResource", key: "turns", amount: 1 }],
});

runtime.addTrigger({
  id: "cavern-collapse-trigger",
  conditions: [
    { type: "resourceAtLeast", key: "turns", value: 11 },
  ],
  effects: [{ type: "spendResource", key: "health", amount: 25, clampToZero: true }],
});
```

- [ ] **Step 3: Run typechecks and test suite**

Run: `bun run build && bun run typecheck && bun test`
Expected: Clean pass

- [ ] **Step 4: Commit changes**

```bash
git add apps/literature-rpg/src/main.ts apps/literature-rpg-web/src/hooks/useStoryRuntime.ts
git commit -m "feat(rpg): register turn counter and cavern collapse reactive triggers in clients"
```

---

### Task 3: Enhance Web RPG Interface with Gold, Turns, and Collapse Warning

**Files:**
- Modify: `apps/literature-rpg-web/src/App.tsx` (add Gold coins, Turn counters, and collapse alerts).

- [ ] **Step 1: Update visual HUD and Alert Banner in App.tsx**

Read `apps/literature-rpg-web/src/App.tsx` and integrate gold, turn tracking, and collapse alert states:

```typescript
// Replace lines 20-100 (where HUD is rendered) with:
  // Get dynamic state variables
  const health = state.entityState?.resources?.health ?? 0;
  const mana = state.entityState?.resources?.mana ?? 0;
  const gold = state.entityState?.resources?.gold ?? 0;
  const turns = state.entityState?.resources?.turns ?? 0;
  const cooldown = state.entityState?.resources?.heal_cooldown ?? 0;
  const isDead = state.currentNodeId === "death";
  const isVictory = state.currentNodeId === "victory";

  // Figure out what we have active from the derived state (e.g. 'lantern')
  const inventory = Array.from(context.derivedState.ownedEntityIds);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      
      {/* Dynamic RPG HUD Status Bar */}
      {state.currentNodeId !== "entrance" && (
        <div className="w-full max-w-lg mb-4 flex flex-col gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3">
          
          {/* Collapsing Cavern Alert Warning */}
          {turns > 10 && !isDead && !isVictory && (
            <div className="bg-red-950/80 border border-red-900 rounded p-2 text-center text-xs text-red-200 animate-pulse font-semibold">
              ⚠️ WARNING: THE CAVERN IS COLLAPSING! TAKING -25 DAMAGE PER TURN!
            </div>
          )}

          <div className="flex justify-between items-center gap-4">
            {/* HP Bar */}
            <div className="flex items-center gap-2 w-1/3">
              <span className="text-red-500 font-bold shrink-0 text-xs">❤️ {health} HP</span>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div 
                  className="bg-red-600 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
                ></div>
              </div>
            </div>
            {/* MP Bar */}
            <div className="flex items-center gap-2 w-1/3">
              <span className="text-cyan-500 font-bold shrink-0 text-xs">🧪 {mana} MP</span>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div 
                  className="bg-cyan-600 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0, mana * 2))}%` }}
                ></div>
              </div>
            </div>
            {/* Turn & Gold Counter */}
            <div className="flex justify-end gap-3 w-1/3 text-xs shrink-0 font-semibold">
              <span className="text-yellow-500">🪙 {gold}g</span>
              <span className="text-slate-400">🕒 Turn: {turns}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
            {/* Cooldown State */}
            <div>
              {cooldown > 0 ? (
                <span className="text-xs text-amber-500 font-medium">⏳ Heal Cooldown: {cooldown} turns</span>
              ) : (
                <span className="text-xs text-emerald-500 font-medium">✨ Spell Cast Ready</span>
              )}
            </div>
            {/* Badges */}
            <div className="flex gap-1 flex-wrap justify-end">
              {inventory.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Inventory empty</span>
              ) : (
                inventory.map(item => {
                  const icon = item.includes("spell") ? "✨" : item === "lantern" ? "🔦" : item === "elixir" ? "🧪" : item === "lockpick" ? "⚙️" : "🔑";
                  return (
                    <Badge key={item} variant="secondary" className="bg-amber-900/60 text-amber-100 hover:bg-amber-800 shrink-0 border border-amber-800/40 text-[10px] px-1.5 py-0.5">
                      {icon} {item}
                    </Badge>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Build the web application**

Run: `bun run build`
Expected: Success

- [ ] **Step 3: Commit changes**

```bash
git add apps/literature-rpg-web/src/App.tsx
git commit -m "feat(web): add Gold, Turns, and Collapsing Cavern warnings to Web RPG app HUD"
```
