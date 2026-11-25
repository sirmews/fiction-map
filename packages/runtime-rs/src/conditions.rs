use crate::blueprint::Condition;
use crate::state::{RuntimeState, RuntimeValue, js_truthy, strict_value_equal};

/// Evaluate a built-in condition. Unknown condition names deliberately return
/// false, matching the TS runtime's registry lookup behavior.
pub fn evaluate(
    state: &RuntimeState,
    cond: &Condition,
    context: Option<&crate::blueprint::EnumerationContext>,
) -> bool {
    let key = || cond.params.get("key").and_then(|value| value.as_str());
    let node_id = || cond.params.get("nodeId").and_then(|value| value.as_str());
    let value = || cond.params.get("value");

    match cond.r#type.as_str() {
        "visited" => node_id().is_some_and(|node| state.visited.contains(&node.to_string())),
        "notVisited" => node_id().is_some_and(|node| !state.visited.contains(&node.to_string())),
        "currentNode" => node_id().is_some_and(|node| state.current_node == node),
        "hasFlag" => key().is_some_and(|key| state.flags.contains_key(key)),
        "notFlag" => {
            key().is_some_and(|key| state.flags.get(key).is_none_or(|value| !js_truthy(value)))
        }
        "flagEquals" => match (key(), value()) {
            (Some(key), Some(expected)) => state
                .flags
                .get(key)
                .is_some_and(|actual| strict_value_equal(actual, expected)),
            (Some(key), None) => state
                .flags
                .get(key)
                .is_none_or(|actual| matches!(actual, RuntimeValue::Undefined)),
            _ => false,
        },
        "hasVariable" => key().is_some_and(|key| state.variables.contains_key(key)),
        "equals" => match (key(), value()) {
            (Some(key), Some(expected)) => state
                .variables
                .get(key)
                .is_some_and(|actual| strict_value_equal(actual, expected)),
            (Some(key), None) => state
                .variables
                .get(key)
                .is_none_or(|actual| matches!(actual, RuntimeValue::Undefined)),
            _ => false,
        },
        "notEquals" => match (key(), value()) {
            (Some(key), Some(expected)) => state
                .variables
                .get(key)
                .is_none_or(|actual| !strict_value_equal(actual, expected)),
            (Some(key), None) => state
                .variables
                .get(key)
                .is_some_and(|actual| !matches!(actual, RuntimeValue::Undefined)),
            _ => false,
        },
        "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual" => {
            let actual = key()
                .and_then(|key| state.variables.get(key))
                .and_then(RuntimeValue::as_number);
            let expected = value().and_then(serde_json::Value::as_f64);
            match (actual, expected) {
                (Some(actual), Some(expected)) => match cond.r#type.as_str() {
                    "greaterThan" => actual > expected,
                    "greaterThanOrEqual" => actual >= expected,
                    "lessThan" => actual < expected,
                    "lessThanOrEqual" => actual <= expected,
                    _ => false,
                },
                _ => false,
            }
        }
        "hasEntity" => cond
            .params
            .get("entityId")
            .and_then(|value| value.as_str())
            .is_some_and(|id| {
                context
                    .and_then(|context| context.derived_state.as_ref())
                    .and_then(|derived| derived.owned_entity_ids.as_ref())
                    .is_some_and(|ids| ids.iter().any(|candidate| candidate == id))
                    || state
                        .entity_state
                        .as_ref()
                        .is_some_and(|entities| entities.owned.contains(&id.to_string()))
            }),
        "entityActive" => cond
            .params
            .get("entityId")
            .and_then(|value| value.as_str())
            .is_some_and(|id| {
                context
                    .and_then(|context| context.derived_state.as_ref())
                    .and_then(|derived| derived.active_entity_ids.as_ref())
                    .is_some_and(|ids| ids.iter().any(|candidate| candidate == id))
                    || state
                        .entity_state
                        .as_ref()
                        .is_some_and(|entities| entities.active.contains(&id.to_string()))
            }),
        "entityUnlocked" => cond
            .params
            .get("entityId")
            .and_then(|value| value.as_str())
            .is_some_and(|id| {
                context
                    .and_then(|context| context.derived_state.as_ref())
                    .and_then(|derived| derived.effective_entity_ids.as_ref())
                    .is_some_and(|ids| ids.iter().any(|candidate| candidate == id))
                    || state
                        .entity_state
                        .as_ref()
                        .is_some_and(|entities| entities.unlocked.contains(&id.to_string()))
            }),
        "resourceAtLeast" | "resourceLessThan" => {
            let resource_key = key();
            let expected = value().and_then(serde_json::Value::as_f64);
            match (resource_key, expected) {
                (Some(resource_key), Some(expected)) => {
                    let actual = state
                        .entity_state
                        .as_ref()
                        .and_then(|entities| entities.resources.get(resource_key))
                        .copied()
                        .unwrap_or(0.0);
                    if cond.r#type == "resourceAtLeast" {
                        actual >= expected
                    } else {
                        actual < expected
                    }
                }
                _ => false,
            }
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::evaluate;
    use crate::blueprint::{Condition, DerivedState, EnumerationContext};
    use crate::state::{RuntimeState, RuntimeValue};

    fn condition(value: serde_json::Value) -> Condition {
        serde_json::from_value(value).unwrap()
    }

    #[test]
    fn conditions_use_javascript_primitive_equality_and_flag_truthiness() {
        let mut state = RuntimeState::initial("start");
        state
            .variables
            .insert("number".into(), RuntimeValue::Json(serde_json::json!(1)));
        state
            .flags
            .insert("off".into(), RuntimeValue::Json(serde_json::json!(0)));
        state
            .flags
            .insert("empty".into(), RuntimeValue::Json(serde_json::json!("")));
        assert!(evaluate(
            &state,
            &condition(serde_json::json!({"type":"equals","key":"number","value":1.0})),
            None
        ));
        assert!(!evaluate(
            &state,
            &condition(serde_json::json!({"type":"equals","key":"number","value":"1"})),
            None
        ));
        assert!(evaluate(
            &state,
            &condition(serde_json::json!({"type":"notFlag","key":"off"})),
            None
        ));
        assert!(evaluate(
            &state,
            &condition(serde_json::json!({"type":"notFlag","key":"empty"})),
            None
        ));
        assert!(evaluate(
            &state,
            &condition(serde_json::json!({"type":"equals","key":"missing"})),
            None
        ));
        assert!(!evaluate(
            &state,
            &condition(serde_json::json!({"type":"notEquals","key":"missing"})),
            None
        ));
    }

    #[test]
    fn entity_conditions_use_derived_context_then_fall_back_to_runtime_state() {
        let mut state = RuntimeState::initial("start");
        state.entity_state = Some(crate::state::EntityRuntimeState {
            owned: ["owned".to_string()].into_iter().collect(),
            active: Default::default(),
            unlocked: Default::default(),
            resources: Default::default(),
            extensions: None,
        });
        let active_condition =
            condition(serde_json::json!({"type":"entityActive","entityId":"active"}));
        let context = EnumerationContext {
            derived_state: Some(DerivedState {
                owned_entity_ids: None,
                active_entity_ids: Some(vec!["active".to_string()]),
                effective_entity_ids: None,
            }),
        };
        assert!(evaluate(&state, &active_condition, Some(&context)));
        assert!(evaluate(
            &state,
            &condition(serde_json::json!({"type":"hasEntity","entityId":"owned"})),
            None
        ));
    }
}
