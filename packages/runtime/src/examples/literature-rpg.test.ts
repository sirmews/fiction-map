import { defineEntityType, defineWorld, EntityRegistry } from "@fiction-map/entities"
import { beforeEach, describe, expect, it } from "vitest"
import {
  addResource,
  createInitialState,
  deriveEntityState,
  entityIsUnlocked,
  GraphRuntime,
  getResource,
  grantEntity,
  ownsEntity,
  registerBuiltins,
  validateEntityTransitionReferences,
} from "../index"

describe("literature RPG example", () => {
  let registry: EntityRegistry

  beforeEach(() => {
    registry = new EntityRegistry()
    registerBuiltins(registry)
  })

  it("proves a consumer-defined world can gate and update story traversal", () => {
    defineEntityType(registry, {
      id: "stat",
      properties: {
        label: { type: "string", required: true },
      },
    })
    defineEntityType(registry, {
      id: "trait",
      properties: {
        label: { type: "string", required: true },
      },
    })
    defineEntityType(registry, {
      id: "species",
      properties: {
        label: { type: "string", required: true },
      },
      references: {
        baseStats: { to: ["stat"], multiple: true, required: true },
        grants: { to: ["trait"], multiple: true },
      },
    })
    defineEntityType(registry, {
      id: "item",
      properties: {
        label: { type: "string", required: true },
      },
      references: {
        grants: { to: ["trait"], multiple: true },
      },
    })
    defineEntityType(registry, {
      id: "location",
      properties: {
        label: { type: "string", required: true },
      },
    })

    const world = defineWorld(registry, {
      id: "moonlit-forest",
      entities: [
        { id: "dexterity", type: "stat", label: "Dexterity" },
        {
          id: "night-vision",
          type: "trait",
          label: "Night Vision",
          modifiers: [{ target: "senses.darkness", operation: "add", value: 2 }],
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
          prerequisites: [{ kind: "entity", target: "lantern", operator: "has" }],
        },
      ],
    })

    const runtime = new GraphRuntime({
      startNode: "forest-edge",
      nodes: [
        { id: "forest-edge", type: "location" },
        { id: "dark-cave", type: "location" },
      ],
      edges: [
        {
          id: "enter-dark-cave",
          source: "forest-edge",
          target: "dark-cave",
          visibility: [{ type: "entityUnlocked", entityId: "dark-cave" }],
          conditions: [
            { type: "hasEntity", entityId: "lantern" },
            { type: "resourceAtLeast", key: "stamina", value: 3 },
          ],
          effects: [
            { type: "spendResource", key: "stamina", amount: 3 },
            { type: "grantEntity", entityId: "night-vision" },
          ],
        },
      ],
    })

    expect(world.errors).toHaveLength(0)
    expect(validateEntityTransitionReferences(runtime.transitions, world)).toEqual({
      valid: true,
      errors: [],
    })

    let state = createInitialState("forest-edge")
    state = grantEntity(state, "elf")
    state = grantEntity(state, "lantern")
    state = addResource(state, "stamina", 5)

    const derivedBefore = deriveEntityState(world, state)

    expect(derivedBefore.effectiveEntityIds).toEqual(
      new Set(["elf", "lantern", "night-vision", "dark-cave"]),
    )
    expect(derivedBefore.activeModifiers).toEqual([])
    expect(derivedBefore.prerequisites).toContainEqual({
      entityId: "dark-cave",
      prerequisite: { kind: "entity", target: "lantern", operator: "has" },
      satisfied: true,
    })

    // Now the transition should be fully allowed WITHOUT calling unlockEntity manually
    const { available } = runtime.getByAvailability(state, { derivedState: derivedBefore })

    expect(available).toHaveLength(1)
    expect(available[0].id).toBe("enter-dark-cave")

    // Ensure we can apply it
    const result = runtime.step(state, available[0], { derivedState: derivedBefore })

    expect(result.success).toBe(true)
    expect(result.state.currentNodeId).toBe("dark-cave")
    expect(getResource(result.state, "stamina")).toBe(2)
    expect(ownsEntity(result.state, "night-vision")).toBe(true)

    // Notice dark-cave isn't in runtime explicit state, it's just allowed because of derivation
    expect(entityIsUnlocked(result.state, "dark-cave")).toBe(false)

    const invalidRuntime = new GraphRuntime({
      nodes: [{ id: "forest-edge" }, { id: "dark-cave" }],
      edges: [
        {
          id: "bad-reference",
          source: "forest-edge",
          target: "dark-cave",
          conditions: [{ type: "hasEntity", entityId: "missing-relic" }],
        },
      ],
    })

    expect(
      validateEntityTransitionReferences(invalidRuntime.transitions, world).errors,
    ).toContainEqual(
      expect.objectContaining({
        type: "unknown-entity-reference",
        transitionId: "bad-reference",
        conditionType: "hasEntity",
        entityId: "missing-relic",
      }),
    )
  })

  it("executes state triggers reactively during traversal", () => {
    const runtime = new GraphRuntime({
      startNode: "forest-edge",
      nodes: [
        { id: "forest-edge", type: "location" },
        { id: "dark-cave", type: "location" },
      ],
      edges: [
        {
          id: "enter-dark-cave",
          source: "forest-edge",
          target: "dark-cave",
          effects: [{ type: "spendResource", key: "stamina", amount: 3 }],
        },
      ],
    })

    // Add a trigger: if stamina is less than 5, regenerate 1 stamina
    runtime.addTrigger({
      id: "stamina-regen",
      conditions: [{ type: "resourceLessThan", key: "stamina", value: 5 }],
      effects: [{ type: "addResource", key: "stamina", amount: 1 }],
    })

    let state = createInitialState("forest-edge")
    state = addResource(state, "stamina", 5)

    // Initial stamina is 5
    expect(getResource(state, "stamina")).toBe(5)

    // Step: spends 3 stamina (leaves 2).
    // The trigger fires because 2 < 5, adding +1 stamina (final 3)!
    const transition = runtime.transitions.find((t) => t.id === "enter-dark-cave")!
    const result = runtime.step(state, transition)

    expect(result.success).toBe(true)
    expect(result.state.currentNodeId).toBe("dark-cave")
    expect(getResource(result.state, "stamina")).toBe(3) // 5 - 3 + 1 = 3!
  })
})
