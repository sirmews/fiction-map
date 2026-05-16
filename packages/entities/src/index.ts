/**
 * Fiction Map — Entities
 *
 * A generic entity meta-model for consumer-defined world concepts.
 */

export * from "./types"
export {
  defineEntityType,
  getEntityTypes,
  getEntityType,
  clearEntityTypes,
} from "./entity-type"
export {
  defineWorld,
  getWorlds,
  getWorld,
  clearWorlds,
  generateEntityMetadata,
} from "./world"
