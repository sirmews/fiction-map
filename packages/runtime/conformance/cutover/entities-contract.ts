import assert from "node:assert/strict"
import { defineEntityType, defineWorld, EntityRegistry } from "@fiction-map/entities"
import {
  createInitialState,
  deriveEntityState,
  validateEntityTransitionReferences,
} from "@fiction-map/runtime"

export function checkEntitiesContract() {
  const registry = new EntityRegistry()
  defineEntityType(registry, { id: "item" })
  const world = defineWorld(registry, {
    id: "contract",
    entities: [
      { id: "start", type: "item", unlocks: ["second", "extra"] },
      { id: "second", type: "item", unlocks: ["third", "start"] },
      { id: "third", type: "item" },
      { id: "extra", type: "item" },
      {
        id: "active",
        type: "item",
        modifiers: [{ target: "health", operation: "add", value: 3 }],
        prerequisites: [{ kind: "entity", target: "third", operator: "has" }],
      },
    ],
  })
  const state = createInitialState("start", undefined, undefined, {
    owned: new Set(["start", "missing"]),
    active: new Set(["active", "missing"]),
    unlocked: new Set(["explicit"]),
    resources: {},
  })
  const derived = deriveEntityState(world, state)
  assert.deepEqual(
    [...derived.effectiveEntityIds],
    ["start", "missing", "active", "explicit", "second", "extra", "third"],
  )
  assert.deepEqual([...derived.unlockedEntityIds], ["explicit", "second", "extra", "third"])
  assert.deepEqual([...derived.missingEntityIds], ["missing", "explicit"])
  assert.deepEqual([...state.entityState!.unlocked], ["explicit"])
  assert.equal(derived.activeModifiers[0].modifier, world.entities[4].modifiers?.[0])
  assert.equal(derived.prerequisites[0].prerequisite, world.entities[4].prerequisites?.[0])
  assert.equal(derived.prerequisites[0].satisfied, true)

  const { valid, errors } = validateEntityTransitionReferences(
    [
      {
        id: "main",
        sourceNodeId: "start",
        requirements: {
          all: [
            { type: "hasEntity", entityId: "a" },
            { type: "hasEntity", entityId: "active" },
          ],
          any: [{ type: "entityActive", entityId: "b" }],
          none: [{ type: "entityUnlocked", entityId: "c" }],
        },
        visibility: { all: [{ type: "hasEntity", entityId: "d" }] },
        effects: [
          { type: "grantEntity", entityId: "e" },
          { type: "grantEntity", entityId: 5 },
        ],
        failureEffects: [{ type: "revokeEntity", entityId: "f" }],
      },
      { id: "next", sourceNodeId: "start", effects: [{ type: "lockEntity", entityId: "g" }] },
    ],
    world,
  )
  assert.equal(valid, false)
  assert.deepEqual(
    errors.map((error) => [error.transitionId, error.source, error.entityId, error.message]),
    [
      [
        "main",
        "condition",
        "a",
        "Transition 'main' condition 'hasEntity' references unknown entity 'a'",
      ],
      [
        "main",
        "condition",
        "b",
        "Transition 'main' condition 'entityActive' references unknown entity 'b'",
      ],
      [
        "main",
        "condition",
        "c",
        "Transition 'main' condition 'entityUnlocked' references unknown entity 'c'",
      ],
      [
        "main",
        "condition",
        "d",
        "Transition 'main' condition 'hasEntity' references unknown entity 'd'",
      ],
      [
        "main",
        "effect",
        "e",
        "Transition 'main' effect 'grantEntity' references unknown entity 'e'",
      ],
      [
        "main",
        "failureEffect",
        "f",
        "Transition 'main' failure effect 'revokeEntity' references unknown entity 'f'",
      ],
      [
        "next",
        "effect",
        "g",
        "Transition 'next' effect 'lockEntity' references unknown entity 'g'",
      ],
    ],
  )
}
