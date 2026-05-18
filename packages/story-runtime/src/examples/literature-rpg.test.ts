import { beforeEach, describe, expect, it } from "vitest";
import {
  clearEntityTypes,
  clearWorlds,
  defineEntityType,
  defineWorld,
} from "@fiction-map/entities";
import {
  addResource,
  applyTransition,
  builtinEvaluators,
  builtinHandlers,
  checkTransitionAvailability,
  createInitialState,
  deriveEntityState,
  entityIsUnlocked,
  getResource,
  grantEntity,
  ownsEntity,
  unlockEntity,
  validateEntityTransitionReferences,
  type Transition,
} from "../index";

describe("literature RPG example", () => {
  beforeEach(() => {
    clearEntityTypes();
    clearWorlds();
  });

  it("proves a consumer-defined world can gate and update story traversal", () => {
    defineEntityType({
      id: "stat",
      properties: {
        label: { type: "string", required: true },
      },
    });
    defineEntityType({
      id: "trait",
      properties: {
        label: { type: "string", required: true },
      },
    });
    defineEntityType({
      id: "species",
      properties: {
        label: { type: "string", required: true },
      },
      references: {
        baseStats: { to: ["stat"], multiple: true, required: true },
        grants: { to: ["trait"], multiple: true },
      },
    });
    defineEntityType({
      id: "item",
      properties: {
        label: { type: "string", required: true },
      },
      references: {
        grants: { to: ["trait"], multiple: true },
      },
    });
    defineEntityType({
      id: "location",
      properties: {
        label: { type: "string", required: true },
      },
    });

    const world = defineWorld({
      id: "moonlit-forest",
      entities: [
        { id: "dexterity", type: "stat", label: "Dexterity" },
        {
          id: "night-vision",
          type: "trait",
          label: "Night Vision",
          modifiers: [
            { target: "senses.darkness", operation: "add", value: 2 },
          ],
        },
        {
          id: "elf",
          type: "species",
          label: "Elf",
          references: {
            baseStats: ["dexterity"],
            grants: ["night-vision"],
          },
          unlocks: ["night-vision"],
        },
        {
          id: "lantern",
          type: "item",
          label: "Lantern",
          references: {
            grants: ["night-vision"],
          },
          unlocks: ["dark-cave"],
        },
        {
          id: "dark-cave",
          type: "location",
          label: "Dark Cave",
          prerequisites: [
            { kind: "entity", target: "lantern", operator: "has" },
          ],
        },
      ],
    });

    const transitions: Transition[] = [
      {
        id: "enter-dark-cave",
        sourceNodeId: "forest-edge",
        targetNodeId: "dark-cave",
        visibility: {
          all: [{ type: "entityUnlocked", entityId: "dark-cave" }],
        },
        requirements: {
          all: [
            { type: "hasEntity", entityId: "lantern" },
            { type: "resourceAtLeast", key: "stamina", value: 3 },
          ],
        },
        effects: [
          { type: "spendResource", key: "stamina", amount: 3 },
          { type: "grantEntity", entityId: "night-vision" },
        ],
      },
    ];

    expect(world.errors).toHaveLength(0);
    expect(validateEntityTransitionReferences(transitions, world)).toEqual({
      valid: true,
      errors: [],
    });

    let state = createInitialState("forest-edge");
    state = grantEntity(state, "elf");
    state = grantEntity(state, "lantern");
    state = addResource(state, "stamina", 5);

    const derivedBefore = deriveEntityState(world, state);

    expect(derivedBefore.effectiveEntityIds).toEqual(
      new Set(["elf", "lantern", "night-vision", "dark-cave"])
    );
    expect(derivedBefore.activeModifiers).toEqual([]);
    expect(derivedBefore.prerequisites).toContainEqual({
      entityId: "dark-cave",
      prerequisite: { kind: "entity", target: "lantern", operator: "has" },
      satisfied: true,
    });

    expect(
      checkTransitionAvailability(state, transitions[0], builtinEvaluators)
        .failedConditions
    ).toEqual([
      {
        scope: "visibility",
        group: "all",
        condition: { type: "entityUnlocked", entityId: "dark-cave" },
      },
    ]);

    state = unlockEntity(state, "dark-cave");

    const availability = checkTransitionAvailability(
      state,
      transitions[0],
      builtinEvaluators
    );

    expect(availability).toEqual({ allowed: true, visible: true });

    const result = applyTransition(
      state,
      transitions[0],
      builtinEvaluators,
      builtinHandlers
    );

    expect(result.success).toBe(true);
    expect(result.state.currentNodeId).toBe("dark-cave");
    expect(getResource(result.state, "stamina")).toBe(2);
    expect(ownsEntity(result.state, "night-vision")).toBe(true);
    expect(entityIsUnlocked(result.state, "dark-cave")).toBe(true);

    const invalidTransitions: Transition[] = [
      {
        id: "bad-reference",
        sourceNodeId: "forest-edge",
        targetNodeId: "dark-cave",
        requirements: {
          all: [{ type: "hasEntity", entityId: "missing-relic" }],
        },
      },
    ];

    expect(
      validateEntityTransitionReferences(invalidTransitions, world).errors
    ).toContainEqual(
      expect.objectContaining({
        type: "unknown-entity-reference",
        transitionId: "bad-reference",
        conditionType: "hasEntity",
        entityId: "missing-relic",
      })
    );
  });
});
