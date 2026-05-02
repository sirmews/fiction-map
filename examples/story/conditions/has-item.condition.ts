import { defineCondition } from "@fiction-map/core"

/**
 * @description Check if player has an item
 */
export const HasItemCondition = defineCondition({
  id: "has-item",
  parameters: {
    itemId: { type: "string", required: true },
  },
})
