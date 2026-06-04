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
        effects: [{ type: "grantEntity", entityId: "lantern" }],
      })
    );
  });

  it("builds runtime transitions with the lantern grant effect", () => {
    expect(runtime.parsed.transitions).toContainEqual(
      expect.objectContaining({
        id: "enter-hall",
        effects: [{ type: "grantEntity", entityId: "lantern" }],
      })
    );
  });

  it("walks from the entrance through the gated descent", () => {
    const visited: string[] = [runtime.parsed.startNodeId];
    
    const steps = runtime.walkWithContext(
      createInitialState(runtime.parsed.startNodeId), 
      (currentState) => ({ derivedState: deriveEntityState(world, currentState) })
    );

    for (const step of steps) {
      if (step.applied) {
        visited.push(step.state.currentNodeId);
      }
    }

    expect(visited).toEqual(["entrance", "main-hall", "dark-chapter"]);
  });
});
