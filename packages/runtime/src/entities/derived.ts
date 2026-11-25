import type { EntityModifier, EntityPrerequisite, WorldDefinition } from "@fiction-map/entities"
import type { GraphRuntimeState } from "../types"
import { wasm } from "../wasm"

export interface ActiveEntityModifier {
  sourceEntityId: string
  modifier: EntityModifier
}

export interface EntityPrerequisiteResult {
  entityId: string
  prerequisite: EntityPrerequisite
  satisfied: boolean
}

export interface DerivedEntityState {
  ownedEntityIds: Set<string>
  activeEntityIds: Set<string>
  unlockedEntityIds: Set<string>
  effectiveEntityIds: Set<string>
  activeModifiers: ActiveEntityModifier[]
  prerequisites: EntityPrerequisiteResult[]
  missingEntityIds: Set<string>
}

export function deriveEntityState(
  world: WorldDefinition,
  state: GraphRuntimeState,
): DerivedEntityState {
  return wasm.deriveEntityState(world, state) as DerivedEntityState
}
