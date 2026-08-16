use std::collections::BTreeMap;

use crate::blueprint::Condition;
use crate::state::RuntimeState;

/// Which state fields a condition evaluator reads. Used to build a sound
/// fingerprint projection — mirrors the TS `ConditionEvaluator.reads`
/// declaration. Two states that differ only in fields NO reachable condition
/// reads are pruned as equivalent; two that differ in a read field are not.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum StateField {
    CurrentNode,
    Flags,
    Variables,
    Visited,
    History,
    EntityOwned,
    EntityActive,
    EntityUnlocked,
    EntityResources,
}

/// Evaluate a condition against a state. Returns `true` if the condition is
/// satisfied.
pub fn evaluate(state: &RuntimeState, cond: &Condition) -> bool {
    match cond.r#type.as_str() {
        "visited" => {
            let node = cond.params.get("nodeId").and_then(|v| v.as_str());
            match node {
                Some(n) => state.visited.contains(n),
                None => false,
            }
        }
        "notVisited" => {
            let node = cond.params.get("nodeId").and_then(|v| v.as_str());
            match node {
                Some(n) => !state.visited.contains(n),
                None => false,
            }
        }
        "hasFlag" => {
            let key = cond.params.get("key").and_then(|v| v.as_str());
            match key {
                Some(k) => state.flags.contains_key(k),
                None => false,
            }
        }
        "notFlag" => {
            let key = cond.params.get("key").and_then(|v| v.as_str());
            match key {
                Some(k) => !state.flags.contains_key(k) || {
                    state.flags.get(k).and_then(|v| v.as_bool()).unwrap_or(false) == false
                },
                None => false,
            }
        }
        "flagEquals" => {
            let key = cond.params.get("key").and_then(|v| v.as_str());
            let value = cond.params.get("value");
            match (key, value) {
                (Some(k), Some(v)) => state.flags.get(k).map_or(false, |fv| fv == v),
                _ => false,
            }
        }
        "currentNode" => {
            let node = cond.params.get("nodeId").and_then(|v| v.as_str());
            match node {
                Some(n) => state.current_node == n,
                None => false,
            }
        }
        "hasVariable" => {
            let key = cond.params.get("key").and_then(|v| v.as_str());
            match key {
                Some(k) => state.variables.contains_key(k),
                None => false,
            }
        }
        "equals" => {
            let key = cond.params.get("key").and_then(|v| v.as_str());
            let value = cond.params.get("value");
            match (key, value) {
                (Some(k), Some(v)) => state.variables.get(k).map_or(false, |fv| fv == v),
                _ => false,
            }
        }
        "notEquals" => {
            let key = cond.params.get("key").and_then(|v| v.as_str());
            let value = cond.params.get("value");
            match (key, value) {
                (Some(k), Some(v)) => state.variables.get(k).map_or(false, |fv| fv != v),
                _ => false,
            }
        }
        "greaterThan"
        | "greaterThanOrEqual"
        | "lessThan"
        | "lessThanOrEqual" => evaluate_numeric(state, cond),
        // Entity-aware evaluators
        "hasEntity" => {
            let e = cond.params.get("entityId").and_then(|v| v.as_str());
            match e {
                Some(id) => state
                    .entity_state
                    .as_ref()
                    .map_or(false, |es| es.owned.contains(id)),
                None => false,
            }
        }
        "entityActive" => {
            let e = cond.params.get("entityId").and_then(|v| v.as_str());
            match e {
                Some(id) => state
                    .entity_state
                    .as_ref()
                    .map_or(false, |es| es.active.contains(id)),
                None => false,
            }
        }
        "entityUnlocked" => {
            let e = cond.params.get("entityId").and_then(|v| v.as_str());
            match e {
                Some(id) => state
                    .entity_state
                    .as_ref()
                    .map_or(false, |es| es.unlocked.contains(id)),
                None => false,
            }
        }
        "resourceAtLeast" => {
            let key = cond.params.get("key").and_then(|v| v.as_str());
            let value = cond.params.get("value").and_then(|v| v.as_f64());
            match (key, value) {
                (Some(k), Some(v)) => state
                    .entity_state
                    .as_ref()
                    .map_or(false, |es| es.resources.get(k).map_or(false, |r| *r >= v)),
                _ => false,
            }
        }
        "resourceLessThan" => {
            let key = cond.params.get("key").and_then(|v| v.as_str());
            let value = cond.params.get("value").and_then(|v| v.as_f64());
            match (key, value) {
                (Some(k), Some(v)) => state
                    .entity_state
                    .as_ref()
                    .map_or(false, |es| es.resources.get(k).map_or(false, |r| *r < v)),
                _ => false,
            }
        }
        other => {
            eprintln!("warning: unknown condition type '{}', evaluating false", other);
            false
        }
    }
}

