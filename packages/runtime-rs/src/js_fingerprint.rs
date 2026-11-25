use js_sys::{Array, JSON, Object, Set};
use wasm_bindgen::{JsCast, prelude::*};

use crate::js_util::{array, items, js_string, method, nullish};
use crate::wasm::{JsResult, get, record};

fn collect_visit_nodes(conditions: &JsValue, nodes: &Set) -> Result<(), JsValue> {
    if conditions.is_undefined() {
        return Ok(());
    }
    for condition in items(conditions)? {
        let condition = condition?;
        let kind = get(&condition, "type")?;
        if kind == "visited" || kind == "notVisited" {
            let node_id = get(&condition, "nodeId")?;
            if node_id.is_string() {
                nodes.add(&node_id);
            }
        }
    }
    Ok(())
}

#[wasm_bindgen(js_name = visitedConditionNodes)]
pub fn visited_condition_nodes(transitions: &JsValue, triggers: &JsValue) -> JsResult {
    let nodes = Set::new(&JsValue::UNDEFINED);
    for transition in items(transitions)? {
        let transition = transition?;
        for scope in ["requirements", "visibility"] {
            let group = get(&transition, scope)?;
            if nullish(&group) {
                continue;
            }
            for name in ["all", "any", "none"] {
                collect_visit_nodes(&get(&group, name)?, &nodes)?;
            }
        }
    }
    for trigger in items(triggers)? {
        collect_visit_nodes(&get(&trigger?, "conditions")?, &nodes)?;
    }
    Ok(Array::from(nodes.as_ref()).into())
}

fn sorted_entries(values: &JsValue, with_type: bool) -> JsResult {
    let keys = Object::keys::<JsValue>(values.unchecked_ref());
    method(keys.as_ref(), "sort", &[])?;
    let result = Array::new();
    for key in keys.iter() {
        let value = js_sys::Reflect::get(values, &key)?;
        let string = js_string(&value)?;
        let tuple = if with_type {
            array([key, value.js_typeof(), string])
        } else {
            array([key, string])
        };
        result.push(tuple.as_ref());
    }
    Ok(result.into())
}

fn sorted_set(entity: &JsValue, key: &str) -> JsResult {
    let values = if nullish(entity) {
        JsValue::UNDEFINED
    } else {
        get(entity, key)?
    };
    let result = if nullish(&values) {
        Array::new()
    } else {
        Array::from(&values)
    };
    method(result.as_ref(), "sort", &[])
}

#[wasm_bindgen(js_name = symbolicFingerprint)]
pub fn fingerprint(state: &JsValue, visit_nodes: &JsValue) -> JsResult {
    let entity = get(state, "entityState")?;
    let resource_map = if nullish(&entity) {
        JsValue::UNDEFINED
    } else {
        get(&entity, "resources")?
    };
    let resource_map = if nullish(&resource_map) {
        Object::new().into()
    } else {
        resource_map
    };
    let node = get(state, "currentNodeId")?;
    let flags = sorted_entries(&get(state, "flags")?, true)?;
    let owned = sorted_set(&entity, "owned")?;
    let active = sorted_set(&entity, "active")?;
    let unlocked = sorted_set(&entity, "unlocked")?;
    let resources = sorted_entries(&resource_map, false)?;
    let variables = sorted_entries(&get(state, "variables")?, false)?;

    let visited = if visit_nodes.is_truthy() {
        let set = get(state, "visited")?;
        let present = Array::new();
        for id in items(visit_nodes)? {
            let id = id?;
            if method(&set, "has", std::slice::from_ref(&id))?.is_truthy() {
                present.push(&id);
            }
        }
        method(present.as_ref(), "sort", &[])?
    } else {
        JsValue::UNDEFINED
    };
    let data = record(&[
        ("node", &node),
        ("flags", &flags),
        ("owned", &owned),
        ("active", &active),
        ("unlocked", &unlocked),
        ("resources", &resources),
        ("variables", &variables),
        ("visited", &visited),
    ])?;
    Ok(JSON::stringify(&data)?.into())
}
