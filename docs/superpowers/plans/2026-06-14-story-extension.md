# RPG Story Extension & HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the reference story graph with more branching paths, dynamic items (elixir, key), traps, health tracking, and visual health bars in both the TUI and React Web UI.

**Architecture:** We will declare items in `world.ts`, write the expanded 9-node graph in `story.graph.ts`, integrate a text status bar in the console loop of `main.ts`, and add a responsive React HP component in `App.tsx`. We will update the test suite to match the expanded narrative.

**Tech Stack:** TypeScript, Bun, Bun Test, React, Tailwind CSS

---

### Task 1: Expand World Definition and Story Graph

**Files:**
- Modify: `apps/literature-rpg/src/world.ts` (add `elixir` and `key` items).
- Modify: `apps/literature-rpg/src/graphs/story.graph.ts` (write the expanded story nodes and choices).
- Modify: `apps/literature-rpg/src/main.test.ts` (update test assertions to walk the new multi-item storyline).

- [ ] **Step 1: Update world.ts**

Read `apps/literature-rpg/src/world.ts` and replace its entities definition with:

```typescript
import { defineEntityType, defineWorld } from "@fiction-map/entities";
import { registry } from "./project";

defineEntityType(registry, {
  id: "item",
  properties: {
    label: { type: "string", required: true },
  },
});

export const world = defineWorld(registry, {
  id: "library",
  entities: [
    { id: "lantern", type: "item", label: "Brass Lantern" },
    { id: "elixir", type: "item", label: "Healing Elixir" },
    { id: "key", type: "item", label: "Casket Key" },
  ],
});
```

- [ ] **Step 2: Update story.graph.ts**

Read `apps/literature-rpg/src/graphs/story.graph.ts` and replace its graph definition with:

```typescript
import { defineGraph } from "@fiction-map/core";
import { registry } from "../project";

export const story = defineGraph(registry, {
  id: "library-mystery",
  nodes: [
    { id: "entrance", type: "scene", title: "Entrance", body: "You stand at the entrance to the old library." },
    { id: "main-hall", type: "scene", title: "Main Hall", body: "Dust motes float in shafts of grey light. A lantern sits on a table." },
    { id: "archives", type: "scene", title: "Dusty Archives", body: "Towering shelves hold forgotten lore. A glowing elixir sits on a pedestal." },
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
      ],
    },
    {
      id: "explore-archives",
      type: "choice",
      source: "main-hall",
      target: "archives",
      text: "Explore the Dusty Archives",
    },
    {
      id: "take-elixir",
      type: "choice",
      source: "archives",
      target: "main-hall",
      text: "Take the elixir and return to the Main Hall",
      effects: [{ type: "grantEntity", entityId: "elixir" }],
    },
    {
      id: "return-from-archives",
      type: "choice",
      source: "archives",
      target: "main-hall",
      text: "Leave the elixir and return to the Main Hall",
    },
    {
      id: "descend",
      type: "choice",
      source: "main-hall",
      target: "dark-chapter",
      text: "Descend into the passage",
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
      id: "cross-bridge",
      type: "choice",
      source: "dark-chapter",
      target: "collapsed-bridge",
      text: "Cross the crumbling bridge",
      effects: [{ type: "spendResource", key: "health", amount: 40 }],
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
      effects: [{ type: "spendResource", key: "health", amount: 30 }],
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
      id: "climb-rubble",
      type: "choice",
      source: "collapsed-bridge",
      target: "forgotten-crypt",
      text: "Climb through the rubble (-20 HP)",
      conditions: [{ type: "resourceAtLeast", key: "health", value: 30 }],
      effects: [{ type: "spendResource", key: "health", amount: 20 }],
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

- [ ] **Step 3: Update main.test.ts**

Read `apps/literature-rpg/src/main.test.ts` and modify the tests to assert the correct traversal path of the expanded story (including the side search through archives to obtain the elixir):

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

  it("defines the lantern grant on the authored graph edge", () => {
    expect(story.edges).toContainEqual(
      expect.objectContaining({
        id: "enter-hall",
        effects: expect.arrayContaining([{ type: "grantEntity", entityId: "lantern" }]),
      })
    );
  });

  it("walks from the entrance to victory through Dusty Archives and Chamber of Runes", () => {
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
Expected: Code compiles, metadata.json and SEMANTICS.md regenerate, and all unit tests pass cleanly.

- [ ] **Step 5: Commit changes**

```bash
git add apps/literature-rpg/src/world.ts apps/literature-rpg/src/graphs/story.graph.ts apps/literature-rpg/src/main.test.ts
git commit -m "feat(rpg): expand world items and graph branches, updating test paths"
```

---

### Task 2: Implement TUI Game Status HUD

**Files:**
- Modify: `apps/literature-rpg/src/main.ts` (integrate health and item HUD inside the play loop).

- [ ] **Step 1: Write TUI HUD loop**

Read `apps/literature-rpg/src/main.ts` and locate the node-traversal loop around line 45. Add the HP/Inventory status bar text into the scene notes:

```typescript
    // Inside while(true) loop of playInteractive() in main.ts, around line 46:
    const hp = state.entityState?.resources?.health ?? 0;
    const inventory = Array.from(context.derivedState.ownedEntityIds);
    let hudText = `❤️ Health: ${hp} HP`;
    if (inventory.length > 0) {
      hudText += ` | 🎒 Items: ${inventory.join(", ")}`;
    }
    
    note(body + `\n\n${pc.dim(hudText)}`, title);
