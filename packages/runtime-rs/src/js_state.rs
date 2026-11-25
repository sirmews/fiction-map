//! State operations on live JS values. State containers are copied, while the
//! values they contain keep their JavaScript identity.
use crate::wasm::{JsResult, get, record, set};
use js_sys::{Array, Function, Object, Reflect, Set};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(inline_js = "
export function copyIterable(value) { return [...value]; }
export function copyOwnEntries(target, source, excluded) {
    const result = target ?? Object.create(null);
    if (source) {
        for (const [key,value] of Object.entries(source)) {
            if (!excluded.has(key)) result[key] = value;
        }
    }
    return result;
}
")]
extern "C" {
    #[wasm_bindgen(catch, js_name = copyOwnEntries)]
    fn copy_own_entries(
        target: &JsValue,
        source: &JsValue,
        excluded: &Set,
    ) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, js_name = copyIterable)]
    fn copy_iterable(value: &JsValue) -> Result<Array, JsValue>;
}

// The native and live hosts exclude the same state keys. This immutable
// binding-owned set is never exposed through the package's public API.
thread_local! {
    static EXCLUDED_KEYS: Set = Set::new_from_items(&crate::state::FORBIDDEN_STATE_KEYS.map(JsValue::from_str));
}

fn forbidden(key: &JsValue) -> bool {
    EXCLUDED_KEYS.with(|excluded| excluded.has(key))
}

fn nullish(value: &JsValue) -> bool {
    value.is_undefined() || value.is_null()
}

fn optional_get(value: &JsValue, key: &str) -> JsResult {
    if nullish(value) {
        return Ok(JsValue::UNDEFINED);
    }
    get(value, key)
}

fn copy_entries(target: &JsValue, source: &JsValue) -> JsResult {
    EXCLUDED_KEYS.with(|excluded| copy_own_entries(target, source, excluded))
}

fn state_map(source: &JsValue) -> JsResult {
    copy_entries(&JsValue::UNDEFINED, source)
}

fn optional_map(source: &JsValue) -> JsResult {
    if source.is_truthy() {
        return state_map(source);
    }
    Ok(JsValue::UNDEFINED)
}

#[derive(Clone, Copy)]
enum Collection {
    Set,
    Array,
}

impl Collection {
    fn copy(self, source: &JsValue) -> JsResult {
        match self {
            Self::Set => {
                if nullish(source) {
                    return Ok(Set::<JsValue>::new_empty().into());
                }
                Ok(Set::new_from_iterable(source.clone().unchecked_into::<Array>())?.into())
            }
            Self::Array => Ok(copy_iterable(source)?.into()),
        }
    }
}

fn entity_snapshot(source: &JsValue, collection: Collection) -> JsResult {
    record(&[
        ("owned", &collection.copy(&get(source, "owned")?)?),
        ("active", &collection.copy(&get(source, "active")?)?),
        ("unlocked", &collection.copy(&get(source, "unlocked")?)?),
        ("resources", &state_map(&get(source, "resources")?)?),
        ("extensions", &optional_map(&get(source, "extensions")?)?),
    ])
}

fn empty_entities() -> JsResult {
    record(&[
        ("owned", Set::<JsValue>::new_empty().as_ref()),
        ("active", Set::<JsValue>::new_empty().as_ref()),
        ("unlocked", Set::<JsValue>::new_empty().as_ref()),
        ("resources", &state_map(&JsValue::UNDEFINED)?),
    ])
}

fn optional_entities(source: &JsValue, collection: Collection) -> JsResult {
    if source.is_truthy() {
        return entity_snapshot(source, collection);
    }
    Ok(JsValue::UNDEFINED)
}

fn state_snapshot(
    source: &JsValue,
    collection: Collection,
    schema_version: Option<&JsValue>,
) -> JsResult {
    let snapshot = if let Some(version) = schema_version {
        record(&[("schemaVersion", version)])?
    } else {
        Object::new().into()
    };

    set(&snapshot, "currentNodeId", &get(source, "currentNodeId")?)?;
    set(
        &snapshot,
        "history",
        copy_iterable(&get(source, "history")?)?.as_ref(),
    )?;
    set(
        &snapshot,
        "variables",
        &state_map(&get(source, "variables")?)?,
    )?;
    set(&snapshot, "flags", &state_map(&get(source, "flags")?)?)?;
    set(
        &snapshot,
        "visited",
        &collection.copy(&get(source, "visited")?)?,
    )?;
    set(
        &snapshot,
        "entityState",
        &optional_entities(&get(source, "entityState")?, collection)?,
    )?;
    set(
        &snapshot,
        "extensions",
        &optional_map(&get(source, "extensions")?)?,
    )?;
    Ok(snapshot)
}

