import { beforeEach, describe, expect, it } from "vitest";
import {
  EntityRegistry,
  defineEntityType,
  defineWorld,
} from "@fiction-map/entities";
import {
  createInitialState,
  grantEntity,
  unlockEntity,
  activateEntity,
} from "../core/state";
import { deriveEntityState } from "./derived";

describe("deriveEntityState", () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  it("reports owned, active, unlocked, and effective entity ids", () => {
    defineEntityType(registry, { id: "stat" });
    defineEntityType(registry, {
      id: "item",
      references: { requiredStats: { to: ["stat"], multiple: true } },
    });

    const world = defineWorld(registry, {
      id: "world",
      entities: [
        { id: "dexterity", type: "stat" },
        { id: "sword", type: "item", unlocks: ["cave"] },
        { id: "cave", type: "item" }, // unlock target
      ],
    });

    let state = createInitialState("start");
    state = unlockEntity(state, "dexterity"); // explicit unlock
    state = grantEntity(state, "sword"); // explicit grant
    state = activateEntity(state, "sword"); // explicit active

    const derived = deriveEntityState(world, state);

    // explicit state mapping
    expect(derived.ownedEntityIds).toEqual(new Set(["sword"]));
    expect(derived.activeEntityIds).toEqual(new Set(["sword"]));
    expect(derived.unlockedEntityIds).toEqual(new Set(["dexterity", "cave"]));

    // explicit state + cascaded unlocks
    expect(derived.effectiveEntityIds).toEqual(
      new Set(["sword", "dexterity", "cave"])
    );
  });

  it("collects modifiers from active entities", () => {
    defineEntityType(registry, { id: "trait" });

    const world = defineWorld(registry, {
      id: "world",
      entities: [
        {
          id: "strong",
          type: "trait",
          modifiers: [
            { target: "stats.strength", operation: "add", value: 5 },
          ],
        },
      ],
    });

    let state = createInitialState("start");
    state = grantEntity(state, "strong");

    const beforeActivate = deriveEntityState(world, state);
    expect(beforeActivate.activeModifiers).toHaveLength(0); // must be active

    state = activateEntity(state, "strong");
    const afterActivate = deriveEntityState(world, state);
    expect(afterActivate.activeModifiers).toContainEqual({
      sourceEntityId: "strong",
      modifier: { target: "stats.strength", operation: "add", value: 5 },
    });
  });

  it("identifies satisfied and unsatisfied entity prerequisites", () => {
    defineEntityType(registry, { id: "location" });
    defineEntityType(registry, { id: "item" });

    const world = defineWorld(registry, {
      id: "world",
      entities: [
        { id: "key", type: "item" },
        {
          id: "locked-door",
          type: "location",
          prerequisites: [
            { kind: "entity", target: "key", operator: "has" },
          ],
        },
      ],
    });

    let state = createInitialState("start");

    const derivedBefore = deriveEntityState(world, state);
    expect(derivedBefore.prerequisites).toContainEqual({
      entityId: "locked-door",
      prerequisite: { kind: "entity", target: "key", operator: "has" },
      satisfied: false, // does not have key yet
    });

    state = grantEntity(state, "key");
    const derivedAfter = deriveEntityState(world, state);
    expect(derivedAfter.prerequisites).toContainEqual({
      entityId: "locked-door",
      prerequisite: { kind: "entity", target: "key", operator: "has" },
      satisfied: true, // now has key
    });
  });
});

