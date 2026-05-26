/**
 * World definition: the consumer's domain concepts.
 *
 * For this small demo the world has one item the player can carry
 * (a lantern). Real consumer apps would define stats, traits,
 * species, locations, etc.
 */

import { defineEntityType, defineWorld } from "@fiction-map/entities";
import { registry } from "./project";

defineEntityType(registry, {
  id: "item",
  properties: {
    label: { type: "string", required: true },
  },
});

export const world = defineWorld(registry, {
  id: "library",
  entities: [
    { id: "lantern", type: "item", label: "Brass Lantern" },
  ],
});
