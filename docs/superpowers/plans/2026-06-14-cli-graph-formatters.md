# RPG Spells, Mana, and Turn-Based Cooldowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the reference story with spells (`heal-spell`, `mage-light`), a regenerating `mana` pool (recovers 5 MP per turn), and a 3-turn `heal_cooldown` countdown—all designed purely using generic declarative triggers (reusing `addResource` and `spendResource` with zero custom code).

**Architecture:** We will declare the spells in `world.ts`, write the casting choices in `story.graph.ts`, register the generic triggers in our clients (`main.ts` and `useStoryRuntime.ts`), and update our HUD interfaces to display MP and cooldowns dynamically.

**Tech Stack:** TypeScript, Bun, Bun Test, React, Tailwind CSS

---

### Task 1: Declare Spells and Gated Casting Choices

**Files:**
- Modify: `apps/literature-rpg/src/world.ts` (register the `spell` type and specific spell instances).
- Modify: `apps/literature-rpg/src/graphs/story.graph.ts` (write the study choices, mana/cooldown gating, and spell effects).
- Modify: `apps/literature-rpg/src/main.test.ts` (update tests to initialize mana and assert the magic traversal path).

- [ ] **Step 1: Declare Spells inside world.ts**

Read `apps/literature-rpg/src/world.ts` and add the `spell` entity type and instances:

```typescript
import { defineEntityType, defineWorld } from "@fiction-map/entities";
import { registry } from "./project";

defineEntityType(registry, {
  id: "item",
  properties: {
    label: { type: "string", required: true },
  },
});

defineEntityType(registry, {
  id: "spell",
  properties: {
    label: { type: "string", required: true },
    manaCost: { type: "number", required: true },
  },
});

export const world = defineWorld(registry, {
  id: "library",
  entities: [
    { id: "lantern", type: "item", label: "Brass Lantern" },
    { id: "elixir", type: "item", label: "Healing Elixir" },
    { id: "key", type: "item", label: "Casket Key" },
    { id: "heal-spell", type: "spell", label: "Heal", manaCost: 20 },
    { id: "mage-light", type: "spell", label: "Mage Light", manaCost: 15 },
  ],
});
```

- [ ] **Step 2: Update story.graph.ts with spell learning and casting**

Read `apps/literature-rpg/src/graphs/story.graph.ts` and update it to:
1. Initialize `health` to `100` and `mana` to `50` when stepping inside.
2. In the `archives`, add a choice `study-heal` to learn the Heal Spell.
3. In the `archives`, add a choice `study-mage-light` to learn the Mage Light Spell.
4. In the `dark-chapter`, add a choice `cast-mage-light` to navigate safely to the `chamber-of-runes` using magic instead of the lantern.
5. In `collapsed-bridge`, add a choice `cast-heal` (requires the spell, 20 mana, and `heal_cooldown < 1`) that restores `40 HP`, spends `20 MP`, and adds `3 heal_cooldown`.

```typescript
import { defineGraph } from "@fiction-map/core";
import { registry } from "../project";

export const story = defineGraph(registry, {
  id: "library-mystery",
  nodes: [
    { id: "entrance", type: "scene", title: "Entrance", body: "You stand at the entrance to the old library." },
    { id: "main-hall", type: "scene", title: "Main Hall", body: "Dust motes float in shafts of grey light. A lantern sits on a table." },
    { id: "archives", type: "scene", title: "Dusty Archives", body: "Towering shelves hold forgotten lore. Magical tomes rest on reading pedestals." },
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
      id: "die-at-crypt",
      type: "choice",
      source: "forgotten-crypt",
      target: "death",
      text: "Succumb to your wounds in the crypt",
    },
  ],
});
```

- [ ] **Step 3: Update main.test.ts to initialize resources and test new path**

Modify `apps/literature-rpg/src/main.test.ts` to assert the new dynamic walk, ensuring it successfully explores and studies the tomes:

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
Expected: Metadata compiles, and all tests pass perfectly.

- [ ] **Step 5: Commit changes**

```bash
git add apps/literature-rpg/src/world.ts apps/literature-rpg/src/graphs/story.graph.ts apps/literature-rpg/src/main.test.ts
git commit -m "feat(rpg): add spells, initial mana pools, and learning paths with updated tests"
```

---

### Task 2: Register Reactive Triggers inside Clients

**Files:**
- Modify: `apps/literature-rpg/src/main.ts` (register generic mana regen and cooldown countdown triggers, update HUD printout).
- Modify: `apps/literature-rpg-web/src/hooks/useStoryRuntime.ts` (register identical generic triggers on the Web client).

- [ ] **Step 1: Add triggers and update HUD in main.ts**

