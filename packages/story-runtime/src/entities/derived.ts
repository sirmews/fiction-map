import type {
  EntityInstance,
  EntityModifier,
  EntityPrerequisite,
  WorldDefinition,
} from "@fiction-map/entities";
import type { GraphRuntimeState } from "../types";

export interface ActiveEntityModifier {
  sourceEntityId: string;
  modifier: EntityModifier;
}

export interface EntityPrerequisiteResult {
  entityId: string;
  prerequisite: EntityPrerequisite;
  satisfied: boolean;
}

export interface DerivedEntityState {
  ownedEntityIds: Set<string>;
  activeEntityIds: Set<string>;
  unlockedEntityIds: Set<string>;
  effectiveEntityIds: Set<string>;
  activeModifiers: ActiveEntityModifier[];
  prerequisites: EntityPrerequisiteResult[];
  missingEntityIds: Set<string>;
}

export function deriveEntityState(
  world: WorldDefinition,
  state: GraphRuntimeState
): DerivedEntityState {
  const entityIndex = new Map(world.entities.map((entity) => [entity.id, entity]));
  const ownedEntityIds = new Set(state.entityState?.owned ?? []);
  const activeEntityIds = new Set(state.entityState?.active ?? []);
  const unlockedEntityIds = new Set(state.entityState?.unlocked ?? []);
  const effectiveEntityIds = new Set([
    ...ownedEntityIds,
    ...activeEntityIds,
    ...unlockedEntityIds,
  ]);

  applyUnlocks(entityIndex, effectiveEntityIds, unlockedEntityIds);

  return {
    ownedEntityIds,
    activeEntityIds,
    unlockedEntityIds,
    effectiveEntityIds,
    activeModifiers: collectActiveModifiers(entityIndex, activeEntityIds),
    prerequisites: collectPrerequisites(world.entities, effectiveEntityIds),
    missingEntityIds: collectMissingEntityIds(entityIndex, [
      ...ownedEntityIds,
      ...activeEntityIds,
      ...unlockedEntityIds,
    ]),
  };
}

function applyUnlocks(
  entityIndex: Map<string, EntityInstance>,
  effectiveEntityIds: Set<string>,
  unlockedEntityIds: Set<string>
): void {
  let changed = true;

  while (changed) {
    changed = false;

    for (const entityId of effectiveEntityIds) {
      const entity = entityIndex.get(entityId);
      if (!entity?.unlocks) {
        continue;
      }

      for (const unlockedId of entity.unlocks) {
        if (!effectiveEntityIds.has(unlockedId)) {
          effectiveEntityIds.add(unlockedId);
          unlockedEntityIds.add(unlockedId);
          changed = true;
        }
      }
    }
  }
}

function collectActiveModifiers(
  entityIndex: Map<string, EntityInstance>,
  activeEntityIds: Set<string>
): ActiveEntityModifier[] {
  const modifiers: ActiveEntityModifier[] = [];

  for (const entityId of activeEntityIds) {
    const entity = entityIndex.get(entityId);
    if (!entity?.modifiers) {
      continue;
    }

    for (const modifier of entity.modifiers) {
      modifiers.push({ sourceEntityId: entityId, modifier });
    }
  }

  return modifiers;
}

function collectPrerequisites(
  entities: EntityInstance[],
  effectiveEntityIds: Set<string>
): EntityPrerequisiteResult[] {
  return entities.flatMap((entity) =>
    (entity.prerequisites ?? []).map((prerequisite) => ({
      entityId: entity.id,
      prerequisite,
      satisfied: prerequisiteIsSatisfied(prerequisite, effectiveEntityIds),
    }))
  );
}

function prerequisiteIsSatisfied(
  prerequisite: EntityPrerequisite,
  effectiveEntityIds: Set<string>
): boolean {
  if (prerequisite.kind === "entity" && prerequisite.operator === "has") {
    return effectiveEntityIds.has(prerequisite.target);
  }

  return false;
}

function collectMissingEntityIds(
  entityIndex: Map<string, EntityInstance>,
  entityIds: string[]
): Set<string> {
  return new Set(entityIds.filter((entityId) => !entityIndex.has(entityId)));
}
