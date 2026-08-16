use crate::blueprint::Effect;
use crate::state::{EntityRuntimeState, RuntimeState};

/// Apply an effect to a state (in place). Mirrors the TS effect handlers the
/// fixtures exercise: `setFlag`, `clearFlag`, `markVisited`, `navigate`,
/// `setVariable`, `increment`, and the entity-aware ones (`grantEntity`,
/// `activateEntity`, `addResource`, `spendResource`).
pub fn apply(state: &mut RuntimeState, effect: &Effect) {
    match effect.r#type.as_str() {
        "setFlag" => {
            let key = effect.params.get("key").and_then(|v| v.as_str());
            let value = effect.params.get("value").cloned();
            if let (Some(k), Some(v)) = (key, value) {
                state.flags.insert(k.to_string(), v);
            }
        }
        "clearFlag" => {
            let key = effect.params.get("key").and_then(|v| v.as_str());
            if let Some(k) = key {
                state.flags.remove(k);
            }
        }
        "markVisited" => {
            let node = effect.params.get("nodeId").and_then(|v| v.as_str());
            if let Some(n) = node {
                state.visited.insert(n.to_string());
            }
        }
        "navigate" => {
            let node = effect.params.get("nodeId").and_then(|v| v.as_str());
            if let Some(n) = node {
                navigate_to(state, n);
            }
        }
        "setVariable" => {
            let key = effect.params.get("key").and_then(|v| v.as_str());
            let value = effect.params.get("value").cloned();
            if let (Some(k), Some(v)) = (key, value) {
                state.variables.insert(k.to_string(), v);
            }
        }
        "increment" => {
            let key = effect.params.get("key").and_then(|v| v.as_str());
            let amount = effect.params.get("amount").and_then(|v| v.as_f64()).unwrap_or(1.0);
            if let Some(k) = key {
                let cur = state
                    .variables
                    .get(k)
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                state
                    .variables
                    .insert(k.to_string(), serde_json::json!(cur + amount));
            }
        }
        "decrement" => {
            let key = effect.params.get("key").and_then(|v| v.as_str());
            let amount = effect.params.get("amount").and_then(|v| v.as_f64()).unwrap_or(1.0);
            if let Some(k) = key {
                let cur = state
                    .variables
                    .get(k)
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.0);
                state
                    .variables
                    .insert(k.to_string(), serde_json::json!(cur - amount));
            }
        }
        "noOp" | "" => {}
        // Entity-aware effects
        "grantEntity" => {
            let e = effect.params.get("entityId").and_then(|v| v.as_str());
            if let Some(id) = e {
                ensure_entity(state).owned.insert(id.to_string());
            }
        }
        "revokeEntity" => {
            let e = effect.params.get("entityId").and_then(|v| v.as_str());
            if let Some(id) = e {
                if let Some(es) = state.entity_state.as_mut() {
                    es.owned.remove(id);
                }
            }
        }
        "activateEntity" => {
            let e = effect.params.get("entityId").and_then(|v| v.as_str());
            if let Some(id) = e {
                ensure_entity(state).active.insert(id.to_string());
            }
        }
        "deactivateEntity" => {
            let e = effect.params.get("entityId").and_then(|v| v.as_str());
            if let Some(id) = e {
                if let Some(es) = state.entity_state.as_mut() {
                    es.active.remove(id);
                }
            }
        }
        "addResource" => {
            let key = effect.params.get("key").and_then(|v| v.as_str());
            let amount = effect.params.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
            if let Some(k) = key {
                let es = ensure_entity(state);
                let cur = es.resources.get(k).copied().unwrap_or(0.0);
                es.resources.insert(k.to_string(), cur + amount);
            }
        }
        "spendResource" => {
            let key = effect.params.get("key").and_then(|v| v.as_str());
            let amount = effect.params.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let clamp = effect
                .params
                .get("clampToZero")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            if let Some(k) = key {
                if let Some(es) = state.entity_state.as_mut() {
                    let cur = es.resources.get(k).copied().unwrap_or(0.0);
                    let next = cur - amount;
                    es.resources.insert(k.to_string(), if clamp && next < 0.0 { 0.0 } else { next });
                }
            }
        }
        other => {
            eprintln!("warning: unknown effect type '{}', ignoring", other);
        }
    }
}

pub fn apply_all(state: &mut RuntimeState, effects: &[Effect]) {
    for e in effects {
        apply(state, e);
    }
}

/// Navigate to a node: push current onto history, set current, mark visited.
/// Mirrors the TS `navigateToNode`.
pub fn navigate_to(state: &mut RuntimeState, node: &str) {
    state.history.push(state.current_node.clone());
    state.current_node = node.to_string();
    state.visited.insert(node.to_string());
}

fn ensure_entity(state: &mut RuntimeState) -> &mut EntityRuntimeState {
    if state.entity_state.is_none() {
        state.entity_state = Some(EntityRuntimeState {
            owned: Default::default(),
            active: Default::default(),
            unlocked: Default::default(),
            resources: Default::default(),
            extensions: None,
        });
    }
    state.entity_state.as_mut().unwrap()
}