```

- [ ] **Step 2: Build and run typechecks**

Run: `bun run build && bun run typecheck`
Expected: Success

- [ ] **Step 3: Commit changes**

```bash
git add apps/literature-rpg/src/main.ts
git commit -m "feat(rpg): add dynamic status HUD to terminal game"
```

---

### Task 3: Implement Web RPG Health Bar Component

**Files:**
- Modify: `apps/literature-rpg-web/src/App.tsx` (add responsive Tailwind v4 HP bar).

- [ ] **Step 1: Implement visual HP bar inside App.tsx**

Read `apps/literature-rpg-web/src/App.tsx` and integrate the health status bar and game-over conditional screens:

```typescript
import { useStoryRuntime } from "./hooks/useStoryRuntime";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

function App() {
  const { currentNode, availableChoices, step, reset, context, state } = useStoryRuntime();

  if (!currentNode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100">
          <CardContent className="pt-6">
            <h1 className="text-xl text-red-400">Error: Node not found</h1>
            <Button onClick={reset} className="mt-4">Restart</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get dynamic state variables
  const health = state.entityState?.resources?.health ?? 0;
  const isDead = health <= 0 && state.currentNodeId !== "entrance";

  // Figure out what we have active from the derived state (e.g. 'lantern')
  const inventory = Array.from(context.derivedState.ownedEntityIds);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      
      {/* Dynamic RPG HUD Status Bar */}
      {state.currentNodeId !== "entrance" && (
        <div className="w-full max-w-lg mb-4 flex justify-between items-center bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-3 w-1/2">
            <span className="text-red-500 font-bold shrink-0">❤️ {health} HP</span>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
              ></div>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {inventory.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Inventory empty</span>
            ) : (
              inventory.map(item => {
                const icon = item === "lantern" ? "🔦" : item === "elixir" ? "🧪" : "🔑";
                return (
                  <Badge key={item} variant="secondary" className="bg-amber-900/60 text-amber-100 hover:bg-amber-800 shrink-0 border border-amber-800/40">
                    {icon} {item}
                  </Badge>
                );
              })
            )}
          </div>
        </div>
      )}

      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-200">
            {isDead ? "💀 Defeat!" : ((currentNode.properties as any)?.title ?? currentNode.id)}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <p className="text-slate-400 leading-relaxed text-lg">
            {isDead 
              ? "You have succumbed to your wounds inside the library passage. Your vision fades into cold darkness..." 
              : ((currentNode.properties as any)?.body as string)}
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-6 border-t border-slate-800 mt-4">
          {isDead || availableChoices.length === 0 ? (
            <div className="w-full text-center space-y-4">
              <div className="text-emerald-400 text-lg font-semibold">
                {isDead ? "💥 GAME OVER 💥" : "✨ You have reached the end. ✨"}
              </div>
              <Button onClick={reset} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3">
                Play Again
              </Button>
            </div>
          ) : (
            availableChoices.map((choice) => {
              const label = choice.label ?? (choice.metadata as any)?.text ?? choice.id;
              return (
                <Button 
                  key={choice.id} 
                  onClick={() => step(choice)}
                  className="w-full justify-start text-left h-auto py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-800 hover:border-slate-700 transition"
                >
                  <span className="mr-2 text-slate-500">➤</span> {label}
                </Button>
              );
            })
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Build the web bundle**

Run: `bun run build`
Expected: Web compiles cleanly under Vite with zero typescript, build, or Tailwind errors.

- [ ] **Step 3: Commit changes**

```bash
git add apps/literature-rpg-web/src/App.tsx
git commit -m "feat(web): add responsive HP bar and game over HUD to RPG interface"
```