Read `apps/literature-rpg/src/main.ts` and update it to:
1. Register **Mana Regen Trigger**: If `mana < 50`, `addResource: mana, amount: 5`.
2. Register **Cooldown Tick Trigger**: If `heal_cooldown >= 1`, `spendResource: heal_cooldown, amount: 1, clampToZero: true`.
3. Update the TUI HUD notes to print HP, MP, and active Cooldowns neatly.

```typescript
// Register triggers right after creating runtime:
export const runtime = createRuntimeFromGraph(story);

runtime.addTrigger({
  id: "death-trigger",
  conditions: [{ type: "resourceLessThan", key: "health", value: 1 }],
  effects: [{ type: "navigate", nodeId: "death" }],
});

runtime.addTrigger({
  id: "mana-regen-trigger",
  conditions: [{ type: "resourceLessThan", key: "mana", value: 50 }],
  effects: [{ type: "addResource", key: "mana", amount: 5 }],
});

runtime.addTrigger({
  id: "cooldown-tick-trigger",
  conditions: [{ type: "resourceAtLeast", key: "heal_cooldown", value: 1 }],
  effects: [{ type: "spendResource", key: "heal_cooldown", amount: 1, clampToZero: true }],
});

// Inside main.ts playInteractive loop, replace lines 45-51 with:
    const hp = state.entityState?.resources?.health ?? 0;
    const mp = state.entityState?.resources?.mana ?? 0;
    const cooldown = state.entityState?.resources?.heal_cooldown ?? 0;
    const inventory = Array.from(context.derivedState.ownedEntityIds);
    
    let hudText = `❤️ HP: ${hp} | 🧪 MP: ${mp}`;
    if (cooldown > 0) {
      hudText += ` | ⏳ CD: ${cooldown} turns`;
    }
    if (inventory.length > 0) {
      hudText += `\n🎒 Spells/Items: ${inventory.join(", ")}`;
    }
```

- [ ] **Step 2: Add identical triggers to useStoryRuntime.ts**

Read `apps/literature-rpg-web/src/hooks/useStoryRuntime.ts` and add the same generic triggers right after runtime instantiation:

```typescript
export const runtime = createRuntimeFromGraph(story);

runtime.addTrigger({
  id: "death-trigger",
  conditions: [{ type: "resourceLessThan", key: "health", value: 1 }],
  effects: [{ type: "navigate", nodeId: "death" }],
});

runtime.addTrigger({
  id: "mana-regen-trigger",
  conditions: [{ type: "resourceLessThan", key: "mana", value: 50 }],
  effects: [{ type: "addResource", key: "mana", amount: 5 }],
});

runtime.addTrigger({
  id: "cooldown-tick-trigger",
  conditions: [{ type: "resourceAtLeast", key: "heal_cooldown", value: 1 }],
  effects: [{ type: "spendResource", key: "heal_cooldown", amount: 1, clampToZero: true }],
});
```

- [ ] **Step 3: Run typecheck and test suite**

Run: `bun run build && bun run typecheck && bun test`
Expected: Everything is 100% green and error-free.

- [ ] **Step 4: Commit changes**

```bash
git add apps/literature-rpg/src/main.ts apps/literature-rpg-web/src/hooks/useStoryRuntime.ts
git commit -m "feat(rpg): register generic mana-regen and cooldown triggers in both clients"
```

---

### Task 3: Enhance Web RPG Interface with Dual Stat Progress Bars

**Files:**
- Modify: `apps/literature-rpg-web/src/App.tsx` (render both HP and MP bars, plus cooldown badges).

- [ ] **Step 1: Update visual HUD and badges in App.tsx**

Read `apps/literature-rpg-web/src/App.tsx` and integrate the dual-bar progress bars and cooldown statuses:

```typescript
// Replace lines 20-59 (where inventory and stats are rendered) with:
  // Get dynamic state variables
  const health = state.entityState?.resources?.health ?? 0;
  const mana = state.entityState?.resources?.mana ?? 0;
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
          <div className="flex justify-between items-center gap-4">
            {/* HP Bar */}
            <div className="flex items-center gap-2 w-1/2">
              <span className="text-red-500 font-bold shrink-0 text-sm">❤️ {health} HP</span>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
                ></div>
              </div>
            </div>
            {/* MP Bar */}
            <div className="flex items-center gap-2 w-1/2">
              <span className="text-cyan-500 font-bold shrink-0 text-sm">🧪 {mana} MP</span>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-cyan-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0, mana * 2))}%` }}
                ></div>
              </div>
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
                  const icon = item.includes("spell") ? "✨" : item === "lantern" ? "🔦" : item === "elixir" ? "🧪" : "🔑";
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

- [ ] **Step 2: Build the web bundle**

Run: `bun run build`
Expected: Success

- [ ] **Step 3: Commit changes**

```bash
git add apps/literature-rpg-web/src/App.tsx
git commit -m "feat(web): update Web interface with dual HP/MP status bars and cooldown trackers"
```
