/**
 * Shared registry for the literature-rpg consumer app.
 *
 * `EntityRegistry` extends `ProjectRegistry`, so a single registry holds
 * node types, edge types, condition definitions, effect definitions,
 * entity types, and the world. Every file in this app imports `registry`
 * from here so the CLI's file discovery and the runtime see the same
 * definitions.
 */

import { EntityRegistry } from "@fiction-map/entities"

export const registry: EntityRegistry = new EntityRegistry()