#[wasm_bindgen(js_name = createInitialState)]
pub fn create_initial_state(
    start_node_id: &JsValue,
    variables: &JsValue,
    extensions: &JsValue,
    entities: &JsValue,
) -> JsResult {
    record(&[
        ("currentNodeId", start_node_id),
        ("history", Array::new().as_ref()),
        ("variables", &state_map(variables)?),
        ("flags", &state_map(&JsValue::UNDEFINED)?),
        (
            "visited",
            Set::new_from_items(std::slice::from_ref(start_node_id)).as_ref(),
        ),
        (
            "entityState",
            &optional_entities(entities, Collection::Set)?,
        ),
        ("extensions", &optional_map(extensions)?),
    ])
}

#[wasm_bindgen(js_name = cloneState)]
pub fn clone_state(state: &JsValue) -> JsResult {
    state_snapshot(state, Collection::Set, None)
}

fn update_field(
    snapshot: &JsValue,
    updates: &JsValue,
    key: &str,
    transform: impl FnOnce(&JsValue) -> JsResult,
) -> Result<(), JsValue> {
    let update = get(updates, key)?;
    if !update.is_undefined() {
        set(snapshot, key, &transform(&update)?)?;
    }
    Ok(())
}

#[wasm_bindgen(js_name = mergeState)]
pub fn merge_state(state: &JsValue, updates: &JsValue) -> JsResult {
    let snapshot = clone_state(state)?;
    update_field(&snapshot, updates, "currentNodeId", |value| {
        Ok(value.clone())
    })?;
    update_field(&snapshot, updates, "history", |value| {
        Ok(copy_iterable(value)?.into())
    })?;
    for field in ["variables", "flags"] {
        update_field(&snapshot, updates, field, |value| {
            let map = state_map(&get(&snapshot, field)?)?;
            copy_entries(&map, value)?;
            Ok(map)
        })?;
    }
    update_field(&snapshot, updates, "visited", |value| {
        Collection::Set.copy(value)
    })?;
    update_field(&snapshot, updates, "entityState", |value| {
        entity_snapshot(value, Collection::Set)
    })?;
    update_field(&snapshot, updates, "extensions", |value| {
        let map = state_map(&get(&snapshot, "extensions")?)?;
        copy_entries(&map, value)?;
        Ok(map)
    })?;
    Ok(snapshot)
}

#[wasm_bindgen(js_name = navigateToNode)]
pub fn navigate_to_node(state: &JsValue, node_id: &JsValue) -> JsResult {
    let snapshot = clone_state(state)?;
    get(&snapshot, "history")?
        .unchecked_ref::<Array>()
        .push(&get(&snapshot, "currentNodeId")?);
    set(&snapshot, "currentNodeId", node_id)?;
    get(&snapshot, "visited")?
        .unchecked_ref::<Set>()
        .add(node_id);
    Ok(snapshot)
}

#[wasm_bindgen]
pub fn backtrack(state: &JsValue) -> JsResult {
    if get(&get(state, "history")?, "length")? == 0 {
        return Ok(JsValue::NULL);
    }
    let snapshot = clone_state(state)?;
    let previous = get(&snapshot, "history")?.unchecked_ref::<Array>().pop();
    set(&snapshot, "currentNodeId", &previous)?;
    Ok(snapshot)
}

#[wasm_bindgen(js_name = hasVisited)]
pub fn has_visited(state: &JsValue, node_id: &JsValue) -> Result<bool, JsValue> {
    Ok(get(state, "visited")?.unchecked_ref::<Set>().has(node_id))
}

#[wasm_bindgen(js_name = visitCount)]
pub fn visit_count(state: &JsValue, node_id: &JsValue) -> Result<u32, JsValue> {
    let history = get(state, "history")?;
    let history: &Array = history.unchecked_ref();
    let mut count = u32::from(get(state, "currentNodeId")? == *node_id);
    for index in 0..history.length() {
        let index = JsValue::from(index);
        if Reflect::has(history.as_ref(), &index)?
            && Reflect::get(history.as_ref(), &index)? == *node_id
        {
            count += 1;
        }
    }
    Ok(count)
}

