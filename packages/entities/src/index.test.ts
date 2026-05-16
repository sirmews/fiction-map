import { beforeEach, describe, expect, it } from "vitest"
import {
  clearEntityTypes,
  clearWorlds,
  defineEntityType,
  defineWorld,
} from "../src"

describe("@fiction-map/entities", () => {
  beforeEach(() => {
    clearEntityTypes()
    clearWorlds()
  })

  describe("defineEntityType", () => {
    it("should define an entity type with typed references", () => {
      const species = defineEntityType({
        id: "species",
        properties: {
          label: { type: "string", required: true },
        },
        references: {
          grants: { to: ["trait"], multiple: true },
          baseStats: { to: ["stat"], multiple: true, required: true },
        },
      })

      expect(species.id).toBe("species")
      expect(species.name).toBe("speciesEntityType")
      expect(species.references.baseStats.to).toEqual(["stat"])
      expect(species.references.baseStats.multiple).toBe(true)
    })

    it("should not allow duplicate entity type ids", () => {
      defineEntityType({ id: "species" })

      expect(() => {
        defineEntityType({ id: "species" })
      }).toThrow("already defined")
    })
  })

  describe("defineWorld", () => {
    it("should define a valid world with typed entity references", () => {
      defineEntityType({
        id: "stat",
        properties: {
          label: { type: "string", required: true },
        },
      })
      defineEntityType({
        id: "trait",
        properties: {
          label: { type: "string", required: true },
        },
      })
      defineEntityType({
        id: "species",
        properties: {
          label: { type: "string", required: true },
        },
        references: {
          baseStats: { to: ["stat"], multiple: true, required: true },
          grants: { to: ["trait"], multiple: true },
        },
      })

      const world = defineWorld({
        id: "forest-world",
        entities: [
          { id: "strength", type: "stat", label: "Strength" },
          { id: "night-vision", type: "trait", label: "Night Vision" },
          {
            id: "elf",
            type: "species",
            label: "Elf",
            references: {
              baseStats: ["strength"],
              grants: ["night-vision"],
            },
            modifiers: [
              {
                target: "stats.dexterity",
                operation: "add",
                value: 2,
              },
            ],
            prerequisites: [
              {
                kind: "entity",
                target: "strength",
                operator: "has",
              },
            ],
            unlocks: ["night-vision"],
          },
        ],
      })

      expect(world.entityCount).toBe(3)
      expect(world.entityTypesUsed).toEqual(["species", "stat", "trait"])
      expect(world.errors).toHaveLength(0)
    })

    it("should detect unknown entity types", () => {
      const world = defineWorld({
        id: "test-world",
        entities: [{ id: "elf", type: "species" }],
      })

      expect(world.errors).toContainEqual(
        expect.objectContaining({ code: "UNKNOWN_ENTITY_TYPE" })
      )
    })

    it("should detect missing required properties", () => {
      defineEntityType({
        id: "species",
        properties: {
          label: { type: "string", required: true },
        },
      })

      const world = defineWorld({
        id: "test-world",
        entities: [{ id: "elf", type: "species" }],
      })

      expect(world.errors).toContainEqual(
        expect.objectContaining({ code: "MISSING_REQUIRED_PROPERTY" })
      )
    })

    it("should detect references to unknown entities", () => {
      defineEntityType({ id: "stat" })
      defineEntityType({
        id: "species",
        references: {
          baseStats: { to: ["stat"], multiple: true, required: true },
        },
      })

      const world = defineWorld({
        id: "test-world",
        entities: [
          {
            id: "elf",
            type: "species",
            references: {
              baseStats: ["strength"],
            },
          },
        ],
      })

      expect(world.errors).toContainEqual(
        expect.objectContaining({ code: "UNKNOWN_ENTITY_REFERENCE_TARGET" })
      )
    })

    it("should detect references to entities of the wrong type", () => {
      defineEntityType({ id: "stat" })
      defineEntityType({ id: "trait" })
      defineEntityType({
        id: "species",
        references: {
          baseStats: { to: ["stat"], multiple: true, required: true },
        },
      })

      const world = defineWorld({
        id: "test-world",
        entities: [
          { id: "night-vision", type: "trait" },
          {
            id: "elf",
            type: "species",
            references: {
              baseStats: ["night-vision"],
            },
          },
        ],
      })

      expect(world.errors).toContainEqual(
        expect.objectContaining({ code: "INVALID_ENTITY_REFERENCE_TARGET_TYPE" })
      )
    })

    it("should detect malformed modifiers", () => {
      defineEntityType({ id: "trait" })

      const world = defineWorld({
        id: "test-world",
        entities: [
          {
            id: "night-vision",
            type: "trait",
            modifiers: [
              {
                target: "",
                operation: "add",
                value: 1,
              },
            ],
          },
        ],
      })

      expect(world.errors).toContainEqual(
        expect.objectContaining({ code: "INVALID_MODIFIER" })
      )
    })

    it("should detect unknown entity prerequisite targets", () => {
      defineEntityType({ id: "trait" })

      const world = defineWorld({
        id: "test-world",
        entities: [
          {
            id: "night-vision",
            type: "trait",
            prerequisites: [
              {
                kind: "entity",
                target: "strength",
                operator: "has",
              },
            ],
          },
        ],
      })

      expect(world.errors).toContainEqual(
        expect.objectContaining({ code: "UNKNOWN_PREREQUISITE_TARGET" })
      )
    })

    it("should detect unknown unlock targets", () => {
      defineEntityType({ id: "trait" })

      const world = defineWorld({
        id: "test-world",
        entities: [
          {
            id: "night-vision",
            type: "trait",
            unlocks: ["keen-hearing"],
          },
        ],
      })

      expect(world.errors).toContainEqual(
        expect.objectContaining({ code: "UNKNOWN_UNLOCK_TARGET" })
      )
    })
  })
})
