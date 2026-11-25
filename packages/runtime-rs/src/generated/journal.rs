// Generated from journal.schema.json. DO NOT EDIT.

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SerializableEntityState {
    pub owned: Vec<String>,
    pub active: Vec<String>,
    pub unlocked: Vec<String>,
    pub resources: std::collections::BTreeMap<String, f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<serde_json::Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SerializableState {
    pub schema_version: u32,
    pub current_node_id: String,
    pub history: Vec<String>,
    pub variables: serde_json::Map<String, serde_json::Value>,
    pub flags: std::collections::BTreeMap<String, serde_json::Value>,
    pub visited: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity_state: Option<SerializableEntityState>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<serde_json::Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JournalSessionInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub graph_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub graph_version: Option<String>,
    pub created_at: String,
    pub initial_state: SerializableState,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JournalRequest {
    pub plugin_type: String,
    pub kind: String,
    pub args: serde_json::Value,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CapabilityDeclaration {
    pub plugin_types: Vec<String>,
    pub version: String,
    pub reexecutable: bool,
    pub side_effect_free: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<serde_json::Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JournalEntry {
    pub seq: u32,
    pub step_index: u32,
    pub state_fingerprint: String,
    pub capability: String,
    pub request_hash: String,
    pub request: JournalRequest,
    pub response: serde_json::Value,
    pub duration_ms: f64,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JournalChoice {
    pub seq: u32,
    pub step_index: u32,
    pub transition_id: String,
    pub state_fingerprint: String,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JournalCheckpoint {
    pub step_index: u32,
    pub state: SerializableState,
    pub entry_seq: u32,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JournalForkPoint {
    pub parent_hash: String,
    pub at_seq: u32,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JournalDocument {
    pub format: String,
    pub format_version: u32,
    pub session: JournalSessionInfo,
    pub capabilities: std::collections::BTreeMap<String, CapabilityDeclaration>,
    pub entries: Vec<JournalEntry>,
    pub choices: Vec<JournalChoice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkpoints: Option<Vec<JournalCheckpoint>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fork_point: Option<JournalForkPoint>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blobs: Option<serde_json::Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SessionSave {
    pub schema_version: u32,
    pub state: SerializableState,
    pub journal: JournalDocument,
    pub capabilities: std::collections::BTreeMap<String, CapabilityDeclaration>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct JournalFixture {
    pub name: String,
    pub blueprint: serde_json::Value,
    pub replay_path: Vec<String>,
    pub save: SessionSave,
    pub expected_state: SerializableState,
}