fn state_entry(state: &JsValue, container: &str, key: &JsValue) -> JsResult {
    Reflect::get(&get(state, container)?, key)
}

fn set_state_entry(state: &JsValue, container: &str, key: &JsValue, value: &JsValue) -> JsResult {
    if forbidden(key) {
        return Ok(state.clone());
    }
    let snapshot = clone_state(state)?;
    Reflect::set(&get(&snapshot, container)?, key, value)?;
    Ok(snapshot)
}

#[wasm_bindgen(js_name = setFlag)]
pub fn set_flag(state: &JsValue, key: &JsValue, value: &JsValue) -> JsResult {
    set_state_entry(state, "flags", key, value)
}

#[wasm_bindgen(js_name = clearFlag)]
pub fn clear_flag(state: &JsValue, key: &JsValue) -> JsResult {
    let snapshot = clone_state(state)?;
    Reflect::delete_property(get(&snapshot, "flags")?.unchecked_ref::<Object>(), key)?;
    Ok(snapshot)
}

#[wasm_bindgen(js_name = hasFlag)]
pub fn has_flag(state: &JsValue, key: &JsValue) -> Result<bool, JsValue> {
    Reflect::has(&get(state, "flags")?, key)
}

#[wasm_bindgen(js_name = getFlag)]
pub fn get_flag(state: &JsValue, key: &JsValue) -> JsResult {
    state_entry(state, "flags", key)
}

#[wasm_bindgen(js_name = setVariable)]
pub fn set_variable(state: &JsValue, key: &JsValue, value: &JsValue) -> JsResult {
    set_state_entry(state, "variables", key, value)
}

#[wasm_bindgen(js_name = getVariable)]
pub fn get_variable(state: &JsValue, key: &JsValue) -> JsResult {
    state_entry(state, "variables", key)
}

#[wasm_bindgen(js_name = incrementVariable)]
pub fn increment_variable(state: &JsValue, key: &JsValue, delta: &JsValue) -> JsResult {
    if forbidden(key) {
        return Ok(state.clone());
    }
    let current = get_variable(state, key)?;
    if current.as_f64().is_none() {
        return Ok(state.clone());
    }
    set_variable(state, key, &(&current + delta))
}

fn with_entities(state: &JsValue) -> Result<(JsValue, JsValue), JsValue> {
    let snapshot = clone_state(state)?;
    let mut entities = get(&snapshot, "entityState")?;
    if nullish(&entities) {
        entities = empty_entities()?;
        set(&snapshot, "entityState", &entities)?;
    }
    Ok((snapshot, entities))
}

fn entity_has(state: &JsValue, set_name: &str, id: &JsValue) -> Result<bool, JsValue> {
    let entities = get(state, "entityState")?;
    if nullish(&entities) {
        return Ok(false);
    }
    Ok(get(&entities, set_name)?.unchecked_ref::<Set>().has(id))
}

fn modify_entities(state: &JsValue, set_name: &str, id: &JsValue, add: bool) -> JsResult {
    let (snapshot, entities) = with_entities(state)?;
    let members = get(&entities, set_name)?;
    let members: &Set = members.unchecked_ref();
    if add {
        members.add(id);
    } else {
        members.delete(id);
    }
    Ok(snapshot)
}

#[wasm_bindgen(js_name = grantEntity)]
pub fn grant_entity(state: &JsValue, id: &JsValue) -> JsResult {
    modify_entities(state, "owned", id, true)
}

#[wasm_bindgen(js_name = revokeEntity)]
pub fn revoke_entity(state: &JsValue, id: &JsValue) -> JsResult {
    modify_entities(state, "owned", id, false)
}

#[wasm_bindgen(js_name = ownsEntity)]
pub fn owns_entity(state: &JsValue, id: &JsValue) -> Result<bool, JsValue> {
    entity_has(state, "owned", id)
}

#[wasm_bindgen(js_name = activateEntity)]
pub fn activate_entity(state: &JsValue, id: &JsValue) -> JsResult {
    modify_entities(state, "active", id, true)
}

#[wasm_bindgen(js_name = deactivateEntity)]
pub fn deactivate_entity(state: &JsValue, id: &JsValue) -> JsResult {
    modify_entities(state, "active", id, false)
}

