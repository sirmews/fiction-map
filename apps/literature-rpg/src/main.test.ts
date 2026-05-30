import { describe, expect, it } from "vitest";
import { playOnce, runtime } from "./main";
import { story } from "./graphs/story.graph";
import { world } from "./world";

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
    expect(runtime.transitions).toContainEqual(
      expect.objectContaining({
        id: "enter-hall",
        effects: [{ type: "grantEntity", entityId: "lantern" }],
      })
    );
  });

  it("walks from the entrance through the gated descent", () => {
    const { visited, reachedEnding } = playOnce();

    expect(visited).toEqual(["entrance", "main-hall", "dark-chapter"]);
    expect(reachedEnding).toBe(true);
  });
});
