import { defineStruct } from "@fiction-map/core"
import { registry } from "../project"

export const LootEntry = defineStruct(registry, {
  id: "loot-entry",
  properties: {
    itemId: { type: "string", required: true },
    dropChance: { type: "number", required: true },
  },
})
