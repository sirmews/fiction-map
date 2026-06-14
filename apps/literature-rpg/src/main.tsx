/**
 * Runtime entry point for the literature-rpg consumer app.
 *
 * Builds a `GraphRuntime` from the authored graph in `graphs/story.graph.ts`
 * and renders a React-based interactive TUI dashboard using Ink.
 */

import React from "react";
import { render } from "ink";
import {
  createRuntimeFromGraph,
  registerBuiltins,
} from "@fiction-map/runtime";
import { story } from "./graphs/story.graph";
import { registry } from "./project";
import { world } from "./world";
import { GameController } from "./components/GameController";

registerBuiltins(registry);

export const runtime = createRuntimeFromGraph(story);

// Global Triggers
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

export async function playInteractive() {
  if (!process.stdin.isTTY) {
    console.error(`
❌ Error: Interactive TUI requires a direct TTY terminal input (Raw Mode).
When running via "bun run --filter", standard input is redirected, which breaks keyboard navigation.

👉 Please run the game directly using either:
   1. bun --cwd apps/literature-rpg start
   2. cd apps/literature-rpg && bun run start
`);
    process.exit(1);
  }

  const { waitUntilExit } = render(<GameController />);
  await waitUntilExit();
}

// Only run when invoked directly
if ((import.meta as { main?: boolean }).main) {
  if (world.errors.length > 0) {
    console.error("World definition has errors. Exiting.", world.errors);
    process.exit(1);
  }
  
  await playInteractive();
}
