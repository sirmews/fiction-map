import { beforeEach, describe, expect, it } from "vitest";
import {
  clearEntityTypes,
  clearWorlds,
  defineEntityType,
  defineWorld,
} from "@fiction-map/entities";
import {
  activateEntity,
  createInitialState,
  deriveEntityState,
  grantEntity,
  unlockEntity,
} from "../index";

describe("deriveEntityState", () => {
  beforeEach(() => {
    clearEntityTypes();
    clearWorlds();
  });

  it("reports owned, active, unlocked, and effective entity ids", () => {
    defineEntityType({ id: "item" });
    defineEntityType({ id: "trait" });
    defineEntityType({ id: "location" });

    const world = defineWorld({
      id: "test-world",
      entities: [
        { id: "lantern", type: "item", unlocks: ["dark-cave"] },
        { id: "night-vision", type: "trait" },
        { id: "dark-cave", type: "location" },
        { id: "old-road", type: "location" },
      ],
    });

    let state = createInitialState("start");
    state = grantEntity(state, "lantern");
    state = activateEntity(state, "night-vision");
    state = unlockEntity(state, "old-road");

    const derived = deriveEntityState(world, state);

    expect(derived.ownedEntityIds).toEqual(new Set(["lantern"]));
    expect(derived.activeEntityIds).toEqual(new Set(["night-vision"]));
    expect(derived.unlockedEntityIds).toEqual(new Set(["old-road", "dark-cave"]));
    expect(derived.effectiveEntityIds).toEqual(
      new Set(["lantern", "night-vision", "old-road", "dark-cave"])
    );
  });

  it("collects modifiers from active entities", () => {
    defineEntityType({ id: "trait" });

    const world = defineWorld({
      id: "test-world",
      entities: [
        {
          id: "night-vision",
          type: "trait",
          modifiers: [
            { target: "senses.darkness", operation: "add", value: 2 },
          ],
        },
        {
          id: "unused-trait",
          type: "trait",
          modifiers: [
            { target: "senses.noise", operation: "add", value: 1 },
          ],
        },
      ],
    });

    let state = createInitialState("start");
    state = activateEntity(state, "night-vision");

    const derived = deriveEntityState(world, state);

    expect(derived.activeModifiers).toEqual([
      {
        sourceEntityId: "night-vision",
        modifier: { target: "senses.darkness", operation: "add", value: 2 },
      },
    ]);
  });

  it("identifies satisfied and unsatisfied entity prerequisites", () => {
    defineEntityType({ id: "item" });
    defineEntityType({ id: "location" });

    const world = defineWorld({
      id: "test-world",
      entities: [
        { id: "lantern", type: "item" },
        { id: "silver-key", type: "item" },
        {
          id: "dark-cave",
          type: "location",
          prerequisites: [
            { kind: "entity", target: "lantern", operator: "has" },
          ],
        },
        {
          id: "silver-gate",
          type: "location",
          prerequisites: [
            { kind: "entity", target: "silver-key", operator: "has" },
          ],
        },
      ],
    });

    const state = grantEntity(createInitialState("start"), "lantern");
    const derived = deriveEntityState(world, state);

    expect(derived.prerequisites).toContainEqual({
      entityId: "dark-cave",
      prerequisite: { kind: "entity", target: "lantern", operator: "has" },
      satisfied: true,
    });
    expect(derived.prerequisites).toContainEqual({
      entityId: "silver-gate",
      prerequisite: { kind: "entity", target: "silver-key", operator: "has" },
      satisfied: false,
    });
  });
});
