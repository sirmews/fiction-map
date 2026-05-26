/**
 * Runtime entry point for the literature-rpg consumer app.
 *
 * Builds a `GraphRuntime` over the same scenes defined in
 * `graphs/story.graph.ts`, walks from the entrance to the dark chapter,
 * and prints each transition. Granting the lantern at the main hall
 * unlocks the gated `descend` choice.
 *
 * NOTE: the runtime takes a blueprint shape (id/source/target/
 * conditions/effects) that is not the same shape as the `defineGraph`
 * output. See NOTES.md item 1.
 */

import {
  GraphRuntime,
  createInitialState,
  deriveEntityState,
  registerBuiltins,
} from "@fiction-map/runtime";
import { registry } from "./project";
import { world } from "./world";

registerBuiltins(registry);

export const runtime = new GraphRuntime({
  startNode: "entrance",
  nodes: [
    { id: "entrance", type: "scene" },
    { id: "main-hall", type: "scene" },
    { id: "dark-chapter", type: "scene" },
  ],
  edges: [
    {
      id: "enter-hall",
      source: "entrance",
      target: "main-hall",
      effects: [{ type: "grantEntity", entityId: "lantern" }],
    },
    {
      id: "descend",
      source: "main-hall",
      target: "dark-chapter",
      conditions: [{ type: "hasEntity", entityId: "lantern" }],
    },
  ],
});

export function playOnce(): { reachedEnding: boolean; visited: string[] } {
  let state = createInitialState("entrance");
  const visited: string[] = [state.currentNodeId];

  while (true) {
    const derivedState = deriveEntityState(world, state);
    const { available } = runtime.getByAvailability(state, { derivedState });
    if (available.length === 0) break;

    const choice = available[0];
    const result = runtime.step(state, choice, { derivedState });
    if (!result.success) break;

    state = result.state;
    visited.push(state.currentNodeId);
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
