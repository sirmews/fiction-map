import { defineNodeType } from "@fiction-map/core"
import { registry } from "../project"

export const ChestNode = defineNodeType(registry, {
  id: "chest",
  properties: {
    possibleLoot: { type: "array", items: { type: "struct", structId: "loot-entry" } },
  },
  outgoingEdges: ["choice"],
  incomingEdges: ["choice"],
})
