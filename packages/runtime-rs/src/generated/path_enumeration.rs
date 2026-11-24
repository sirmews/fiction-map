// Generated from path-enumeration.schema.json. DO NOT EDIT.

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Condition {
    pub r#type: String,
    #[serde(flatten)]
    pub params: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Effect {
    pub r#type: String,
    #[serde(flatten)]
    pub params: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentBlock {
    pub id: String,
    pub r#type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Map<String, serde_json::Value>>,
    #[serde(flatten)]
    pub params: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeBlueprint {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blocks: Option<Vec<ContentBlock>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_resolve: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enter_effects: Option<Vec<Effect>>,
    #[serde(flatten)]
    pub params: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EdgeBlueprint {
    pub id: String,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anchor_block_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conditions: Option<Vec<Condition>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub visibility: Option<Vec<Condition>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effects: Option<Vec<Effect>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_effects: Option<Vec<Effect>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GraphBlueprint {
    pub nodes: Vec<NodeBlueprint>,
    pub edges: Vec<EdgeBlueprint>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endings: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_node: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StateTrigger {
    pub id: String,
    pub conditions: Vec<Condition>,
    pub effects: Vec<Effect>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DerivedState {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owned_entity_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_entity_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_entity_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EnumerationContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub derived_state: Option<DerivedState>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EnumerationRequest {
    pub blueprint: GraphBlueprint,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub triggers: Option<Vec<StateTrigger>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<EnumerationContext>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_depth: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_paths: Option<f64>,
}

pub type ExtensionObject = std::collections::BTreeMap<String, Box<serde_json::value::RawValue>>;

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SerializedEntityState {
    pub owned: Vec<String>,
    pub active: Vec<String>,
    pub unlocked: Vec<String>,
    pub resources: serde_json::Map<String, serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<ExtensionObject>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SerializedState {
    pub schema_version: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_node_id: Option<String>,
    pub history: Vec<String>,
    pub variables: serde_json::Map<String, serde_json::Value>,
    pub flags: serde_json::Map<String, serde_json::Value>,
    pub visited: Vec<Option<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity_state: Option<SerializedEntityState>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<ExtensionObject>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PathStep {
    pub transition_id: String,
    pub from_node_id: String,
    pub to_node_id: String,
    pub success: bool,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TraversalPath {
    pub steps: Vec<PathStep>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub final_node_id: Option<String>,
    pub ended_at: String,
    pub state: SerializedState,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EnumerationError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EnumerationResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paths: Option<Vec<TraversalPath>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<EnumerationError>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Fixture {
    pub name: String,
    pub request: EnumerationRequest,
    pub expected: EnumerationResponse,
}
