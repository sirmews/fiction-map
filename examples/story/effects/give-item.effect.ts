import { defineEffect } from "@fiction-map/core"

/**
 * @description Give an item to the player
 */
export const GiveItemEffect = defineEffect({
  id: "give-item",
  parameters: {
    itemId: { type: "string", required: true },
    quantity: { type: "number", default: 1 },
  },
})
