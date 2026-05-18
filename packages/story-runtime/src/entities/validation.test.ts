import { beforeEach, describe, expect, it } from "vitest";
import {
  EntityRegistry,
  defineEntityType,
  defineWorld,
} from "@fiction-map/entities";
import type { Transition } from "../types";
import { validateEntityTransitionReferences } from "./validation";

describe("validateEntityTransitionReferences", () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  it("reports entity-aware conditions that reference unknown entities", () => {
    defineEntityType(registry, { id: "item" });
    const world = defineWorld(registry, {
      id: "test-world",
      entities: [{ id: "lantern", type: "item" }],
    });

    const transitions: Transition[] = [
      {
        id: "enter-cave",
        sourceNodeId: "start",
        targetNodeId: "cave",
        requirements: {
          all: [
            { type: "hasEntity", entityId: "missing-key" },
            { type: "resourceAtLeast", key: "gold", value: 5 },
          ],
        },
      },
    ];

    const result = validateEntityTransitionReferences(transitions, world);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        type: "unknown-entity-reference",
        transitionId: "enter-cave",
        source: "condition",
        conditionType: "hasEntity",
        entityId: "missing-key",
        message:
          "Transition 'enter-cave' condition 'hasEntity' references unknown entity 'missing-key'",
      },
    ]);
  });

  it("reports entity-aware effects that reference unknown entities", () => {
    defineEntityType(registry, { id: "item" });
    const world = defineWorld(registry, {
      id: "test-world",
      entities: [{ id: "lantern", type: "item" }],
    });

    const transitions: Transition[] = [
      {
        id: "take-reward",
        sourceNodeId: "start",
        targetNodeId: "reward",
        effects: [
          { type: "grantEntity", entityId: "silver-key" },
          { type: "addResource", key: "gold", amount: 10 },
        ],
        failureEffects: [{ type: "unlockEntity", entityId: "hidden-door" }],
      },
    ];

    const result = validateEntityTransitionReferences(transitions, world);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        type: "unknown-entity-reference",
        transitionId: "take-reward",
        source: "effect",
        effectType: "grantEntity",
        entityId: "silver-key",
        message:
          "Transition 'take-reward' effect 'grantEntity' references unknown entity 'silver-key'",
      },
      {
        type: "unknown-entity-reference",
        transitionId: "take-reward",
        source: "failureEffect",
        effectType: "unlockEntity",
        entityId: "hidden-door",
        message:
          "Transition 'take-reward' failure effect 'unlockEntity' references unknown entity 'hidden-door'",
      },
    ]);
  });

  it("passes when entity-aware references exist and resources are unconstrained", () => {
    defineEntityType(registry, { id: "item" });
    defineEntityType(registry, { id: "location" });
    const world = defineWorld(registry, {
      id: "test-world",
      entities: [
        { id: "lantern", type: "item" },
        { id: "dark-cave", type: "location" },
      ],
    });

    const transitions: Transition[] = [
      {
        id: "enter-cave",
        sourceNodeId: "start",
        targetNodeId: "cave",
        visibility: {
          all: [{ type: "entityUnlocked", entityId: "dark-cave" }],
        },
        requirements: {
          all: [
            { type: "hasEntity", entityId: "lantern" },
            { type: "resourceAtLeast", key: "gold", value: 5 },
          ],
        },
        effects: [
          { type: "spendResource", key: "gold", amount: 5 },
          { type: "activateEntity", entityId: "lantern" },
        ],
      },
    ];

    const result = validateEntityTransitionReferences(transitions, world);

    expect(result).toEqual({ valid: true, errors: [] });
  });
});

