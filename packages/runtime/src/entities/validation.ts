import type { WorldDefinition } from "@fiction-map/entities"
import type { EntityTransitionReferenceValidationResult, Transition } from "../types"
import { wasm } from "../wasm"

export function validateEntityTransitionReferences(
  transitions: Transition[],
  world: WorldDefinition,
): EntityTransitionReferenceValidationResult {
  return wasm.validateEntityTransitionReferences(
    transitions,
    world,
  ) as EntityTransitionReferenceValidationResult
}