#[wasm_bindgen(js_name = entityIsActive)]
pub fn entity_is_active(state: &JsValue, id: &JsValue) -> Result<bool, JsValue> {
    entity_has(state, "active", id)
}

#[wasm_bindgen(js_name = unlockEntity)]
pub fn unlock_entity(state: &JsValue, id: &JsValue) -> JsResult {
    modify_entities(state, "unlocked", id, true)
}

#[wasm_bindgen(js_name = lockEntity)]
pub fn lock_entity(state: &JsValue, id: &JsValue) -> JsResult {
    modify_entities(state, "unlocked", id, false)
}

#[wasm_bindgen(js_name = entityIsUnlocked)]
pub fn entity_is_unlocked(state: &JsValue, id: &JsValue) -> Result<bool, JsValue> {
    entity_has(state, "unlocked", id)
}

fn resource(resources: &JsValue, key: &JsValue) -> JsResult {
    let value = Reflect::get(resources, key)?;
    if nullish(&value) {
        return Ok(JsValue::from(0));
    }
    Ok(value)
}

#[wasm_bindgen(js_name = addResource)]
pub fn add_resource(state: &JsValue, key: &JsValue, amount: &JsValue) -> JsResult {
    let Some(credit) = amount
        .as_f64()
        .and_then(crate::effects::ResourceAmount::credit)
    else {
        return Ok(state.clone());
    };
    if forbidden(key) {
        return Ok(state.clone());
    }
    let (snapshot, entities) = with_entities(state)?;
    let resources = get(&entities, "resources")?;
    let current = resource(&resources, key)?;
    let next = if let Some(current) = current.as_f64() {
        credit.add_to(current).into()
    } else {
        &current + amount
    };
    Reflect::set(&resources, key, &next)?;
    Ok(snapshot)
}

#[wasm_bindgen(js_name = spendResource)]
pub fn spend_resource(
    state: &JsValue,
    key: &JsValue,
    amount: &JsValue,
    options: &JsValue,
) -> JsResult {
    if forbidden(key) {
        return Ok(state.clone());
    }
    let current = get_resource(state, key)?;
    let Some(debit) = amount
        .as_f64()
        .and_then(crate::effects::ResourceAmount::debit)
    else {
        return Ok(state.clone());
    };
    let options = crate::effects::SpendOptions {
        allow_negative: optional_get(options, "allowNegative")?.is_truthy(),
        clamp_to_zero: optional_get(options, "clampToZero")?.is_truthy(),
    };
    if let Some(current) = current.as_f64() {
        let Some(next) = debit.spend_from(current, options) else {
            return Ok(state.clone());
        };
        let (snapshot, entities) = with_entities(state)?;
        Reflect::set(&get(&entities, "resources")?, key, &next.into())?;
        return Ok(snapshot);
    }
    // Opaque host values can run user coercion hooks. Keep the original
    // comparison before cloning and subtraction after it.
    if !options.permits(current.lt(amount)) {
        return Ok(state.clone());
    }
    let (snapshot, entities) = with_entities(state)?;
    let difference = (&current - amount).as_f64().unwrap_or(f64::NAN);
    Reflect::set(
        &get(&entities, "resources")?,
        key,
        &options.balance(difference).into(),
    )?;
    Ok(snapshot)
}

#[wasm_bindgen(js_name = getResource)]
pub fn get_resource(state: &JsValue, key: &JsValue) -> JsResult {
    let entities = get(state, "entityState")?;
    if nullish(&entities) {
        return Ok(JsValue::from(0));
    }
    resource(&get(&entities, "resources")?, key)
}

#[wasm_bindgen(js_name = serializeState)]
pub fn serialize_state(state: &JsValue, schema_version: &JsValue) -> JsResult {
    state_snapshot(state, Collection::Array, Some(schema_version))
}

#[wasm_bindgen(js_name = deserializeState)]
pub fn deserialize_state(
    data: &JsValue,
    schema_version: &JsValue,
    make_error: &Function,
) -> JsResult {
    let actual_version = get(data, "schemaVersion")?;
    if actual_version != *schema_version {
        return Err(make_error.call1(&JsValue::UNDEFINED, &actual_version)?);
    }
    state_snapshot(data, Collection::Set, None)
}
