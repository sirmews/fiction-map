use std::collections::{HashSet, VecDeque};

use js_sys::{Array, Set};
use wasm_bindgen::prelude::*;

use crate::js_entities::derive_entity_state;
use crate::js_runtime::{fingerprint_text, runtime_visit_nodes};
use crate::js_state::create_initial_state;
use crate::js_util::{array, host_text, items, method, nullish, text};
use crate::validation::{
    TransitionEndpoints, has_dangling_transitions, terminal_nodes, validate_graph,
};
use crate::wasm::{JsResult, get, record, set};

struct Edge {
    id: String,
    source: String,
    target: Option<String>,
    failure: Option<String>,
}

impl Edge {
    fn endpoints(&self) -> TransitionEndpoints<'_> {
        TransitionEndpoints {
            id: &self.id,
            source: &self.source,
            target: self.target.as_deref(),
            failure_target: self.failure.as_deref(),
        }
    }
}

fn edges(transitions: &JsValue) -> Result<Vec<Edge>, JsValue> {
    items(transitions)?
        .map(|value| {
            let value = value?;
            Ok(Edge {
                id: text(&get(&value, "id")?)?,
                source: text(&get(&value, "sourceNodeId")?)?,
                target: optional_text(&get(&value, "targetNodeId")?)?,
                failure: optional_text(&get(&value, "failureTargetNodeId")?)?,
            })
        })
        .collect()
}

// Undefined targets are omitted. A null or other non-string target is outside
// the TypeScript transition interface, but retains the JS string conversion.
fn optional_text(value: &JsValue) -> Result<Option<String>, JsValue> {
    if value.is_undefined() {
        Ok(None)
    } else {
        Ok(Some(text(value)?))
    }
}

fn read_ids(values: &JsValue) -> Result<Vec<String>, JsValue> {
    items(values)?.map(|value| text(&value?)).collect()
}

/// Read an optional string option, treating null and undefined as absent so
/// the caller's default applies, matching JavaScript `??` semantics.
fn option_text(options: &JsValue, key: &str, default: &str) -> Result<String, JsValue> {
    let value = get(options, key)?;
    if nullish(&value) {
        Ok(default.to_string())
    } else {
        text(&value)
    }
}

#[wasm_bindgen(js_name = inferEndingNodes)]
pub fn endings(nodes: &JsValue, transitions: &JsValue, skip_first: bool) -> JsResult {
    let nodes = read_ids(nodes)?;
    let sources: Vec<String> = items(transitions)?
        .map(|edge| text(&get(&edge?, "sourceNodeId")?))
        .collect::<Result<_, _>>()?;
    let excluded = if skip_first {
        nodes.first().map(String::as_str)
    } else {
        None
    };
    let endings = terminal_nodes(
        nodes.iter().map(String::as_str),
        sources.iter().map(String::as_str),
        excluded,
    );
    Ok(array(endings.into_iter().map(host_text)).into())
}

#[wasm_bindgen(js_name = validateGraph)]
pub fn graph(nodes: &JsValue, transitions: &JsValue, start: &JsValue) -> JsResult {
    let ids = read_ids(&method(nodes, "keys", &[])?)?;
    let ids: Vec<_> = ids.iter().map(String::as_str).collect();
    let start = optional_text(start)?;
    let edges = edges(transitions)?;
    let endpoints: Vec<_> = edges.iter().map(Edge::endpoints).collect();
    let validation = validate_graph(&ids, &endpoints, start.as_deref());
    let errors = Array::new();
    for error in &validation.errors {
        let entry = record(&[("type", &JsValue::from_str(error.kind))])?;
        if let Some(transition) = error.transition_id {
            set(&entry, "transitionId", &host_text(transition))?;
        }
        if error.kind == "missing-start-node" {
            let value = error.node_id.map(host_text).unwrap_or(JsValue::UNDEFINED);
            set(&entry, "nodeId", &value)?;
        } else if let Some(node) = error.node_id {
            set(&entry, "nodeId", &host_text(node))?;
        }
        set(&entry, "message", &host_text(&error.message))?;
        errors.push(&entry);
    }
    let reachable = array(validation.reachable_nodes.into_iter().map(host_text));
    record(&[
        ("valid", &JsValue::from_bool(errors.length() == 0)),
        ("errors", errors.as_ref()),
        ("reachableNodes", Set::new(reachable.as_ref()).as_ref()),
    ])
}

#[wasm_bindgen(js_name = hasDanglingTransitions)]
pub fn dangling(transitions: &JsValue, nodes: &JsValue) -> Result<bool, JsValue> {
    let ids = read_ids(nodes)?;
    let ids: Vec<_> = ids.iter().map(String::as_str).collect();
    let edges = edges(transitions)?;
    let endpoints: Vec<_> = edges.iter().map(Edge::endpoints).collect();
    Ok(has_dangling_transitions(&endpoints, &ids))
}

struct PendingPath {
    state: JsValue,
    edges: Vec<JsValue>,
    nodes: Vec<JsValue>,
}