fn evaluate_numeric(state: &RuntimeState, cond: &Condition) -> bool {
    let key = cond.params.get("key").and_then(|v| v.as_str());
    let value = cond.params.get("value").and_then(|v| v.as_f64());
    let current = key.and_then(|k| state.variables.get(k)).and_then(|v| v.as_f64());
    match (current, value) {
        (Some(cur), Some(val)) => match cond.r#type.as_str() {
            "greaterThan" => cur > val,
            "greaterThanOrEqual" => cur >= val,
            "lessThan" => cur < val,
            "lessThanOrEqual" => cur <= val,
            _ => false,
        },
        _ => false,
    }
}

/// Declare which fields a condition type reads. Mirrors the TS
/// `ConditionEvaluator.reads` so the fingerprint projection is sound.
pub fn reads(condition_type: &str) -> &'static [StateField] {
    match condition_type {
        "visited" | "notVisited" => &[StateField::Visited],
        "hasFlag" | "notFlag" | "flagEquals" => &[StateField::Flags],
        "currentNode" => &[StateField::CurrentNode],
        "hasVariable" | "equals" | "notEquals" => &[StateField::Variables],
        "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual" => {
            &[StateField::Variables]
        }
        "hasEntity" => &[StateField::EntityOwned],
        "entityActive" => &[StateField::EntityActive],
        "entityUnlocked" => &[StateField::EntityUnlocked],
        "resourceAtLeast" | "resourceLessThan" => &[StateField::EntityResources],
        _ => &[],
    }
}

/// Evaluate a `ConditionSet` (all/any/none) against a state.
pub fn evaluate_set(state: &RuntimeState, set: &ConditionSet) -> bool {
    let all = set.all.as_ref().map_or(true, |conds| {
        conds.iter().all(|c| evaluate(state, c))
    });
    if !all {
        return false;
    }
    let any = set
        .any
        .as_ref()
        .map_or(true, |conds| conds.iter().any(|c| evaluate(state, c)));
    if !any {
        return false;
    }
    let none = set
        .none
        .as_ref()
        .map_or(true, |conds| !conds.iter().any(|c| evaluate(state, c)));
    none
}

#[derive(Debug, Clone, Default)]
pub struct ConditionSet {
    pub all: Option<Vec<Condition>>,
    pub any: Option<Vec<Condition>>,
    pub none: Option<Vec<Condition>>,
}

/// Compute the fingerprint projection from the condition types used by a
/// graph's transitions + triggers. Mirrors the TS
/// `GraphRuntime.computeProjection()`.
pub fn compute_projection(used_condition_types: &std::collections::HashSet<String>) -> std::collections::HashSet<StateField> {
    let mut fields = std::collections::HashSet::new();
    fields.insert(StateField::CurrentNode);
    for t in used_condition_types {
        for f in reads(t) {
            fields.insert(*f);
        }
    }
    fields
}

/// Whether cycle pruning is enabled. Disabled when any used condition reads
/// `history` (unbounded), matching the TS `pruneEnabled` gate.
pub fn prune_enabled(projection: &std::collections::HashSet<StateField>) -> bool {
    !projection.contains(&StateField::History)
}

/// Collect condition types used by a set of edge conditions (the `conditions`
/// field, which maps to `requirements` in the TS runtime).
pub fn used_condition_types(
    edges: &[crate::blueprint::EdgeBlueprint],
) -> std::collections::HashSet<String> {
    let mut types = std::collections::HashSet::new();
    for e in edges {
        if let Some(conds) = &e.conditions {
            for c in conds {
                types.insert(c.r#type.clone());
            }
        }
        if let Some(conds) = &e.visibility {
            for c in conds {
                types.insert(c.r#type.clone());
            }
        }
    }
    types
}

#[allow(dead_code)]
fn unused(_: &BTreeMap<String, serde_json::Value>) {}
