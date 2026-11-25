use serde_json::{
    Value,
    value::{RawValue, to_raw_value},
};

use crate::blueprint::{Effect, ExtensionObject};
use crate::formula;
use crate::state::{EntityRuntimeState, RuntimeState, RuntimeValue, is_forbidden_state_key};

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum EffectKind {
    SetVariable,
    DeleteVariable,
    Increment,
    Decrement,
    Clamp,
    SetFlag,
    ClearFlag,
    MarkVisited,
    Navigate,
    NoOp,
    SetExtension,
    MergeExtension,
    GrantEntity,
    RevokeEntity,
    ActivateEntity,
    DeactivateEntity,
    UnlockEntity,
    LockEntity,
    AddResource,
    SpendResource,
}

impl EffectKind {
    pub(crate) fn parse(name: &str) -> Option<Self> {
        Some(match name {
            "setVariable" => Self::SetVariable,
            "deleteVariable" => Self::DeleteVariable,
            "increment" => Self::Increment,
            "decrement" => Self::Decrement,
            "clamp" => Self::Clamp,
            "setFlag" => Self::SetFlag,
            "clearFlag" => Self::ClearFlag,
            "markVisited" => Self::MarkVisited,
            "navigate" => Self::Navigate,
            "noOp" => Self::NoOp,
            "setExtension" => Self::SetExtension,
            "mergeExtension" => Self::MergeExtension,
            "grantEntity" => Self::GrantEntity,
            "revokeEntity" => Self::RevokeEntity,
            "activateEntity" => Self::ActivateEntity,
            "deactivateEntity" => Self::DeactivateEntity,
            "unlockEntity" => Self::UnlockEntity,
            "lockEntity" => Self::LockEntity,
            "addResource" => Self::AddResource,
            "spendResource" => Self::SpendResource,
            _ => return None,
        })
    }
}

pub(crate) fn variable_delta(current: f64, delta: f64, subtract: bool) -> f64 {
    if subtract {
        current - delta
    } else {
        current + delta
    }
}

pub(crate) fn clamp_number(value: f64, min: f64, max: f64) -> f64 {
    js_max(min, js_min(max, value))
}

pub(crate) struct ResourceAmount(f64);

impl ResourceAmount {
    pub(crate) fn credit(amount: f64) -> Option<Self> {
        amount.is_finite().then_some(Self(amount))
    }
    pub(crate) fn debit(amount: f64) -> Option<Self> {
        Self::credit(amount).filter(|v| v.0 >= 0.0)
    }
    pub(crate) fn add_to(self, current: f64) -> f64 {
        current + self.0
    }
    pub(crate) fn spend_from(self, current: f64, options: SpendOptions) -> Option<f64> {
        options
            .permits(current < self.0)
            .then(|| options.balance(current - self.0))
    }
}

#[derive(Clone, Copy)]
pub(crate) struct SpendOptions {
    pub(crate) allow_negative: bool,
    pub(crate) clamp_to_zero: bool,
}

impl SpendOptions {
    pub(crate) fn permits(self, insufficient: bool) -> bool {
        !insufficient || self.allow_negative || self.clamp_to_zero
    }
    pub(crate) fn balance(self, difference: f64) -> f64 {
        if self.clamp_to_zero {
            js_max(0.0, difference)
        } else {
            difference
        }
    }
}

/// Apply one supported effect in place. Unknown effects are ignored.
pub fn apply(state: &mut RuntimeState, effect: &Effect) {
    use EffectKind::*;
    let Some(kind) = EffectKind::parse(&effect.r#type) else {
        return;
    };
    let key = || effect.params.get("key").and_then(|value| value.as_str());
    let value = || effect.params.get("value").cloned();
    let entity_id = || {
        effect
            .params
            .get("entityId")
            .and_then(|value| value.as_str())
    };

    match kind {
        SetVariable => {
            if let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) {
                state.variables.insert(
                    key.to_string(),
                    value().map_or(RuntimeValue::Undefined, RuntimeValue::Json),
                );
            }
        }
        DeleteVariable => {
            if let Some(key) = key() {
                state.variables.remove(key);
            }
        }
        Increment | Decrement => {
            if let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) {
                let Some(current) = state.variables.get(key).and_then(RuntimeValue::as_number)
                else {
                    return;
                };
                let delta = effect.params.get("delta").and_then(|value| value.as_f64());
                let result = variable_delta(current, delta.unwrap_or(f64::NAN), kind == Decrement);
                state
                    .variables
                    .insert(key.to_string(), RuntimeValue::Number(result));
            }
        }
        Clamp => {
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
                let clamped = clamp_number(current, minimum, maximum);
                state
                    .variables
                    .insert(key.to_string(), RuntimeValue::Number(clamped));
            }
        }
        SetFlag => {
            if let Some(key) = key().filter(|key| !is_forbidden_state_key(key)) {
                state.flags.insert(
                    key.to_string(),
                    value().map_or(RuntimeValue::Undefined, RuntimeValue::Json),
                );
            }
        }
        ClearFlag => {
            if let Some(key) = key() {
                state.flags.remove(key);
            }
        }
        MarkVisited => {
            if let Some(node) = effect.params.get("nodeId").and_then(|value| value.as_str()) {
                state.visited.insert(node.to_string());
            }
        }
        Navigate => {
            if let Some(node) = effect.params.get("nodeId").and_then(|value| value.as_str()) {
                navigate_to(state, node);
            }
        }
        NoOp => {}
        SetExtension => {
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
        MergeExtension => {
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
        GrantEntity | ActivateEntity | UnlockEntity => {
            let Some(id) = entity_id() else { return };
            let entities = ensure_entity(state);
            match kind {
                GrantEntity => {
                    entities.owned.insert(id.to_string());
                }
                ActivateEntity => {
                    entities.active.insert(id.to_string());
                }
                _ => {
                    entities.unlocked.insert(id.to_string());
                }
            }
        }
        RevokeEntity | DeactivateEntity | LockEntity => {
            let Some(id) = entity_id() else { return };
            let entities = ensure_entity(state);
            match kind {
                RevokeEntity => {
                    entities.owned.remove(&id.to_string());
                }
                DeactivateEntity => {
                    entities.active.remove(&id.to_string());
                }
                _ => {
                    entities.unlocked.remove(&id.to_string());
                }
            }
        }
        AddResource | SpendResource => {
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
            let current = state
                .entity_state
                .as_ref()
                .and_then(|entities| entities.resources.get(key))
                .copied()
                .unwrap_or(0.0);
            let next = if kind == AddResource {
                ResourceAmount::credit(amount).map(|amount| amount.add_to(current))
            } else {
                let options = SpendOptions {
                    allow_negative: effect
                        .params
                        .get("allowNegative")
                        .and_then(Value::as_bool)
                        .unwrap_or(false),
                    clamp_to_zero: effect
                        .params
                        .get("clampToZero")
                        .and_then(Value::as_bool)
                        .unwrap_or(false),
                };
                ResourceAmount::debit(amount).and_then(|amount| amount.spend_from(current, options))
            };
            if let Some(next) = next {
                ensure_entity(state).resources.insert(key.to_string(), next);
            }
        }
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
