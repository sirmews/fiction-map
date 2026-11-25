//! Derive and validate entity state using the consumer's live JavaScript values.
use crate::js_util::{items, nullish};
use crate::wasm::{JsResult, get, record};
use js_sys::{Array, Map, Set};
use wasm_bindgen::prelude::*;

fn initial_members(entities: &JsValue, field: &str) -> Result<Set, JsValue> {
    if nullish(entities) {
        return Ok(Set::new_empty());
    }
    let members = get(entities, field)?;
    if nullish(&members) {
        return Ok(Set::new_empty());
    }
    Set::new_from_iterable(members.unchecked_into::<Array>())
}

fn entity_index(entities: &JsValue) -> Result<Map, JsValue> {
    let index = Map::new();
    for entity in items(entities)? {
        let entity = entity?;
        index.set(&get(&entity, "id")?, &entity);
    }
    Ok(index)
}

fn apply_unlocks(index: &Map, effective: &Set, unlocked: &Set) -> Result<(), JsValue> {
    loop {
        let mut changed = false;
        // A JS Set iterator observes IDs appended during this pass.
        for entity_id in items(effective.as_ref())? {
            let entity = index.get(&entity_id?);
            if nullish(&entity) {
                continue;
            }
            let unlocks = get(&entity, "unlocks")?;
            if unlocks.is_falsy() {
                continue;
            }
            for unlock in items(&unlocks)? {
                let unlock = unlock?;
                if !effective.has(&unlock) {
                    effective.add(&unlock);
                    unlocked.add(&unlock);
                    changed = true;
                }
            }
        }
        if !changed {
            return Ok(());
        }
    }
}

fn active_modifiers(index: &Map, active: &Set) -> Result<Array, JsValue> {
    let result = Array::new();
    for id in items(active.as_ref())? {
        let id = id?;
        let entity = index.get(&id);
        if nullish(&entity) {
            continue;
        }
        let modifiers = get(&entity, "modifiers")?;
        if modifiers.is_falsy() {
            continue;
        }
        for modifier in items(&modifiers)? {
            result.push(&record(&[
                ("sourceEntityId", &id),
                ("modifier", &modifier?),
            ])?);
        }
    }
    Ok(result)
}

fn prerequisites(entities: &JsValue, effective: &Set) -> Result<Array, JsValue> {
    let result = Array::new();
    for entity in items(entities)? {
        let entity = entity?;
        let entity_prerequisites = get(&entity, "prerequisites")?;
        if nullish(&entity_prerequisites) {
            continue;
        }
        for prerequisite in items(&entity_prerequisites)? {
            let prerequisite = prerequisite?;
            let entity_id = get(&entity, "id")?;
            let satisfied = get(&prerequisite, "kind")? == "entity"
                && get(&prerequisite, "operator")? == "has"
                && effective.has(&get(&prerequisite, "target")?);
            result.push(&record(&[
                ("entityId", &entity_id),
                ("prerequisite", &prerequisite),
                ("satisfied", &JsValue::from(satisfied)),
            ])?);
        }
    }
    Ok(result)
}

#[wasm_bindgen(js_name = deriveEntityState)]
pub fn derive_entity_state(world: &JsValue, state: &JsValue) -> JsResult {
    let index = entity_index(&get(world, "entities")?)?;
    let entities = get(state, "entityState")?;
    let owned = initial_members(&entities, "owned")?;
    let active = initial_members(&entities, "active")?;
    let unlocked = initial_members(&entities, "unlocked")?;
    let effective = Set::new_empty();
    for group in [&owned, &active, &unlocked] {
        for id in items(group.as_ref())? {
            effective.add(&id?);
        }
    }

    apply_unlocks(&index, &effective, &unlocked)?;

    let modifiers = active_modifiers(&index, &active)?;
    let prerequisites = prerequisites(&get(world, "entities")?, &effective)?;

    let missing = Set::new_empty();
    for group in [&owned, &active, &unlocked] {
        for id in items(group.as_ref())? {
            let id = id?;
            if !index.has(&id) {
                missing.add(&id);
            }
        }
    }

    record(&[
        ("ownedEntityIds", owned.as_ref()),
        ("activeEntityIds", active.as_ref()),
        ("unlockedEntityIds", unlocked.as_ref()),
        ("effectiveEntityIds", effective.as_ref()),
        ("activeModifiers", modifiers.as_ref()),
        ("prerequisites", prerequisites.as_ref()),
        ("missingEntityIds", missing.as_ref()),
    ])
}

#[derive(Clone, Copy)]
enum Source {
    Condition,
    Effect,
    FailureEffect,
}

impl Source {
    fn matches(self, value: &JsValue) -> bool {
        let types: &[&str] = match self {
            Self::Condition => &["hasEntity", "entityActive", "entityUnlocked"],
            Self::Effect | Self::FailureEffect => &[
                "grantEntity",
                "revokeEntity",
                "activateEntity",
                "deactivateEntity",
                "unlockEntity",
                "lockEntity",
            ],
        };
        types.iter().any(|kind| value == kind)
    }

    fn fields(self) -> (&'static str, &'static str, &'static str) {
        match self {
            Self::Condition => ("condition", "conditionType", "' condition '"),
            Self::Effect => ("effect", "effectType", "' effect '"),
            Self::FailureEffect => ("failureEffect", "effectType", "' failure effect '"),
        }
    }
}

fn validate_references(
    references: &JsValue,
    transition: &JsValue,
    source: Source,
    index: &Map,
    errors: &Array,
) -> Result<(), JsValue> {
    for reference in items(references)? {
        let reference = reference?;
        let kind = get(&reference, "type")?;
        if !source.matches(&kind) {
            continue;
        }
        let id = get(&reference, "entityId")?;
        if !id.is_string() || index.has(&id) {
            continue;
        }
        let (name, type_field, label) = source.fields();
        let transition_id = get(transition, "id")?;
        let message = JsValue::from_str("Transition '")
            + &transition_id
            + JsValue::from_str(label)
            + &kind
            + JsValue::from_str("' references unknown entity '")
            + &id
            + JsValue::from_str("'");
        errors.push(&record(&[
            ("type", &JsValue::from_str("unknown-entity-reference")),
            ("transitionId", &transition_id),
            ("source", &JsValue::from_str(name)),
            (type_field, &kind),
            ("entityId", &id),
            ("message", &message),
        ])?);
    }
    Ok(())
}

#[wasm_bindgen(js_name = validateEntityTransitionReferences)]
pub fn validate_entity_transition_references(transitions: &JsValue, world: &JsValue) -> JsResult {
    let index = entity_index(&get(world, "entities")?)?;
    let errors = Array::new();
    for transition in items(transitions)? {
        let transition = transition?;
        for field in ["requirements", "visibility"] {
            let conditions = get(&transition, field)?;
            if conditions.is_falsy() {
                continue;
            }
            for group in ["all", "any", "none"] {
                let group = get(&conditions, group)?;
                if !nullish(&group) {
                    validate_references(&group, &transition, Source::Condition, &index, &errors)?;
                }
            }
        }
        for (field, source) in [
            ("effects", Source::Effect),
            ("failureEffects", Source::FailureEffect),
        ] {
            let effects = get(&transition, field)?;
            if effects.is_truthy() {
                validate_references(&effects, &transition, source, &index, &errors)?;
            }
        }
    }
    record(&[
        ("valid", &JsValue::from(errors.length() == 0)),
        ("errors", errors.as_ref()),
    ])
}
