import { defineEdgeType } from "@fiction-map/core"
import { registry } from "../project"

export const ChoiceEdge = defineEdgeType(registry, {
  id: "choice",
  properties: {
    text: { type: "string", required: true },
  },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})
