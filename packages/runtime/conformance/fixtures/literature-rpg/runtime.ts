/**
 * Self-contained fixture mirroring the Literature RPG consumer app's
 * runtime and world, so engine conformance suites do not compile against
 * `apps/literature-rpg` source.
 *
 * - `story.blueprint.json` is a snapshot of
 *   `graphDefinitionToBlueprint(story)` where `story` is
 *   `apps/literature-rpg/src/graphs/story.graph.ts`.
 * - `world` mirrors `apps/literature-rpg/src/world.ts` (entity types
 *   `item`/`spell` and the `library` world) on its own registry.
 * - `runtime` mirrors `apps/literature-rpg/src/main.ts`: the graph runtime
 *   plus its five global triggers. `createRuntimeFromGraph(story)` is
 *   exactly `new GraphRuntime(graphDefinitionToBlueprint(story))`, and the
 *   app's `registerBuiltins(registry)` call does not affect the runtime,
 *   which uses the builtin evaluator/handler maps by default.
 *
 * If the app's story graph, world, or triggers change, regenerate the
 * snapshot and re-sync this file; the cutover contract's `expected.json`
 * will flag behavioral drift.
 */

import { readFileSync } from "node:fs"
import { defineEntityType, defineWorld, EntityRegistry } from "@fiction-map/entities"
import { type GraphBlueprint, GraphRuntime } from "@fiction-map/runtime"

const blueprint = JSON.parse(
  readFileSync(new URL("./story.blueprint.json", import.meta.url), "utf8"),
) as GraphBlueprint

const registry = new EntityRegistry()

defineEntityType(registry, {
  id: "item",
  properties: {
    label: { type: "string", required: true },
  },
})

defineEntityType(registry, {
  id: "spell",
  properties: {
    label: { type: "string", required: true },
    manaCost: { type: "number", required: true },
  },
})

export const world = defineWorld(registry, {
  id: "library",
  entities: [
    { id: "lantern", type: "item", label: "Brass Lantern" },
    { id: "elixir", type: "item", label: "Healing Elixir" },
    { id: "key", type: "item", label: "Casket Key" },
    { id: "lockpick", type: "item", label: "Lockpick" },
    { id: "obsidian-key", type: "item", label: "Obsidian Key" },
    { id: "silver-shield", type: "item", label: "Silver Shield" },
    { id: "spirit-elixir", type: "item", label: "Spirit Elixir" },
    { id: "rune-of-water", type: "item", label: "Rune of Water" },
    { id: "heal-spell", type: "spell", label: "Heal", manaCost: 20 },
    { id: "mage-light", type: "spell", label: "Mage Light", manaCost: 15 },
  ],
})

export const storyBlueprint = blueprint

export const runtime = new GraphRuntime(blueprint)

// Global triggers, copied verbatim from apps/literature-rpg/src/main.ts.
runtime.addTrigger({
  id: "turn-counter-trigger",
  conditions: [],
  effects: [{ type: "addResource", key: "turns", amount: 1 }],
})

runtime.addTrigger({
  id: "cavern-collapse-trigger",
  conditions: [{ type: "resourceAtLeast", key: "turns", value: 11 }],
  effects: [{ type: "spendResource", key: "health", amount: 25, clampToZero: true }],
})

runtime.addTrigger({
  id: "death-trigger",
  conditions: [{ type: "resourceLessThan", key: "health", value: 1 }],
  effects: [{ type: "navigate", nodeId: "death" }],
})

runtime.addTrigger({
  id: "mana-regen-trigger",
  conditions: [{ type: "resourceLessThan", key: "mana", value: 50 }],
  effects: [{ type: "addResource", key: "mana", amount: 5 }],
})

runtime.addTrigger({
  id: "cooldown-tick-trigger",
  conditions: [{ type: "resourceAtLeast", key: "heal_cooldown", value: 1 }],
  effects: [{ type: "spendResource", key: "heal_cooldown", amount: 1, clampToZero: true }],
})
