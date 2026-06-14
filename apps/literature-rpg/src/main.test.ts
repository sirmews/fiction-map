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
