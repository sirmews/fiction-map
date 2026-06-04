/**
 * Runtime entry point for the literature-rpg consumer app.
 *
 * Builds a `GraphRuntime` from the authored graph in `graphs/story.graph.ts`,
 * walks from the entrance to the dark chapter, and prints each transition.
 * Granting the lantern at the main hall unlocks the gated `descend` choice.
 */

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

export function playOnce(): { reachedEnding: boolean; visited: string[] } {
  let state = createInitialState(runtime.startNodeId);
  const visited: string[] = [state.currentNodeId];

  const steps = runtime.walkWithContext(state, (currentState) => {
    return { derivedState: deriveEntityState(world, currentState) };
  });

  if (steps.length > 0) {
    // The last step returned gives us the final state.
    // walkWithContext pushes a final "empty available" StepResult if no transitions remain.
    const lastStep = steps[steps.length - 1];
    state = lastStep.state;
    
    // Add visited nodes (skipping the first one as it's already in the array)
    for (const step of steps) {
      if (step.applied) {
        visited.push(step.state.currentNodeId);
      }
    }
  }

  return {
    reachedEnding: state.currentNodeId === "dark-chapter",
    visited,
  };
}

// Only run when invoked directly (not when imported by tests).
// `import.meta.main` is a Bun extension; cast to any to satisfy tsc.
if ((import.meta as { main?: boolean }).main) {
  const result = playOnce();
  console.log("Visited:", result.visited.join(" → "));
  console.log("Reached ending:", result.reachedEnding);
  if (world.errors.length > 0) {
    console.error("World errors:", world.errors);
    process.exit(1);
  }
  process.exit(result.reachedEnding ? 0 : 1);
}
