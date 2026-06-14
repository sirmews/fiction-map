/**
 * Runtime entry point for the literature-rpg consumer app.
 *
 * Builds a `GraphRuntime` from the authored graph in `graphs/story.graph.ts`,
 * walks from the entrance to the dark chapter, and prints each transition.
 * Granting the lantern at the main hall unlocks the gated `descend` choice.
 */

import { intro, outro, select, note, isCancel, spinner } from "@clack/prompts";
import pc from "picocolors";
import {
  createInitialState,
  createRuntimeFromGraph,
  deriveEntityState,
  registerBuiltins,
} from "@fiction-map/runtime";
import { story } from "./graphs/story.graph";
import { registry } from "./project";
import { world } from "./world";

registerBuiltins(registry);

export const runtime = createRuntimeFromGraph(story);

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
  let state = createInitialState(runtime.startNodeId);
  
  console.clear();
  intro(pc.bgMagenta(pc.black(" FICTION MAP : LITERATURE RPG ")));

  while (true) {
    // 1. Recompute context
    const context = { derivedState: deriveEntityState(world, state) };

    // 2. Locate the current node
    const currentNode = story.nodes.find((n) => n.id === state.currentNodeId);
    if (!currentNode) {
      outro(pc.red(`❌ Error: Node '${state.currentNodeId}' not found.`));
      break;
    }

    // 3. Display the scene
    const title = currentNode.title ? pc.cyan(pc.bold(String(currentNode.title))) : pc.cyan(currentNode.id);
    const body = String(currentNode.body || "");
    
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

    note(body + `\n\n${pc.dim(hudText)}`, title);

    // 4. Find available choices
    const available = runtime.getAvailable(state, context);
    
    if (available.length === 0) {
      outro(pc.green("✨ You have reached the end of the story. ✨"));
      break;
    }

    // 5. Present choices with TUI
    const options = available.map((choice) => {
      const label = choice.label ?? (choice.metadata as any)?.text ?? choice.id;
      return { value: choice, label: String(label) };
    });

    const selectedChoice = await select({
      message: "What do you do?",
      options: options,
    });

    if (isCancel(selectedChoice)) {
      outro(pc.yellow("Thanks for playing! (Cancelled)"));
      break;
    }

    // 6. Transition state
    const result = runtime.step(state, selectedChoice as any, context);
    if (!result.success) {
      outro(pc.red(`❌ Engine Error: Transition failed. ${result.failureReason}`));
      break;
    }

    // A tiny simulated delay to make it feel like moving to the next room
    const s = spinner();
    s.start("...");
    await new Promise((resolve) => setTimeout(resolve, 400));
    s.stop(pc.dim(`> ${options.find(o => o.value === selectedChoice)?.label}`));

    state = result.state;
  }
}

// Only run when invoked directly (not when imported by tests).
if ((import.meta as { main?: boolean }).main) {
  if (world.errors.length > 0) {
    console.error("World definition has errors. Exiting.", world.errors);
    process.exit(1);
  }
  
  await playInteractive();
}