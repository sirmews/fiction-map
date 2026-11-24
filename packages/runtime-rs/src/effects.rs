use serde_json::{
    Value,
    value::{RawValue, to_raw_value},
};

use crate::blueprint::{Effect, ExtensionObject};
use crate::formula;
use crate::state::{EntityRuntimeState, RuntimeState, RuntimeValue, is_forbidden_state_key};

/// Apply one supported effect in place. Unknown effects are ignored.
pub fn apply(state: &mut RuntimeState, effect: &Effect) {
    let key = || effect.params.get("key").and_then(|value| value.as_str());
    let value = || effect.params.get("value").cloned();
    let entity_id = || {
        effect
            .params
            .get("entityId")
            .and_then(|value| value.as_str())
    };

    match effect.r#type.as_str() {
        "setVariable" => {
            if let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) {
                state.variables.insert(
                    key.to_string(),
                    value().map_or(RuntimeValue::Undefined, RuntimeValue::Json),
                );
            }
        }
        "deleteVariable" => {
            if let Some(key) = key() {
                state.variables.remove(key);
            }
        }
        "increment" | "decrement" => {
            if let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) {
                let Some(current) = state.variables.get(key).and_then(RuntimeValue::as_number)
                else {
                    return;
                };
                let delta = effect.params.get("delta").and_then(|value| value.as_f64());
                let result = match (effect.r#type.as_str(), delta) {
                    ("increment", Some(delta)) => current + delta,
                    ("decrement", Some(delta)) => current - delta,
                    ("increment", None) => f64::NAN,
                    ("decrement", None) => f64::NAN,
                    _ => unreachable!(),
                };
                state
                    .variables
                    .insert(key.to_string(), RuntimeValue::Number(result));
            }
        }
        "clamp" => {
            if let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) {
                let Some(current) = state.variables.get(key).and_then(RuntimeValue::as_number)
                else {
                    return;
                };
                let minimum = effect
                    .params
                    .get("min")
                    .and_then(|value| value.as_f64())
                    .unwrap_or(f64::NAN);
                let maximum = effect
                    .params
                    .get("max")
                    .and_then(|value| value.as_f64())
                    .unwrap_or(f64::NAN);
                let clamped = if current.is_nan() || minimum.is_nan() || maximum.is_nan() {
                    f64::NAN
                } else {
                    js_max(minimum, js_min(maximum, current))
                };
                state
                    .variables
                    .insert(key.to_string(), RuntimeValue::Number(clamped));
            }
        }
        "setFlag" => {
            if let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) {
                state.flags.insert(
                    key.to_string(),
                    value().map_or(RuntimeValue::Undefined, RuntimeValue::Json),
                );
            }
        }
        "clearFlag" => {
            if let Some(key) = key() {
                state.flags.remove(key);
            }
        }
        "markVisited" => {
            if let Some(node) = effect.params.get("nodeId").and_then(|value| value.as_str()) {
                state.visited.insert(node.to_string());
            }
        }
        "navigate" => {
            if let Some(node) = effect.params.get("nodeId").and_then(|value| value.as_str()) {
                navigate_to(state, node);
            }
        }
        "noOp" | "" => {}
        "setExtension" => {
            let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) else {
                return;
            };
            let extensions = state.extensions.get_or_insert_with(Default::default);
            if let Some(value) = value() {
                extensions.insert(key.to_string(), to_raw_value(&value).expect("JSON value"));
            } else {
                extensions.remove(key);
            }
        }
        "mergeExtension" => {
            let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) else {
                return;
            };
            let extensions = state.extensions.get_or_insert_with(Default::default);
            let mut merged = extensions
                .get(key)
                .map(|value| spread_extension(value))
                .unwrap_or_default();
            if let Some(value) = value() {
                merged.extend(spread_extension(&to_raw_value(&value).expect("JSON value")));
            }
            extensions.insert(key.to_string(), to_raw_value(&merged).expect("JSON object"));
        }
        "grantEntity" | "activateEntity" | "unlockEntity" => {
            let Some(id) = entity_id() else { return };
            let entities = ensure_entity(state);
            match effect.r#type.as_str() {
                "grantEntity" => {
                    entities.owned.insert(id.to_string());
                }
                "activateEntity" => {
                    entities.active.insert(id.to_string());
                }
                _ => {
                    entities.unlocked.insert(id.to_string());
                }
            }
        }
        "revokeEntity" | "deactivateEntity" | "lockEntity" => {
            let Some(id) = entity_id() else { return };
            let entities = ensure_entity(state);
            match effect.r#type.as_str() {
                "revokeEntity" => {
                    entities.owned.remove(&id.to_string());
                }
                "deactivateEntity" => {
                    entities.active.remove(&id.to_string());
                }
                _ => {
                    entities.unlocked.remove(&id.to_string());
                }
            }
        }
        "addResource" | "spendResource" => {
            let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) else {
                return;
            };
            let amount = match effect
                .params
                .get("formula")
                .and_then(|value| value.as_str())
            {
                Some(formula_text) => formula::evaluate(formula_text, state),
                None => effect
                    .params
                    .get("amount")
                    .and_then(|value| value.as_f64())
                    .unwrap_or(f64::NAN),
            };
            if effect.r#type == "addResource" {
                if !amount.is_finite() {
                    return;
                }
                let entities = ensure_entity(state);
                let current = entities.resources.get(key).copied().unwrap_or(0.0);
                entities.resources.insert(key.to_string(), current + amount);
            } else {
                if !amount.is_finite() || amount < 0.0 {
                    return;
                }
                let allow_negative = effect
                    .params
                    .get("allowNegative")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false);
                let clamp_to_zero = effect
                    .params
                    .get("clampToZero")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false);
                let current = state
                    .entity_state
                    .as_ref()
                    .and_then(|entities| entities.resources.get(key))
                    .copied()
                    .unwrap_or(0.0);
                if current < amount && !allow_negative && !clamp_to_zero {
                    return;
                }
                let entities = ensure_entity(state);
                let next = current - amount;
                entities.resources.insert(
                    key.to_string(),
                    if clamp_to_zero {
                        js_max(0.0, next)
                    } else {
                        next
                    },
                );
            }
        }
        _ => {}
    }
}