#[wasm_bindgen(js_name = solveGraphSemantics)]
pub fn solve(runtime: &JsValue, world: &JsValue, options: &JsValue) -> JsResult {
    let max_steps = get(options, "maxSteps")?.as_f64().unwrap_or(100.0);
    // Consumer vocabulary: which node id counts as a loss, which
    // entityState.resources attribute tracks survival, and the value assumed
    // for that attribute when absent. Defaults preserve the original
    // Literature-RPG semantics ("death" / "health" / 100).
    let death_node = option_text(options, "deathNodeId", "death")?;
    let resource_key = option_text(options, "resourceKey", "health")?;
    let resource_default = get(options, "defaultResourceValue")?
        .as_f64()
        .unwrap_or(100.0);
    let start = get(runtime, "startNodeId")?;
    let state = create_initial_state(
        &start,
        &JsValue::UNDEFINED,
        &JsValue::UNDEFINED,
        &JsValue::UNDEFINED,
    )?;
    let visit_nodes = runtime_visit_nodes(runtime)?;
    let mut seen = HashSet::from([fingerprint_text(&state, &visit_nodes)?]);
    let mut pending = VecDeque::from([PendingPath {
        state,
        edges: Vec::new(),
        nodes: vec![start],
    }]);
    let mut iterations = 0.0;
    let mut wins = 0.0;
    let errors = Array::new();

    while iterations < max_steps {
        let Some(PendingPath {
            state,
            edges,
            nodes,
        }) = pending.pop_front()
        else {
            break;
        };
        iterations += 1.0;
        let current = get(&state, "currentNodeId")?;
        if method(runtime, "isEnding", std::slice::from_ref(&current))?.is_truthy() {
            if text(&current)? != death_node {
                wins += 1.0;
            }
            continue;
        }

        let context = record(&[("derivedState", &derive_entity_state(world, &state)?)])?;
        let available = method(runtime, "getAvailable", &[state.clone(), context.clone()])?;
        if get(&available, "length")?.as_f64() == Some(0.0) {
            let label = text(&current)?;
            errors.push(&semantic_error(
                "dead-end-node",
                &current,
                &format!("Player is trapped at node '{label}'. Outgoing choices exist but none are available under the current state."),
                &edges,
            )?);
            continue;
        }

        for transition in items(&available)? {
            let transition = transition?;
            let result = method(
                runtime,
                "step",
                &[state.clone(), transition.clone(), context.clone()],
            )?;
            let next_state = get(&result, "state")?;
            if !get(&result, "success")?.is_truthy() || !next_state.is_truthy() {
                continue;
            }

            let next = get(&next_state, "currentNodeId")?;
            let next_health = health(&next_state, &resource_key)?;
            let id = get(&transition, "id")?;
            let mut next_edges = edges.clone();
            next_edges.push(id.clone());

            if next_health.as_f64().is_some_and(|value| value <= 0.0)
                || text(&next)? == death_node
            {
                let label = text(&next)?;
                let id = text(&id)?;
                errors.push(&semantic_error(
                    "unwinnable-path",
                    &next,
                    &format!("Player died at node '{label}' after taking transition '{id}'."),
                    &next_edges,
                )?);
                continue;
            }

            if nodes.contains(&next) {
                let before = health(&state, &resource_key)?
                    .as_f64()
                    .unwrap_or(resource_default);
                let after = next_health.as_f64().unwrap_or(resource_default);
                if after < before {
                    let label = text(&next)?;
                    let before = ryu_js::Buffer::new().format(before).to_owned();
                    let after = ryu_js::Buffer::new().format(after).to_owned();
                    errors.push(&semantic_error(
                        "infinite-drain-loop", &next,
                        &format!("Infinite resource-draining loop detected at node '{label}'. Health decreased from {before} to {after}."),
                        &next_edges,
                    )?);
                    continue;
                }
            }

            if seen.insert(fingerprint_text(&next_state, &visit_nodes)?) {
                let mut next_nodes = nodes.clone();
                next_nodes.push(next);
                pending.push_back(PendingPath {
                    state: next_state,
                    edges: next_edges,
                    nodes: next_nodes,
                });
            }
        }
    }

    record(&[
        ("valid", &JsValue::from_bool(errors.length() == 0)),
        ("errors", errors.as_ref()),
        ("winnablePathsCount", &JsValue::from_f64(wins)),
    ])
}

fn health(state: &JsValue, key: &str) -> JsResult {
    let entity = get(state, "entityState")?;
    if nullish(&entity) {
        return Ok(JsValue::UNDEFINED);
    }
    let resources = get(&entity, "resources")?;
    if nullish(&resources) {
        return Ok(JsValue::UNDEFINED);
    }
    get(&resources, key)
}

fn semantic_error(category: &str, node: &JsValue, message: &str, path: &[JsValue]) -> JsResult {
    record(&[
        ("type", &JsValue::from_str(category)),
        ("nodeId", node),
        ("message", &host_text(message)),
        ("path", array(path.iter().cloned()).as_ref()),
    ])
}
