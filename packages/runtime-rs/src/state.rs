use std::collections::BTreeMap;

use crate::blueprint::ExtensionObject;

/// An insertion-ordered set, matching JavaScript `Set` iteration and JSON
/// serialization order while providing the operations used by the runtime.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OrderedSet<T>(Vec<T>);

impl<T> Default for OrderedSet<T> {
    fn default() -> Self {
        Self(Vec::new())
    }
}

impl<T: PartialEq> OrderedSet<T> {
    pub fn contains(&self, value: &T) -> bool {
        self.0.contains(value)
    }

    pub fn insert(&mut self, value: T) -> bool {
        if self.contains(&value) {
            false
        } else {
            self.0.push(value);
            true
        }
    }

    pub fn remove(&mut self, value: &T) -> bool {
        if let Some(index) = self.0.iter().position(|item| item == value) {
            self.0.remove(index);
            true
        } else {
            false
        }
    }

    pub fn iter(&self) -> std::slice::Iter<'_, T> {
        self.0.iter()
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

impl<T: PartialEq> FromIterator<T> for OrderedSet<T> {
    fn from_iter<I: IntoIterator<Item = T>>(iter: I) -> Self {
        let mut set = Self::default();
        for value in iter {
            set.insert(value);
        }
        set
    }
}

impl<'a, T: PartialEq> IntoIterator for &'a OrderedSet<T> {
    type Item = &'a T;
    type IntoIter = std::slice::Iter<'a, T>;

    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}

/// Runtime state — the Rust analogue of the TS `GraphRuntimeState`.
#[derive(Debug, Clone)]
pub struct RuntimeState {
    pub current_node: String,
    pub history: Vec<String>,
    pub variables: BTreeMap<String, RuntimeValue>,
    pub flags: BTreeMap<String, RuntimeValue>,
    pub visited: OrderedSet<String>,
    pub entity_state: Option<EntityRuntimeState>,
    pub extensions: Option<ExtensionObject>,
}

/// Values held by JS runtime variables. The explicit number and undefined
/// cases preserve JS arithmetic overflow and missing effect values that JSON
/// itself cannot represent.
#[derive(Debug, Clone, PartialEq)]
pub enum RuntimeValue {
    Json(serde_json::Value),
    Number(f64),
    Undefined,
}

impl RuntimeValue {
    pub fn as_number(&self) -> Option<f64> {
        match self {
            Self::Number(value) => Some(*value),
            Self::Json(serde_json::Value::Number(value)) => value.as_f64(),
            _ => None,
        }
    }

