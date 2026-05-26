import { describe, expect, it } from "vitest";
import { playOnce } from "./main";
import { world } from "./world";

describe("literature-rpg consumer app", () => {
  it("world has no definition errors", () => {
    expect(world.errors).toEqual([]);
  });

  it("walks from the entrance through the gated descent", () => {
    const { visited, reachedEnding } = playOnce();

    expect(visited).toEqual(["entrance", "main-hall", "dark-chapter"]);
    expect(reachedEnding).toBe(true);
  });
});
