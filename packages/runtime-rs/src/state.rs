use std::collections::{BTreeMap, BTreeSet};

/// Runtime state — the Rust analogue of the TS `GraphRuntimeState`.
///
/// Uses `BTreeMap`/`BTreeSet` so `Hash` is deterministic without a string
/// canonicalization step. The TS fingerprint sorts keys and joins into a
/// string every call; here the hasher walks the structured state directly,
/// producing a `u64` with zero allocations per fingerprint.
#[derive(Debug, Clone, PartialEq)]
pub struct RuntimeState {
    pub current_node: String,
    pub history: Vec<String>,
    pub variables: BTreeMap<String, serde_json::Value>,
    pub flags: BTreeMap<String, serde_json::Value>,
    pub visited: BTreeSet<String>,
    pub entity_state: Option<EntityRuntimeState>,
    #[allow(dead_code)]
    pub extensions: Option<BTreeMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EntityRuntimeState {
    pub owned: BTreeSet<String>,
    pub active: BTreeSet<String>,
    pub unlocked: BTreeSet<String>,
    pub resources: BTreeMap<String, f64>,
    #[allow(dead_code)]
    pub extensions: Option<BTreeMap<String, serde_json::Value>>,
}

impl RuntimeState {
    pub fn initial(start_node: &str) -> Self {
        let mut visited = BTreeSet::new();
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
}