    pub fn to_wire_value(&self) -> Option<serde_json::Value> {
        match self {
            Self::Json(value) => Some(value.clone()),
            Self::Number(value) if value.is_finite() => {
                serde_json::Number::from_f64(*value).map(serde_json::Value::Number)
            }
            Self::Number(_) => Some(serde_json::Value::Null),
            Self::Undefined => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct EntityRuntimeState {
    pub owned: OrderedSet<String>,
    pub active: OrderedSet<String>,
    pub unlocked: OrderedSet<String>,
    pub resources: BTreeMap<String, f64>,
    pub extensions: Option<ExtensionObject>,
}

impl RuntimeState {
    pub fn initial(start_node: &str) -> Self {
        let mut visited = OrderedSet::default();
        visited.insert(start_node.to_string());
        Self {
            current_node: start_node.to_string(),
            history: Vec::new(),
            variables: BTreeMap::new(),
            flags: BTreeMap::new(),
            visited,
            entity_state: None,
            extensions: None,
        }
    }

    /// JSON-compatible variables for state serialization. JS omits properties
    /// whose values are undefined and converts nonfinite numbers to null.
    pub fn variable_wire_values(&self) -> BTreeMap<String, serde_json::Value> {
        self.variables
            .iter()
            .filter_map(|(key, value)| value.to_wire_value().map(|value| (key.clone(), value)))
            .collect()
    }

    pub fn flag_wire_values(&self) -> BTreeMap<String, serde_json::Value> {
        self.flags
            .iter()
            .filter_map(|(key, value)| value.to_wire_value().map(|value| (key.clone(), value)))
            .collect()
    }
}

pub fn is_forbidden_state_key(key: &str) -> bool {
    matches!(key, "__proto__" | "prototype" | "constructor")
}

/// JavaScript's `String(value)` for JSON-compatible values.
pub fn js_string(value: &RuntimeValue) -> String {
    match value {
        RuntimeValue::Undefined => "undefined".to_string(),
        RuntimeValue::Number(value) => js_number_string(*value),
        RuntimeValue::Json(value) => js_string_json(value),
    }
}

/// Whether a JSON-wire value is equal under JavaScript `===` semantics.
pub fn strict_value_equal(left: &RuntimeValue, right: &serde_json::Value) -> bool {
    match left {
        RuntimeValue::Json(left) => strict_json_equal(left, right),
        RuntimeValue::Number(left) => right.as_f64().is_some_and(|right| *left == right),
        RuntimeValue::Undefined => false,
    }
}

pub fn strict_json_equal(left: &serde_json::Value, right: &serde_json::Value) -> bool {
    match (left, right) {
        (serde_json::Value::Null, serde_json::Value::Null) => true,
        (serde_json::Value::Bool(left), serde_json::Value::Bool(right)) => left == right,
        (serde_json::Value::String(left), serde_json::Value::String(right)) => left == right,
        (serde_json::Value::Number(left), serde_json::Value::Number(right)) => {
            left.as_f64() == right.as_f64()
        }
        _ => false,
    }
}

pub fn js_truthy(value: &RuntimeValue) -> bool {
    match value {
        RuntimeValue::Undefined | RuntimeValue::Json(serde_json::Value::Null) => false,
        RuntimeValue::Number(value) => *value != 0.0 && !value.is_nan(),
        RuntimeValue::Json(serde_json::Value::Bool(value)) => *value,
        RuntimeValue::Json(serde_json::Value::Number(value)) => value
            .as_f64()
            .is_some_and(|value| value != 0.0 && !value.is_nan()),
        RuntimeValue::Json(serde_json::Value::String(value)) => !value.is_empty(),
        RuntimeValue::Json(serde_json::Value::Array(_) | serde_json::Value::Object(_)) => true,
    }
}

fn js_string_json(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "null".to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        serde_json::Value::Number(value) => value
            .as_f64()
            .map(js_number_string)
            .unwrap_or_else(|| value.to_string()),
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Array(values) => values
            .iter()
            .map(|value| match value {
                serde_json::Value::Null => String::new(),
                _ => js_string_json(value),
            })
            .collect::<Vec<_>>()
            .join(","),
        serde_json::Value::Object(_) => "[object Object]".to_string(),
    }
}

/// JavaScript's canonical number-to-string representation, delegated to
/// ryu-js so exponent thresholds and notation match ECMAScript.
pub fn js_number_string(value: f64) -> String {
    if value.is_nan() {
        return "NaN".to_string();
    }
    if value == f64::INFINITY {
        return "Infinity".to_string();
    }
    if value == f64::NEG_INFINITY {
        return "-Infinity".to_string();
    }
    if value == 0.0 {
        return "0".to_string();
    }
    ryu_js::Buffer::new().format_finite(value).to_string()
}

#[cfg(test)]
mod tests {
    use super::{OrderedSet, RuntimeState, RuntimeValue, js_number_string};

    #[test]
    fn ordered_set_keeps_insertion_order_and_reinserts_at_the_end() {
        let mut values = OrderedSet::default();
        values.insert("start".to_string());
        values.insert("alpha".to_string());
        values.insert("start".to_string());
        assert_eq!(
            values.iter().map(String::as_str).collect::<Vec<_>>(),
            ["start", "alpha"]
        );
        values.remove(&"start".to_string());
        values.insert("start".to_string());
        assert_eq!(
            values.iter().map(String::as_str).collect::<Vec<_>>(),
            ["alpha", "start"]
        );
    }

    #[test]
    fn variable_wire_values_match_json_serialization_for_nonfinite_and_undefined() {
        let mut state = RuntimeState::initial("start");
        state
            .variables
            .insert("infinite".into(), RuntimeValue::Number(f64::INFINITY));
        state
            .variables
            .insert("missing".into(), RuntimeValue::Undefined);
        assert_eq!(
            state.variable_wire_values().get("infinite"),
            Some(&serde_json::Value::Null)
        );
        assert!(!state.variable_wire_values().contains_key("missing"));
    }

    #[test]
    fn number_string_uses_javascript_exponent_notation() {
        assert_eq!(js_number_string(1e21), "1e+21");
        assert_eq!(js_number_string(1e-7), "1e-7");
        assert_eq!(js_number_string(-0.0), "0");
    }
}