fn spread_extension(value: &RawValue) -> ExtensionObject {
    if value.get().starts_with('{') {
        // Keep the raw fields so a subsequent merge retains any lone UTF-16 escapes.
        return serde_json::from_str(value.get()).expect("JSON object");
    }

    match serde_json::from_str::<Value>(value.get()) {
        Ok(Value::Array(values)) => values
            .iter()
            .enumerate()
            .map(|(index, value)| (index.to_string(), to_raw_value(value).expect("JSON value")))
            .collect(),
        Ok(Value::String(value)) => value
            .encode_utf16()
            .enumerate()
            .map(|(index, unit)| {
                // JavaScript spreads a string by UTF-16 code unit, including surrogate halves.
                let raw = RawValue::from_string(format!(r#""\u{unit:04x}""#))
                    .expect("JSON string escape");
                (index.to_string(), raw)
            })
            .collect(),
        _ => ExtensionObject::new(),
    }
}

pub fn apply_all(state: &mut RuntimeState, effects: &[Effect]) {
    for effect in effects {
        apply(state, effect);
    }
}

/// Navigate to a node: push the previous node, update current, then mark it
/// visited, matching `navigateToNode`.
pub fn navigate_to(state: &mut RuntimeState, node: &str) {
    state.history.push(state.current_node.clone());
    state.current_node = node.to_string();
    state.visited.insert(node.to_string());
}

fn ensure_entity(state: &mut RuntimeState) -> &mut EntityRuntimeState {
    state
        .entity_state
        .get_or_insert_with(|| EntityRuntimeState {
            owned: Default::default(),
            active: Default::default(),
            unlocked: Default::default(),
            resources: Default::default(),
            extensions: None,
        })
}

fn js_min(left: f64, right: f64) -> f64 {
    if left.is_nan() || right.is_nan() {
        return f64::NAN;
    }
    if left == right {
        if left == 0.0 && (left.is_sign_negative() || right.is_sign_negative()) {
            -0.0
        } else {
            left
        }
    } else if left < right {
        left
    } else {
        right
    }
}

fn js_max(left: f64, right: f64) -> f64 {
    if left.is_nan() || right.is_nan() {
        return f64::NAN;
    }
    if left == right {
        if left == 0.0 && (!left.is_sign_negative() || !right.is_sign_negative()) {
            0.0
        } else {
            left
        }
    } else if left > right {
        left
    } else {
        right
    }
}

#[cfg(test)]
mod tests {
    use super::{apply, apply_all, navigate_to};
    use crate::blueprint::Effect;
    use crate::state::{RuntimeState, RuntimeValue};

    fn effect(value: serde_json::Value) -> Effect {
        serde_json::from_value(value).unwrap()
    }

    #[test]
    fn variable_arithmetic_preserves_overflow_as_javascript_number() {
        let mut state = RuntimeState::initial("start");
        state
            .variables
            .insert("n".into(), RuntimeValue::Json(serde_json::json!(1e308)));
        apply(
            &mut state,
            &effect(serde_json::json!({"type":"increment","key":"n","delta":1e308})),
        );
        assert!(
            matches!(state.variables.get("n"), Some(RuntimeValue::Number(value)) if value.is_infinite())
        );
    }

    #[test]
    fn resource_spend_observes_negative_and_clamp_options() {
        let mut state = RuntimeState::initial("start");
        apply_all(
            &mut state,
            &[
                effect(serde_json::json!({"type":"addResource","key":"health","amount":10})),
                effect(serde_json::json!({"type":"spendResource","key":"health","amount":20})),
            ],
        );
        assert_eq!(
            state.entity_state.as_ref().unwrap().resources["health"],
            10.0
        );
        apply(
            &mut state,
            &effect(
                serde_json::json!({"type":"spendResource","key":"health","amount":20,"clampToZero":true}),
            ),
        );
        assert_eq!(
            state.entity_state.as_ref().unwrap().resources["health"],
            0.0
        );
        apply(
            &mut state,
            &effect(
                serde_json::json!({"type":"spendResource","key":"health","amount":2,"allowNegative":true}),
            ),
        );
        assert_eq!(
            state.entity_state.as_ref().unwrap().resources["health"],
            -2.0
        );
    }

    #[test]
    fn clamp_matches_math_max_min_order_and_removal_initializes_entity_state() {
        let mut state = RuntimeState::initial("start");
        state
            .variables
            .insert("n".into(), RuntimeValue::Json(serde_json::json!(5)));
        apply(
            &mut state,
            &effect(serde_json::json!({"type":"clamp","key":"n","min":10,"max":2})),
        );
        assert_eq!(state.variables["n"].as_number(), Some(10.0));

        assert!(state.entity_state.is_none());
        apply(
            &mut state,
            &effect(serde_json::json!({"type":"revokeEntity","entityId":"absent"})),
        );
        assert!(state.entity_state.is_some());
    }

    #[test]
    fn extension_effects_merge_and_reject_forbidden_keys() {
        let mut state = RuntimeState::initial("start");
        apply_all(
            &mut state,
            &[
                effect(serde_json::json!({"type":"setExtension","key":"custom","value":{"a":1}})),
                effect(serde_json::json!({"type":"mergeExtension","key":"custom","value":{"b":2}})),
                effect(
                    serde_json::json!({"type":"setExtension","key":"__proto__","value":{"polluted":true}}),
                ),
            ],
        );
        let extensions = state.extensions.as_ref().unwrap();
        assert_eq!(extensions["custom"].get(), r#"{"a":1,"b":2}"#);
        assert!(!extensions.contains_key("__proto__"));
    }

    #[test]
    fn navigation_preserves_visited_insertion_order() {
        let mut state = RuntimeState::initial("start");
        navigate_to(&mut state, "alpha");
        navigate_to(&mut state, "start");
        assert_eq!(
            state.visited.iter().map(String::as_str).collect::<Vec<_>>(),
            ["start", "alpha"]
        );
        assert_eq!(state.history, ["start", "alpha"]);
    }
}
