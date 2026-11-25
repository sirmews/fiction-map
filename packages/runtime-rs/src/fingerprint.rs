use std::collections::HashSet;

use serde_json::Value;

use crate::blueprint::{EnumerationError, GraphBlueprint, StateTrigger};
use crate::state::{RuntimeState, RuntimeValue, js_number_string, js_string};

pub fn visit_checks<'a>(graph: &'a GraphBlueprint, triggers: &'a [StateTrigger]) -> Vec<&'a str> {
    let mut node_ids = HashSet::new();
    let edge_conditions = graph
        .edges
        .iter()
        .flat_map(|edge| edge.conditions.iter().chain(&edge.visibility).flatten());
    let trigger_conditions = triggers.iter().flat_map(|trigger| &trigger.conditions);
    for condition in edge_conditions.chain(trigger_conditions) {
        if matches!(condition.r#type.as_str(), "visited" | "notVisited")
            && let Some(node) = condition.params.get("nodeId").and_then(Value::as_str)
        {
            node_ids.insert(node);
        }
    }
    let mut node_ids: Vec<_> = node_ids.into_iter().collect();
    node_ids.sort_unstable();
    node_ids
}

// Match TypeScript's projected equality, while using full equality after hashing.
// Two distinct keys that share a hash must still be explored separately.
#[derive(Clone, PartialEq, Eq, Hash)]
pub struct Fingerprint {
    node: String,
    flags: Vec<(String, &'static str, String)>,
    variables: Vec<(String, String)>,
    owned: Vec<String>,
    active: Vec<String>,
    unlocked: Vec<String>,
    resources: Vec<(String, String)>,
    visited: Vec<bool>,
}

impl Fingerprint {
    pub fn of(state: &RuntimeState, visit_checks: &[&str]) -> Result<Self, EnumerationError> {
        let mut fingerprint = Self {
            node: state.current_node.clone(),
            flags: state
                .flags
                .iter()
                .map(|(key, value)| {
                    let kind = match value {
                        RuntimeValue::Json(Value::Bool(_)) => "boolean",
                        RuntimeValue::Json(Value::String(_)) => "string",
                        RuntimeValue::Json(Value::Number(_)) | RuntimeValue::Number(_) => "number",
                        RuntimeValue::Undefined => "undefined",
                        RuntimeValue::Json(_) => "object",
                    };
                    let value = stringify(value)?;
                    Ok((key.clone(), kind, value))
                })
                .collect::<Result<_, _>>()?,
            variables: state
                .variables
                .iter()
                .map(|(key, value)| Ok((key.clone(), stringify(value)?)))
                .collect::<Result<_, _>>()?,
            owned: Vec::new(),
            active: Vec::new(),
            unlocked: Vec::new(),
            resources: Vec::new(),
            visited: visit_checks
                .iter()
                .map(|node| state.visited.iter().any(|id| id == node))
                .collect(),
        };
        if let Some(entity) = &state.entity_state {
            fingerprint.owned.extend(entity.owned.iter().cloned());
            fingerprint.active.extend(entity.active.iter().cloned());
            fingerprint.unlocked.extend(entity.unlocked.iter().cloned());
            fingerprint.owned.sort_unstable();
            fingerprint.active.sort_unstable();
            fingerprint.unlocked.sort_unstable();
            fingerprint.resources = entity
                .resources
                .iter()
                .map(|(key, value)| (key.clone(), js_number_string(*value)))
                .collect();
        }
        Ok(fingerprint)
    }
}

fn stringify(value: &RuntimeValue) -> Result<String, EnumerationError> {
    if matches!(value, RuntimeValue::Json(value) if blocks_primitive_conversion(value)) {
        return Err(EnumerationError {
            code: "TypeError".into(),
            message: "Cannot convert object to primitive value".into(),
        });
    }
    Ok(js_string(value))
}

fn blocks_primitive_conversion(value: &Value) -> bool {
    match value {
        Value::Object(value) => value.contains_key("toString"),
        Value::Array(values) => values.iter().any(blocks_primitive_conversion),
        _ => false,
    }
}
