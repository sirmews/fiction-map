import { defineEdgeType } from "@fiction-map/core"

/**
 * @description A choice the player can make
 * @ai-rule Choices must have display text
 */
export const ChoiceEdge = defineEdgeType({
  id: "choice",
  properties: {
    text: { type: "string", required: true },
  },
  sourceTypes: ["scene"],
  targetTypes: ["scene"],
})
