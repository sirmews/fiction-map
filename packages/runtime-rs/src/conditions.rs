use crate::blueprint::{Condition, EnumerationContext};
use crate::state::{RuntimeState, RuntimeValue, js_truthy, strict_value_equal};
use std::convert::Infallible;

#[derive(Clone, Copy)]
pub(crate) enum NumericTest {
    Greater,
    AtLeast,
    Less,
    AtMost,
}

impl NumericTest {
    pub(crate) fn compare(self, a: f64, b: f64) -> bool {
        match self {
            Self::Greater => a > b,
            Self::AtLeast => a >= b,
            Self::Less => a < b,
            Self::AtMost => a <= b,
        }
    }
}

/// The native host reads JSON and the browser host reads live JavaScript values.
/// Both evaluate the same predicates, precedence and short-circuit rules.
pub(crate) trait ConditionHost {
    type Error;
    fn variable_equals(&self, flags: bool) -> Result<Option<bool>, Self::Error>;
    fn variable_number(&self, test: NumericTest) -> Result<bool, Self::Error>;
    fn has_key(&self, flags: bool) -> Result<bool, Self::Error>;
    fn flag_unset(&self) -> Result<bool, Self::Error>;
    fn visited(&self) -> Result<Option<bool>, Self::Error>;
    fn at_current_node(&self) -> Result<bool, Self::Error>;
    fn entity(&self, derived: &str, collection: &str) -> Result<bool, Self::Error>;
    fn resource(&self, test: NumericTest) -> Result<bool, Self::Error>;
}

pub(crate) fn evaluate_with<H: ConditionHost>(kind: &str, host: &H) -> Result<bool, H::Error> {
    Ok(match kind {
        "equals" => host.variable_equals(false)? == Some(true),
        "notEquals" => host.variable_equals(false)? == Some(false),
        "flagEquals" => host.variable_equals(true)? == Some(true),
        "greaterThan" => host.variable_number(NumericTest::Greater)?,
        "greaterThanOrEqual" => host.variable_number(NumericTest::AtLeast)?,
        "lessThan" => host.variable_number(NumericTest::Less)?,
        "lessThanOrEqual" => host.variable_number(NumericTest::AtMost)?,
        "hasFlag" => host.has_key(true)?,
        "notFlag" => host.flag_unset()?,
        "hasVariable" => host.has_key(false)?,
        "visited" => host.visited()? == Some(true),
        "notVisited" => host.visited()? == Some(false),
        "currentNode" => host.at_current_node()?,
        "hasEntity" => host.entity("ownedEntityIds", "owned")?,
        "entityActive" => host.entity("activeEntityIds", "active")?,
        "entityUnlocked" => host.entity("effectiveEntityIds", "unlocked")?,
        "resourceAtLeast" => host.resource(NumericTest::AtLeast)?,
        "resourceLessThan" => host.resource(NumericTest::Less)?,
        _ => false,
    })
}

struct NativeCondition<'a> {
    state: &'a RuntimeState,
    condition: &'a Condition,
    context: Option<&'a EnumerationContext>,
}

impl NativeCondition<'_> {
    fn string(&self, key: &str) -> Option<&str> {
        self.condition.params.get(key)?.as_str()
    }
}

impl ConditionHost for NativeCondition<'_> {
    type Error = Infallible;
    fn variable_equals(&self, flags: bool) -> Result<Option<bool>, Infallible> {
        let map = if flags {
            &self.state.flags
        } else {
            &self.state.variables
        };
        Ok(self
            .string("key")
            .map(|key| match self.condition.params.get("value") {
                Some(expected) => map
                    .get(key)
                    .is_some_and(|value| strict_value_equal(value, expected)),
                None => map
                    .get(key)
                    .is_none_or(|value| matches!(value, RuntimeValue::Undefined)),
            }))
    }
    fn variable_number(&self, test: NumericTest) -> Result<bool, Infallible> {
        let actual = self
            .string("key")
            .and_then(|key| self.state.variables.get(key))
            .and_then(RuntimeValue::as_number);
        let expected = self
            .condition
            .params
            .get("value")
            .and_then(serde_json::Value::as_f64);
        Ok(actual
            .zip(expected)
            .is_some_and(|(a, b)| test.compare(a, b)))
    }
    fn has_key(&self, flags: bool) -> Result<bool, Infallible> {
        let map = if flags {
            &self.state.flags
        } else {
            &self.state.variables
        };
        Ok(self.string("key").is_some_and(|key| map.contains_key(key)))
    }
    fn flag_unset(&self) -> Result<bool, Infallible> {
        Ok(self.string("key").is_some_and(|key| {
            self.state
                .flags
                .get(key)
                .is_none_or(|value| !js_truthy(value))
        }))
    }
    fn visited(&self) -> Result<Option<bool>, Infallible> {
        Ok(self
            .string("nodeId")
            .map(|id| self.state.visited.contains(&id.to_owned())))
    }
    fn at_current_node(&self) -> Result<bool, Infallible> {
        Ok(self.string("nodeId") == Some(&self.state.current_node))
    }
    fn entity(&self, derived: &str, collection: &str) -> Result<bool, Infallible> {
        let Some(id) = self.string("entityId") else {
            return Ok(false);
        };
        let derived_ids = self
            .context
            .and_then(|c| c.derived_state.as_ref())
            .and_then(|d| match derived {
                "ownedEntityIds" => d.owned_entity_ids.as_ref(),
                "activeEntityIds" => d.active_entity_ids.as_ref(),
                _ => d.effective_entity_ids.as_ref(),
            });
        Ok(derived_ids.is_some_and(|ids| ids.iter().any(|v| v == id))
            || self.state.entity_state.as_ref().is_some_and(|entities| {
                let ids = match collection {
                    "owned" => &entities.owned,
                    "active" => &entities.active,
                    _ => &entities.unlocked,
                };
                ids.contains(&id.to_owned())
            }))
    }
    fn resource(&self, test: NumericTest) -> Result<bool, Infallible> {
        let key = self.string("key");
        let expected = self
            .condition
            .params
            .get("value")
            .and_then(serde_json::Value::as_f64);
        Ok(key.zip(expected).is_some_and(|(key, expected)| {
            let actual = self
                .state
                .entity_state
                .as_ref()
                .and_then(|e| e.resources.get(key))
                .copied()
                .unwrap_or(0.0);
            test.compare(actual, expected)
        }))
    }
}

pub fn evaluate(
    state: &RuntimeState,
    condition: &Condition,
    context: Option<&EnumerationContext>,
) -> bool {
    evaluate_with(
        &condition.r#type,
        &NativeCondition {
            state,
            condition,
            context,
        },
    )
    .unwrap_or_else(|never| match never {})
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
