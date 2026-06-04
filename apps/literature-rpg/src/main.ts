/**
 * Runtime entry point for the literature-rpg consumer app.
 *
 * Builds a `GraphRuntime` from the authored graph in `graphs/story.graph.ts`,
 * walks from the entrance to the dark chapter, and prints each transition.
 * Granting the lantern at the main hall unlocks the gated `descend` choice.
 */

import * as readline from "readline";
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

export async function playInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => rl.question(prompt, resolve));
  };

  let state = createInitialState(runtime.parsed.startNodeId);
  console.log("\n============================================");
  console.log("Welcome to Fiction Map: Literature RPG");
  console.log("============================================\n");

  while (true) {
    // 1. Recompute context
    const context = { derivedState: deriveEntityState(world, state) };

    // 2. Display the current node
    const currentNode = runtime.parsed.nodes.get(state.currentNodeId);
    if (!currentNode) {
      console.error(`\n❌ Error: Node '${state.currentNodeId}' not found.`);
      break;
    }

    console.log(`\n--- ${currentNode.title ?? currentNode.id} ---`);
    if (currentNode.body) {
      console.log(`${currentNode.body}\n`);
    }

    // 3. Find available choices
    const available = runtime.getAvailable(state, context);
    
    if (available.length === 0) {
      console.log("\n[ The End ]");
      break;
    }

    // 4. Present choices
    for (let i = 0; i < available.length; i++) {
      const choice = available[i];
      // Type-cast to extract text safely based on our app's 'choice' schema
      const label = choice.label ?? (choice.metadata as any)?.text ?? choice.id;
      console.log(`  ${i + 1}. ${label}`);
    }

    // 5. Ask for input
    const answer = await question("\nWhat do you do? (number or 'q' to quit) > ");
    
    if (answer.toLowerCase() === "q" || answer.toLowerCase() === "quit") {
      console.log("\nThanks for playing!");
      break;
    }

    const choiceIndex = parseInt(answer, 10) - 1;
    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= available.length) {
      console.log("\nInvalid choice. Please pick a number from the list.");
      continue;
    }

    const selectedChoice = available[choiceIndex];
    console.log(`\n>> You chose: ${selectedChoice.label ?? (selectedChoice.metadata as any)?.text ?? selectedChoice.id}\n`);

    // 6. Transition state
    const result = runtime.step(state, selectedChoice, context);
    if (!result.success) {
      console.error("\n❌ Engine Error: Transition failed despite being available.", result.failureReason);
      break;
    }

    state = result.state;
  }

  rl.close();
}

// Only run when invoked directly (not when imported by tests).
if ((import.meta as { main?: boolean }).main) {
  if (world.errors.length > 0) {
    console.error("World definition has errors. Exiting.", world.errors);
    process.exit(1);
  }
  
  await playInteractive();
}
