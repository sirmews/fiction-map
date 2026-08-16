use serde::Deserialize;

/// A graph blueprint, mirroring the JSON shape emitted by the TS
/// `GraphBlueprint` / `conformance/fixtures/*.json` `blueprint` field.
///
/// This is the wire format the TS runtime and CLI already produce, so the
/// Rust engine consumes the same single source of truth — no parallel schema.
#[derive(Debug, Clone, Deserialize)]
pub struct GraphBlueprint {
    pub nodes: Vec<NodeBlueprint>,
    pub edges: Vec<EdgeBlueprint>,
    #[serde(default)]
    pub endings: Vec<String>,
    #[serde(rename = "startNode", default)]
    pub start_node: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NodeBlueprint {
    pub id: String,
    #[serde(default)]
    #[allow(dead_code)]
    pub r#type: Option<String>,
    #[serde(rename = "autoResolve", default)]
    pub auto_resolve: Option<bool>,
    #[serde(rename = "enterEffects", default)]
    pub enter_effects: Option<Vec<Effect>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EdgeBlueprint {
    pub id: String,
    pub source: String,
    #[serde(default)]
    pub target: Option<String>,
    #[serde(default)]
    pub conditions: Option<Vec<Condition>>,
    #[serde(default)]
    #[allow(dead_code)]
    pub visibility: Option<Vec<Condition>>,
    #[serde(default)]
    pub effects: Option<Vec<Effect>>,
    #[serde(rename = "failureEffects", default)]
    #[allow(dead_code)]
    pub failure_effects: Option<Vec<Effect>>,
    #[serde(rename = "failureTarget", default)]
    #[allow(dead_code)]
    pub failure_target: Option<String>,
}

/// A condition. `type` is the discriminator; the rest is open-ended key/value
/// pairs resolved by the evaluator registry.
#[derive(Debug, Clone, Deserialize)]
pub struct Condition {
    pub r#type: String,
    #[serde(flatten)]
    pub params: serde_json::Map<String, serde_json::Value>,
}

/// An effect. Same shape as `Condition` — `type` + open params.
#[derive(Debug, Clone, Deserialize)]
pub struct Effect {
    pub r#type: String,
    #[serde(flatten)]
    pub params: serde_json::Map<String, serde_json::Value>,
}

impl GraphBlueprint {
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}
