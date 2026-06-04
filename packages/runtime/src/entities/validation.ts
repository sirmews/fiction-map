import type { WorldDefinition } from "@fiction-map/entities";
import type {
  Condition,
  ConditionSet,
  Effect,
  EntityTransitionReferenceError,
  EntityTransitionReferenceValidationResult,
  Transition,
} from "../types";

const ENTITY_CONDITION_TYPES = new Set([
  "hasEntity",
  "entityActive",
  "entityUnlocked",
]);

const ENTITY_EFFECT_TYPES = new Set([
  "grantEntity",
  "revokeEntity",
  "activateEntity",
  "deactivateEntity",
  "unlockEntity",
  "lockEntity",
]);

export function validateEntityTransitionReferences(
  transitions: Transition[],
  world: WorldDefinition
): EntityTransitionReferenceValidationResult {
  const entityIds = new Set(world.entities.map((entity) => entity.id));
  const errors: EntityTransitionReferenceError[] = [];

  for (const transition of transitions) {
    validateConditionSet(transition.requirements, transition, entityIds, errors);
    validateConditionSet(transition.visibility, transition, entityIds, errors);
    validateEffects(transition.effects, transition, "effect", entityIds, errors);
    validateEffects(
      transition.failureEffects,
      transition,
      "failureEffect",
      entityIds,
      errors
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateConditionSet(
  conditionSet: ConditionSet | undefined,
  transition: Transition,
  entityIds: Set<string>,
  errors: EntityTransitionReferenceError[]
): void {
  if (!conditionSet) {
    return;
  }

  for (const condition of [
    ...(conditionSet.all ?? []),
    ...(conditionSet.any ?? []),
    ...(conditionSet.none ?? []),
  ]) {
    validateCondition(condition, transition, entityIds, errors);
  }
}

function validateCondition(
  condition: Condition,
  transition: Transition,
  entityIds: Set<string>,
  errors: EntityTransitionReferenceError[]
): void {
  if (!ENTITY_CONDITION_TYPES.has(condition.type)) {
    return;
  }

  const entityId = condition.entityId;
  if (typeof entityId !== "string" || entityIds.has(entityId)) {
    return;
  }

  errors.push({
    type: "unknown-entity-reference",
    transitionId: transition.id,
    source: "condition",
    conditionType: condition.type,
    entityId,
    message: `Transition '${transition.id}' condition '${condition.type}' references unknown entity '${entityId}'`,
  });
}

function validateEffects(
  effects: Effect[] | undefined,
  transition: Transition,
  source: "effect" | "failureEffect",
  entityIds: Set<string>,
  errors: EntityTransitionReferenceError[]
): void {
  if (!effects) {
    return;
  }

  for (const effect of effects) {
    validateEffect(effect, transition, source, entityIds, errors);
  }
}

function validateEffect(
  effect: Effect,
  transition: Transition,
  source: "effect" | "failureEffect",
  entityIds: Set<string>,
  errors: EntityTransitionReferenceError[]
): void {
  if (!ENTITY_EFFECT_TYPES.has(effect.type)) {
    return;
  }

  const entityId = effect.entityId;
  if (typeof entityId !== "string" || entityIds.has(entityId)) {
    return;
  }

  const sourceLabel = source === "failureEffect" ? "failure effect" : "effect";

  errors.push({
    type: "unknown-entity-reference",
    transitionId: transition.id,
    source,
    effectType: effect.type,
    entityId,
    message: `Transition '${transition.id}' ${sourceLabel} '${effect.type}' references unknown entity '${entityId}'`,
  });
}
