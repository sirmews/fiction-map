import { defineEntityType, defineWorld } from "@fiction-map/entities";
import { registry } from "./project";

defineEntityType(registry, {
  id: "item",
  properties: {
    label: { type: "string", required: true },
  },
});

defineEntityType(registry, {
  id: "spell",
  properties: {
    label: { type: "string", required: true },
    manaCost: { type: "number", required: true },
  },
});

export const world = defineWorld(registry, {
  id: "library",
  entities: [
    { id: "lantern", type: "item", label: "Brass Lantern" },
    { id: "elixir", type: "item", label: "Healing Elixir" },
    { id: "key", type: "item", label: "Casket Key" },
    { id: "lockpick", type: "item", label: "Lockpick" },
    { id: "heal-spell", type: "spell", label: "Heal", manaCost: 20 },
    { id: "mage-light", type: "spell", label: "Mage Light", manaCost: 15 },
  ],
});
